import { readFile, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const DATA_PATH = new URL("../data/news.json", import.meta.url);
const parser = new XMLParser({ ignoreAttributes: false });

const fallbackImages = {
  ai: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
  biotech: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1200&q=80",
  robotics: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
  frontier: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
};

const feeds = [
  {
    category: "ai",
    query: '"artificial intelligence" OR "generative AI" OR "AI model"',
  },
  {
    category: "biotech",
    query: 'biotechnology OR "gene therapy" OR "drug discovery" OR CRISPR',
  },
  {
    category: "robotics",
    query: 'robotics OR humanoid robot OR "autonomous robot"',
  },
  {
    category: "frontier",
    query: '"frontier technology" OR quantum OR "space technology" OR semiconductor',
  },
];

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function formatPublished(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.valueOf())) return "Fresh";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function cleanTitle(title = "") {
  return title
    .replace(/\s+-\s+[^-]+$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function cleanSnippet(text = "") {
  return text
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ")
    .trim();
}

function articleKey(item) {
  return cleanTitle(item.title).toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
}

function feedUrl(query) {
  const params = new URLSearchParams({
    q: `${query} when:1d`,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

async function fetchFeed(feed) {
  const response = await fetch(feedUrl(feed.query), {
    headers: {
      "user-agent": "DailyFrontierBrief/1.0",
    },
  });
  if (!response.ok) throw new Error(`Feed failed for ${feed.category}: ${response.status}`);
  const xml = await response.text();
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item ?? [];
  return (Array.isArray(rawItems) ? rawItems : [rawItems]).map((item) => ({
    title: cleanTitle(item.title),
    summary: cleanSnippet(item.description || item.title),
    category: feed.category,
    source: item.source?.["#text"] || "Google News",
    url: item.link,
    image: fallbackImages[feed.category],
    publishedAt: formatPublished(item.pubDate),
    timestamp: item.pubDate ? new Date(item.pubDate).valueOf() : Date.now(),
  }));
}

function selectStories(items) {
  const sorted = items
    .filter((item) => item.title && item.url)
    .sort((a, b) => b.timestamp - a.timestamp);
  const picked = [];
  const seen = new Set();

  for (const category of ["ai", "biotech", "robotics"]) {
    const item = sorted.find((candidate) => candidate.category === category && !seen.has(articleKey(candidate)));
    if (item) {
      seen.add(articleKey(item));
      picked.push(item);
    }
  }

  for (const item of sorted) {
    const key = articleKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      picked.push(item);
    }
    if (picked.length === 5) break;
  }

  return picked.map(({ timestamp, ...story }) => ({
    ...story,
    summary: story.summary || `Fresh ${story.category} story from ${story.source}.`,
  }));
}

async function main() {
  const existing = JSON.parse(await readFile(DATA_PATH, "utf8"));
  const fetched = (await Promise.all(feeds.map(fetchFeed))).flat();
  const stories = selectStories(fetched);

  if (stories.length < 5) {
    throw new Error(`Expected 5 stories, got ${stories.length}`);
  }

  const date = process.env.BRIEF_DATE || todayUtc();
  const days = existing.days.filter((day) => day.date !== date);
  days.unshift({ date, stories });

  const next = {
    lastUpdated: new Date().toISOString(),
    days: days.sort((a, b) => b.date.localeCompare(a.date)),
  };

  await writeFile(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Updated ${date} with ${stories.length} stories.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
