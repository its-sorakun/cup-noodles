const fs = require("node:fs");
const path = require("path");
const paths = require("./paths");

// Read cache
let metadataCache = {};
function loadCache() {
  if (fs.existsSync(paths.metadata)) {
    try {
      const data = fs.readFileSync(paths.metadata, "utf-8");
      metadataCache = JSON.parse(data);
      // Purge poisoned null values from the cache so it forces a retry
      Object.keys(metadataCache).forEach(key => {
        if (metadataCache[key] === null) {
          delete metadataCache[key];
        }
      });
    } catch (e) {
      console.error("[metadata] Failed to read metadata cache", e.message);
      metadataCache = {};
    }
  }
}
function saveCache() {
  try {
    fs.writeFileSync(paths.metadata, JSON.stringify(metadataCache, null, 2));
  } catch (e) {
    console.error("[metadata] Failed to write metadata cache", e.message);
  }
}

loadCache();

/**
 * Cleans up release group tags, resolutions, and years from filenames
 */
function cleanFilename(filename) {
  let name = path.parse(filename).name;
  
  // Replace dots, underscores, dashes with spaces
  name = name.replace(/[._\-]/g, " ");
  
  // Remove common release tags (1080p, 720p, 4K, x264, x265, HEVC, BluRay, WEBRip, AAC)
  name = name.replace(/\b(1080p|720p|480p|2160p|4K|x264|x265|HEVC|BluRay|BRRip|WEBRip|WEB-DL|HDRip|HDTV|AAC|DTS|AC3|5\.1|7\.1|YIFY|YTS|PSA|SPARKS|Rarbg|EZTV)\b/ig, "");
  
  // Try to extract year if present to help with search precision
  const yearMatch = name.match(/\b(19\d{2}|20\d{2})\b/);
  let year = null;
  if (yearMatch) {
    year = yearMatch[1];
    // Remove everything after the year
    name = name.substring(0, yearMatch.index);
  }

  // Remove bracketed content [Subbed] (ReleaseGroup)
  name = name.replace(/\[.*?\]|\(.*?\)/g, "");

  return { 
    query: name.replace(/\s+/g, " ").trim(), 
    year 
  };
}

// ---------------------------------------------------------------------------
// Concurrency Queue & Retry Logic
// ---------------------------------------------------------------------------
class TaskQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }
  
  async add(task) {
    if (this.running >= this.concurrency) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }
}

const tmdbQueue = new TaskQueue(20);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1500 * Math.pow(2, i);
      console.warn(`[metadata] TMDB Rate limit hit (429). Retrying after ${waitTime}ms...`);
      await sleep(waitTime);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }
  throw new Error("Max retries exceeded for 429");
}

async function searchTMDBList(query, year = null) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "your_tmdb_api_key_here") {
    console.log("[metadata] TMDB API key not configured in .env");
    throw new Error("API Key not configured");
  }

  return tmdbQueue.add(async () => {
    try {
      let url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
      if (year) url += `&year=${year}`;

      const res = await fetchWithRetry(url);
      const data = await res.json();
      
      // Filter movies and tv shows
      return (data.results || [])
        .filter(r => r.media_type === "movie" || r.media_type === "tv")
        .map(result => ({
          id: result.id,
          type: result.media_type,
          title: result.title || result.name,
          originalTitle: result.original_title || result.original_name,
          overview: result.overview,
          releaseYear: result.release_date ? result.release_date.split("-")[0] : (result.first_air_date ? result.first_air_date.split("-")[0] : null),
          posterUrl: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
          backdropUrl: result.backdrop_path ? `https://image.tmdb.org/t/p/w1280${result.backdrop_path}` : null,
          rating: result.vote_average ? parseFloat(result.vote_average).toFixed(1) : null
        }));
    } catch (err) {
      console.error(`[metadata] TMDB search failed for "${query}":`, err.message);
      throw err;
    }
  });
}

async function searchTMDB(query, year = null) {
  const results = await searchTMDBList(query, year);
  return results.length > 0 ? results[0] : null;
}

/**
 * Gets metadata for a file. Uses cache if available, otherwise queries TMDB.
 */
async function getMetadata(filename) {
  const dirKey = "DIR:" + path.dirname(filename);
  if (metadataCache[dirKey] !== undefined) {
    return metadataCache[dirKey];
  }

  if (metadataCache[filename] !== undefined) {
    // If it's cached (even as null for not found), return it
    return metadataCache[filename];
  }

  const { query, year } = cleanFilename(filename);
  if (!query) {
    metadataCache[filename] = null;
    saveCache();
    return null;
  }

  console.log(`[metadata] Searching TMDB for: "${query}" (Year: ${year})`);
  try {
    const tmdbData = await searchTMDB(query, year);
    metadataCache[filename] = tmdbData; // tmdbData is null if genuinely not found
    saveCache();
    return tmdbData;
  } catch (e) {
    // Do not cache API errors so we can retry later
    return null;
  }
}

/**
 * Manually override a metadata match
 */
async function setMetadataOverride(filename, tmdbId, type = "movie", applyToFolder = false) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB API key not configured");

  return tmdbQueue.add(async () => {
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}`;
    const res = await fetchWithRetry(url);
    const result = await res.json();

    const tmdbData = {
      id: result.id,
      type: type,
      title: result.title || result.name,
      originalTitle: result.original_title || result.original_name,
      overview: result.overview,
      releaseYear: result.release_date ? result.release_date.split("-")[0] : (result.first_air_date ? result.first_air_date.split("-")[0] : null),
      posterUrl: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
      backdropUrl: result.backdrop_path ? `https://image.tmdb.org/t/p/w1280${result.backdrop_path}` : null,
      rating: result.vote_average ? parseFloat(result.vote_average).toFixed(1) : null
    };

    if (applyToFolder) {
      const dirPath = path.dirname(filename);
      metadataCache["DIR:" + dirPath] = tmdbData;
      // Purge individual file caches in this directory so they inherit the folder metadata
      Object.keys(metadataCache).forEach(key => {
        if (!key.startsWith("DIR:") && path.dirname(key) === dirPath) {
          delete metadataCache[key];
        }
      });
    } else {
      metadataCache[filename] = tmdbData;
    }
    saveCache();
    return tmdbData;
  });
}

module.exports = {
  getMetadata,
  searchTMDB,
  searchTMDBList,
  setMetadataOverride,
  cleanFilename
};
