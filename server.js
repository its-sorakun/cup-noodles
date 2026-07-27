const express = require("express");
const path = require("path");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const mime = require("mime-types");
const { scanAll, scanByName, loadConfig } = require("./mediascanner");

// ---------------------------------------------------------------------------
// Load config (sync at startup for PORT/HOST)
// ---------------------------------------------------------------------------
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"));

const PORT = CONFIG?.server?.port || 1337;
const HOST = CONFIG?.server?.host || "0.0.0.0";
const app = express();

app.use(express.json());

// Serve every file inside the "public" directory automatically.
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

// Health check
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong", timestamp: Date.now() });
});

// Get current config (libraries list without scanning files)
app.get("/api/config", async (req, res) => {
  try {
    const config = await loadConfig();
    // Return libraries without file data
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
app.get("/api/libraries", async (req, res) => {
  try {
    const libraries = await scanAll();
    // Return summary (without full file lists for performance)
    const summary = libraries.map(({ files, ...rest }) => rest);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: "Failed to scan libraries", details: err.message });
  }
});

// Get files in a specific library
app.get("/api/libraries/:name", async (req, res) => {
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
app.post("/api/config/library", async (req, res) => {
  try {
    const { name, path: libPath, type, icon, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Library name is required" });
    }

    const configPath = path.join(__dirname, "config.json");
    const config = await loadConfig();

    const existing = config.libraries.find(
      (l) => l.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      // Update existing
      if (libPath !== undefined) existing.path = libPath;
      if (type !== undefined) existing.type = type;
      if (icon !== undefined) existing.icon = icon;
      if (description !== undefined) existing.description = description;
    } else {
      // Add new library
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

// ---------------------------------------------------------------------------
// Stream / Serve media files
// ---------------------------------------------------------------------------

// Serve media file from a library (supports range requests for video)
app.get("/api/stream/:libraryName/{*filePath}", async (req, res) => {
  try {
    const config = await loadConfig();
    const lib = config.libraries.find(
      (l) => l.name.toLowerCase() === req.params.libraryName.toLowerCase()
    );

    if (!lib || !lib.path) {
      return res.status(404).json({ error: "Library not found or not configured" });
    }

    // The wildcard param captures the rest of the path (Express v5 returns array)
    const relativePath = Array.isArray(req.params.filePath)
      ? req.params.filePath.join("/")
      : req.params.filePath;
    const filePath = path.join(lib.path, relativePath);

    // Security: ensure the resolved path is within the library directory
    const resolved = path.resolve(filePath);
    const libraryRoot = path.resolve(lib.path);
    if (!resolved.startsWith(libraryRoot)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check file exists
    try {
      await fsPromises.access(resolved);
    } catch {
      return res.status(404).json({ error: "File not found" });
    }

    const stat = await fsPromises.stat(resolved);
    const fileSize = stat.size;
    const mimeType = mime.lookup(resolved) || "application/octet-stream";

    // Range request support (for video streaming)
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

// ---------------------------------------------------------------------------
// Thumbnail endpoint (serves image files resized, or a placeholder for video)
// ---------------------------------------------------------------------------
app.get("/api/thumbnail/:libraryName/{*filePath}", async (req, res) => {
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

    // Security check
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

    // For images, try to serve via sharp if available, otherwise serve raw
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
        // sharp not available or failed — serve raw file
        const stream = fs.createReadStream(resolved);
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        stream.pipe(res);
      }
    } else {
      // For video/audio, return a generic placeholder response
      res.status(204).end();
    }
  } catch (err) {
    res.status(500).json({ error: "Thumbnail error", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// SPA Fallback — serve index.html for client-side routing
// ---------------------------------------------------------------------------
app.get("{*path}", (req, res) => {
  // Don't intercept API routes or static files that legitimately 404
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, HOST, () => {
  console.log(`\n  ╭─────────────────────────────────────────╮`);
  console.log(`  │                                         │`);
  console.log(`  │   🍜  Cup Noodles Media Server          │`);
  console.log(`  │                                         │`);
  console.log(`  │   Local:  http://localhost:${PORT}        │`);
  console.log(`  │                                         │`);
  console.log(`  ╰─────────────────────────────────────────╯\n`);
});