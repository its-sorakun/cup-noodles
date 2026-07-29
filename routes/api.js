const express = require("express");
const path = require("path");
const fsPromises = require("node:fs/promises");
const fs = require("node:fs");
const mime = require("mime-types");
const { scanAll, scanByName, loadConfig } = require("../mediascanner");

const router = express.Router();

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
    res.json(library);
  } catch (err) {
    res.status(500).json({ error: "Failed to scan library", details: err.message });
  }
});

// Add or update a library in config
router.post("/config/library", async (req, res) => {
  try {
    const { name, path: libPath, type, icon, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Library name is required" });
    }

    const configPath = path.join(__dirname, "..", "config.json");
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

    if (mimeType.startsWith("image/")) {
      try {
        const sharp = require("sharp");
        const width = parseInt(req.query.w) || 400;
        const thumbnail = await sharp(resolved)
          .resize(width, null, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();

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
    } else {
      res.status(204).end();
    }
  } catch (err) {
    res.status(500).json({ error: "Thumbnail error", details: err.message });
  }
});

module.exports = router;
