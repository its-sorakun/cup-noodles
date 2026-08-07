const express = require("express");
const path = require("path");
const fsPromises = require("node:fs/promises");
const fs = require("node:fs");
const mime = require("mime-types");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { scanAll, scanByName, loadConfig } = require("../mediascanner");
const paths = require("../services/paths");

const router = express.Router();

// ---------------------------------------------------------------------------
// Thumbnail Caching & Concurrency Queue
// ---------------------------------------------------------------------------
const THUMB_CACHE_DIR = paths.thumbnails;

// In-Memory Hash Map for O(1) cache lookups
const thumbnailMap = new Map();
try {
  const existingFiles = fs.readdirSync(THUMB_CACHE_DIR);
  for (const f of existingFiles) {
    thumbnailMap.set(f, true);
  }
} catch (e) {
  console.warn("Could not read thumbnail cache directory", e);
}

// FIFO Job Queue for ffmpeg processing
const MAX_CONCURRENT_FFMPEG = 4;
let activeFfmpegJobs = 0;
const thumbnailQueue = [];

function processThumbnailQueue() {
  if (activeFfmpegJobs >= MAX_CONCURRENT_FFMPEG || thumbnailQueue.length === 0) return;
  const job = thumbnailQueue.shift();
  activeFfmpegJobs++;
  job().finally(() => {
    activeFfmpegJobs--;
    processThumbnailQueue();
  });
}

// Health check
router.get("/ping", (req, res) => {
  res.json({ message: "pong", timestamp: Date.now() });
});

// Get current config (libraries list without scanning files)
router.get("/config", async (req, res) => {
  try {
    const config = await loadConfig();
    const libraries = config.libraries.map((lib) => ({
      name: lib.name,
      type: lib.type,
      icon: lib.icon,
      description: lib.description || "",
      path: lib.path,
      configured: !!(lib.path && lib.path.trim()),
    }));
    res.json({ libraries, server: config.server });
  } catch (err) {
    res.status(500).json({ error: "Failed to load config", details: err.message });
  }
});

// List all libraries with file counts (scans all)
router.get("/libraries", async (req, res) => {
  try {
    const libraries = await scanAll();
    const summary = libraries.map(({ files, ...rest }) => rest);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: "Failed to scan libraries", details: err.message });
  }
});

// Get files in a specific library
router.get("/libraries/:name", async (req, res) => {
  try {
    const library = await scanByName(req.params.name);
    if (!library) {
      return res.status(404).json({ error: `Library "${req.params.name}" not found` });
    }

    if (library.type === "video") {
      const metadataService = require("../services/metadata");
      library.files = await Promise.all(library.files.map(async (file) => {
        const meta = await metadataService.getMetadata(file.name);
        if (meta) {
          file.metadata = meta;
        }
        return file;
      }));
    }

    res.json(library);
  } catch (err) {
    res.status(500).json({ error: "Failed to scan library", details: err.message });
  }
});

// Search TMDB for manual matches
router.get("/metadata/search", async (req, res) => {
  try {
    const { query, year } = req.query;
    if (!query) return res.status(400).json({ error: "Query is required" });
    const metadataService = require("../services/metadata");
    const results = await metadataService.searchTMDBList(query, year || null);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: "Search failed", details: err.message });
  }
});

// Override metadata with a specific TMDB ID
router.post("/metadata/match", async (req, res) => {
  try {
    const { filename, tmdbId, type } = req.body;
    if (!filename || !tmdbId || !type) return res.status(400).json({ error: "Missing parameters" });
    const metadataService = require("../services/metadata");
    const meta = await metadataService.setMetadataOverride(filename, tmdbId, type);
    res.json({ success: true, metadata: meta });
  } catch (err) {
    res.status(500).json({ error: "Failed to override metadata", details: err.message });
  }
});

// Add or update a library in config
router.post("/config/library", async (req, res) => {
  try {
    const { name, path: libPath, type, icon, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Library name is required" });
    }

    const configPath = paths.config;
    const config = await loadConfig();

    const existing = config.libraries.find(
      (l) => l.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      if (libPath !== undefined) existing.path = libPath;
      if (type !== undefined) existing.type = type;
      if (icon !== undefined) existing.icon = icon;
      if (description !== undefined) existing.description = description;
    } else {
      config.libraries.push({
        name,
        type: type || "video",
        path: libPath || "",
        icon: icon || "folder",
        description: description || "",
      });
    }

    await fsPromises.writeFile(configPath, JSON.stringify(config, null, 2));
    res.json({ success: true, library: existing || config.libraries[config.libraries.length - 1] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update config", details: err.message });
  }
});

// Serve media file from a library (supports range requests for video)
router.get("/stream/:libraryName/{*filePath}", async (req, res) => {
  try {
    const config = await loadConfig();
    const lib = config.libraries.find(
      (l) => l.name.toLowerCase() === req.params.libraryName.toLowerCase()
    );

    if (!lib || !lib.path) {
      return res.status(404).json({ error: "Library not found or not configured" });
    }

    const relativePath = Array.isArray(req.params.filePath)
      ? req.params.filePath.join("/")
      : req.params.filePath;
    const filePath = path.join(lib.path, relativePath);

    const resolved = path.resolve(filePath);
    const libraryRoot = path.resolve(lib.path);
    if (!resolved.startsWith(libraryRoot)) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      await fsPromises.access(resolved);
    } catch {
      return res.status(404).json({ error: "File not found" });
    }

    const stat = await fsPromises.stat(resolved);
    const fileSize = stat.size;
    const mimeType = mime.lookup(resolved) || "application/octet-stream";

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": mimeType,
      });

      const stream = fs.createReadStream(resolved, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": mimeType,
        "Accept-Ranges": "bytes",
      });

      const stream = fs.createReadStream(resolved);
      stream.pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: "Streaming error", details: err.message });
  }
});

