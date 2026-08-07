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

async function searchTMDBList(query, year = null) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === "your_tmdb_api_key_here") {
    console.log("[metadata] TMDB API key not configured in .env");
    return [];
  }

  try {
    let url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
    if (year) url += `&year=${year}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    return [];
  }
}

async function searchTMDB(query, year = null) {
  const results = await searchTMDBList(query, year);
  return results.length > 0 ? results[0] : null;
}

/**
 * Gets metadata for a file. Uses cache if available, otherwise queries TMDB.
 */
async function getMetadata(filename) {
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
  const tmdbData = await searchTMDB(query, year);
  
  metadataCache[filename] = tmdbData;
  saveCache();
  
  return tmdbData;
}

/**
 * Manually override a metadata match
 */
async function setMetadataOverride(filename, tmdbId, type = "movie") {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB API key not configured");

  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB lookup failed: ${res.status}`);
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

  metadataCache[filename] = tmdbData;
  saveCache();
  return tmdbData;
}

module.exports = {
  getMetadata,
  searchTMDB,
  searchTMDBList,
  setMetadataOverride,
  cleanFilename
};
