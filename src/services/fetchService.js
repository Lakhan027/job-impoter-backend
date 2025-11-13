// server/src/services/fetchService.js
import axios from "axios";
import xml2js from "xml2js";
import { Queue } from "bullmq";
import { redis } from "../config/redisClient.js";
import ImportLog from "../models/ImportLog.js";

// BullMQ queue
const jobQueue = new Queue("jobQueue", { connection: redis });

/**
 * Normalize feed job items to a clean Mongo-ready structure
 */
function normalizeJobItem(item) {
  // Handle XML "guid" object structure
  let guid = "";
  if (item.guid) {
    if (typeof item.guid === "object" && item.guid._) {
      guid = item.guid._;
    } else if (typeof item.guid === "string") {
      guid = item.guid;
    } else {
      guid = JSON.stringify(item.guid);
    }
  }

  return {
    guid: guid || item.link || item.title,
    title: item.title || "",
    link: item.link || "",
    description: item.description || "",
    company: item["dc:creator"] || item.company || "",
    category: item.category || "",
    pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
    raw: item,
  };
}

/**
 * Fetch a feed URL, parse XML, and enqueue jobs to BullMQ
 */
export async function fetchAndEnqueueFeed(feedUrl) {
  try {
    console.log(`🌐 Fetching jobs from: ${feedUrl}`);
    const response = await axios.get(feedUrl, { timeout: 20000 });

    // Parse XML → JSON
    const result = await xml2js.parseStringPromise(response.data, {
  explicitArray: false,
  mergeAttrs: true,
  strict: false, // ✅ Ignore broken XML attributes
  normalizeTags: true, // optional - lowercases tag names
  trim: true,          // optional - removes whitespace
});


    // Get items (RSS or Atom)
    const items =
      result?.rss?.channel?.item ||
      result?.feed?.entry ||
      result?.jobs?.job ||
      [];

    if (!items.length) {
      console.warn("⚠️ No job items found in feed:", feedUrl);
      return { total: 0, newJobs: 0, updatedJobs: 0 };
    }

    const jobs = Array.isArray(items) ? items : [items];
    const importLog = { totalFetched: jobs.length, newJobs: 0, updatedJobs: 0, failedJobs: [] };

    for (const job of jobs) {
      const normalized = normalizeJobItem(job);

      try {
        // Enqueue job for the worker to process
        await jobQueue.add("importJob", normalized);
      } catch (err) {
        importLog.failedJobs.push({ guid: normalized.guid, reason: err.message });
      }
    }

    // Save import log
    await ImportLog.create(importLog);

    console.log(`✅ Enqueued ${jobs.length} jobs from feed`);
    return importLog;
  } catch (err) {
    console.error(`❌ Failed to fetch feed: ${feedUrl}`, err.message);
    throw err;
  }
}

/**
 * Enqueue all feeds listed in .env (comma-separated)
 */
export async function enqueueFeeds() {
  const feeds = (process.env.JOB_FEEDS || "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  if (!feeds.length) {
    console.warn("⚠️ No JOB_FEEDS defined in .env");
    return;
  }

  const results = [];
  for (const feed of feeds) {
    const r = await fetchAndEnqueueFeed(feed);
    results.push(r);
  }
  return results;
}