// Thumbnail endpoint
router.get("/thumbnail/:libraryName/{*filePath}", async (req, res) => {
  try {
    const config = await loadConfig();
    const lib = config.libraries.find(
      (l) => l.name.toLowerCase() === req.params.libraryName.toLowerCase()
    );

    if (!lib || !lib.path) {
      return res.status(404).json({ error: "Library not found or not configured" });
    }

    const relativePath = Array.isArray(req.params.filePath)
      ? req.params.filePath.join("/")
      : req.params.filePath;
    const filePath = path.join(lib.path, relativePath);

    const resolved = path.resolve(filePath);
    const libraryRoot = path.resolve(lib.path);
    if (!resolved.startsWith(libraryRoot)) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      await fsPromises.access(resolved);
    } catch {
      return res.status(404).json({ error: "File not found" });
    }

    const mimeType = mime.lookup(resolved) || "";
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");

    if (!isImage && !isVideo) {
      return res.status(204).end();
    }

    const width = parseInt(req.query.w) || 400;
    const cacheKey = crypto.createHash("md5").update(resolved).digest("hex") + `_w${width}.jpg`;
    const cachePath = path.join(THUMB_CACHE_DIR, cacheKey);

    // O(1) Cache Hit
    if (thumbnailMap.has(cacheKey)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      const stream = fs.createReadStream(cachePath);
      return stream.pipe(res);
    }

    if (isImage) {
      try {
        const sharp = require("sharp");
        const thumbnail = await sharp(resolved)
          .resize(width, null, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        
        await fsPromises.writeFile(cachePath, thumbnail);
        thumbnailMap.set(cacheKey, true);

        res.writeHead(200, {
          "Content-Type": "image/jpeg",
          "Content-Length": thumbnail.length,
          "Cache-Control": "public, max-age=86400",
        });
        res.end(thumbnail);
      } catch {
        const stream = fs.createReadStream(resolved);
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        stream.pipe(res);
      }
    } else if (isVideo) {
      // Queue ffmpeg job
      const job = () => new Promise((resolveJob) => {
        const args = [
          "-y",
          "-ss", "00:00:05.000",
          "-i", resolved,
          "-vframes", "1",
          "-vf", `scale=${width}:-1`,
          "-q:v", "2",
          cachePath
        ];
        const rawFfmpegPath = require("ffmpeg-static");
        const ffmpegPath = paths.getBinPath(rawFfmpegPath);
        const ffmpeg = spawn(ffmpegPath, args);
        ffmpeg.on("close", (code) => {
          if (code === 0) {
            thumbnailMap.set(cacheKey, true);
            res.setHeader("Content-Type", "image/jpeg");
            res.setHeader("Cache-Control", "public, max-age=86400");
            const stream = fs.createReadStream(cachePath);
            stream.pipe(res);
          } else {
            res.status(204).end();
          }
          resolveJob();
        });
        ffmpeg.on("error", () => {
          res.status(204).end();
          resolveJob();
        });
      });
      thumbnailQueue.push(job);
      processThumbnailQueue();
    }
  } catch (err) {
    res.status(500).json({ error: "Thumbnail error", details: err.message });
  }
});

// Get thumbnail cache stats
router.get("/thumbnails/cache", async (req, res) => {
  try {
    const files = await fsPromises.readdir(THUMB_CACHE_DIR);
    let size = 0;
    let count = 0;
    for (const file of files) {
      if (file.endsWith(".jpg")) {
        const stat = await fsPromises.stat(path.join(THUMB_CACHE_DIR, file));
        size += stat.size;
        count++;
      }
    }
    res.json({ size, count });
  } catch (err) {
    res.status(500).json({ error: "Failed to get cache stats", details: err.message });
  }
});

// Clear thumbnail cache
router.delete("/thumbnails/cache", async (req, res) => {
  try {
    const files = await fsPromises.readdir(THUMB_CACHE_DIR);
    for (const file of files) {
      if (file.endsWith(".jpg")) {
        await fsPromises.unlink(path.join(THUMB_CACHE_DIR, file));
      }
    }
    thumbnailMap.clear();
    res.json({ success: true, cleared: files.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear cache", details: err.message });
  }
});

module.exports = router;
