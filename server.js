const express = require("express");
const path = require("path");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const { spawn } = require("node:child_process");
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
// Transcode session registry
// ---------------------------------------------------------------------------
// Maps sessionId -> { filePath, dir, ffmpegProcess, lastAccess, quality }
const transcodeSessions = new Map();

// Cleanup stale sessions every 5 minutes (if no client activity for 10 min)
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of transcodeSessions.entries()) {
    if (now - session.lastAccess > 10 * 60 * 1000) {
      killSession(id);
    }
  }
}, 5 * 60 * 1000);

function killSession(id) {
  const session = transcodeSessions.get(id);
  if (!session) return;
  if (session.ffmpegProcess) {
    try { session.ffmpegProcess.kill("SIGKILL"); } catch {}
  }
  // Remove temp files
  fs.rm(session.dir, { recursive: true, force: true }, () => {});
  transcodeSessions.delete(id);
  console.log(`[transcode] Session ${id} cleaned up`);
}

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
// Transcoding API (HLS via FFmpeg — server-side decoding for mobile)
// ---------------------------------------------------------------------------

const QUALITY_PRESETS = {
  "1080p": { resolution: "1920x1080", videoBitrate: "4000k", audioBitrate: "192k" },
  "720p":  { resolution: "1280x720",  videoBitrate: "2500k", audioBitrate: "128k" },
  "480p":  { resolution: "854x480",   videoBitrate: "1000k", audioBitrate: "128k" },
  "360p":  { resolution: "640x360",   videoBitrate: "500k",  audioBitrate: "96k"  },
};

// POST /api/transcode/session — register a file for transcoding, returns sessionId
app.post("/api/transcode/session", async (req, res) => {
  try {
    const { libraryName, relativePath, quality = "720p" } = req.body;
    if (!libraryName || !relativePath) {
      return res.status(400).json({ error: "libraryName and relativePath are required" });
    }

    const config = await loadConfig();
    const lib = config.libraries.find(
      (l) => l.name.toLowerCase() === libraryName.toLowerCase()
    );
    if (!lib || !lib.path) {
      return res.status(404).json({ error: "Library not found" });
    }

    const filePath = path.resolve(path.join(lib.path, relativePath));
    const libraryRoot = path.resolve(lib.path);
    if (!filePath.startsWith(libraryRoot)) {
      return res.status(403).json({ error: "Access denied" });
    }

    try { await fsPromises.access(filePath); }
    catch { return res.status(404).json({ error: "File not found" }); }

    // Create unique session
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sessionDir = path.join(os.tmpdir(), `cup-noodles-${sessionId}`);
    await fsPromises.mkdir(sessionDir, { recursive: true });

    const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS["720p"];
    const playlistPath = path.join(sessionDir, "playlist.m3u8");
    // Spawn FFmpeg: decode on PC, encode to H.264/AAC HLS chunks
    // NOTE: segment filename uses basename only — the playlist path-rewrite below makes them URL-relative
    const targetW = parseInt(preset.resolution.split("x")[0]);
    const targetH = parseInt(preset.resolution.split("x")[1]);
    const ffmpegArgs = [
      "-y",
      "-i", filePath,
      "-c:v", "libx264",          // H.264 — universally supported on phones
      "-preset", "veryfast",       // fast encoding, lower PC load
      "-tune", "zerolatency",
      // Scale down to fit within target dimensions, keep aspect ratio,
      // ensure dimensions are divisible by 2 (required by H.264).
      // No single quotes — Windows compatible.
      "-vf", `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2`,
      "-b:v", preset.videoBitrate,
      "-maxrate", preset.videoBitrate,
      "-bufsize", `${parseInt(preset.videoBitrate) * 2}k`,
      "-c:a", "aac",               // AAC audio — native on all phones
      "-b:a", preset.audioBitrate,
      "-ac", "2",                  // stereo
      "-f", "hls",
      "-hls_time", "4",            // 4-second chunks
      "-hls_list_size", "0",       // keep all segments in playlist
      "-hls_flags", "append_list", // do NOT delete segments — client needs them!
      "-hls_segment_type", "mpegts",
      "-hls_segment_filename", path.join(sessionDir, "seg%05d.ts"),
      playlistPath,
    ];

    console.log(`[transcode] Starting session ${sessionId} — quality: ${quality}`);
    console.log(`[transcode] FFmpeg args: ffmpeg ${ffmpegArgs.join(" ")}`);
    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    // Collect stderr for error diagnosis
    let stderrBuf = "";
    ffmpegProcess.stderr.on("data", (data) => {
      const text = data.toString();
      stderrBuf += text;
      process.stdout.write(`[ffmpeg ${sessionId}] ${text}`);
    });

    ffmpegProcess.on("error", (err) => {
      // spawn itself failed (e.g. ffmpeg not on PATH)
      console.error(`[transcode] Failed to spawn FFmpeg: ${err.message}`);
      const session = transcodeSessions.get(sessionId);
      if (session) session.error = `FFmpeg not found: ${err.message}`;
    });

    ffmpegProcess.on("exit", (code) => {
      console.log(`[transcode] Session ${sessionId} FFmpeg exited with code ${code}`);
      const session = transcodeSessions.get(sessionId);
      if (session && code !== 0) {
        // Extract last meaningful error lines from stderr
        const lastLines = stderrBuf.trim().split("\n").slice(-5).join("\n");
        session.error = `FFmpeg exited with code ${code}: ${lastLines}`;
      }
    });

    transcodeSessions.set(sessionId, {
      filePath,
      dir: sessionDir,
      ffmpegProcess,
      lastAccess: Date.now(),
      quality,
      playlistPath,
    });

    res.json({ sessionId, quality, preset });
  } catch (err) {
    res.status(500).json({ error: "Failed to start transcoding session", details: err.message });
  }
});

// GET /api/transcode/:sessionId/playlist.m3u8 — serve HLS playlist
app.get("/api/transcode/:sessionId/playlist.m3u8", async (req, res) => {
  const session = transcodeSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });

  session.lastAccess = Date.now();

  // Wait up to 15s for the playlist to appear (FFmpeg needs a moment to start)
  const playlistPath = session.playlistPath;
  let playlistReady = false;
  for (let i = 0; i < 30; i++) {
    // If FFmpeg crashed, bail immediately
    if (session.error) {
      return res.status(500).json({ error: "FFmpeg failed", details: session.error });
    }
    try {
      await fsPromises.access(playlistPath);
      playlistReady = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Final check after wait loop
  if (!playlistReady) {
    const errMsg = session.error || "FFmpeg did not produce a playlist in time. Check that ffmpeg is installed and on your PATH.";
    return res.status(503).json({ error: "Transcoding failed", details: errMsg });
  }

  try {
    let content = await fsPromises.readFile(playlistPath, "utf-8");

    // FFmpeg writes absolute paths for segment filenames on Windows.
    // Rewrite every .ts line to just the basename so hls.js builds
    // the correct URL: /api/transcode/{sessionId}/seg00000.ts
    content = content
      .split("\n")
      .map(line => {
        const trimmed = line.trim();
        // Skip M3U8 directives (#...) and empty lines
        if (!trimmed || trimmed.startsWith("#")) return line;
        // If this line looks like a path to a .ts file, strip to basename
        if (trimmed.endsWith(".ts")) {
          return path.basename(trimmed);
        }
        return line;
      })
      .join("\n");

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(content);
  } catch {
    res.status(503).json({ error: "Playlist not ready yet — try again in a moment" });
  }
});

// GET /api/transcode/:sessionId/:segment — serve individual .ts segments
app.get("/api/transcode/:sessionId/:segment", async (req, res) => {
  const session = transcodeSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });

  session.lastAccess = Date.now();

  const segName = req.params.segment;
  // Only allow .ts files
  if (!segName.endsWith(".ts")) return res.status(400).json({ error: "Invalid segment" });

  const segPath = path.join(session.dir, segName);
  // Prevent path traversal
  if (!path.resolve(segPath).startsWith(path.resolve(session.dir))) {
    return res.status(403).json({ error: "Access denied" });
  }

  // Wait up to 10s for the segment to be written
  for (let i = 0; i < 20; i++) {
    try {
      await fsPromises.access(segPath);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  try {
    res.setHeader("Content-Type", "video/mp2t");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
    fs.createReadStream(segPath).pipe(res);
  } catch {
    res.status(404).json({ error: "Segment not found" });
  }
});

// DELETE /api/transcode/:sessionId — stop transcoding and clean up
app.delete("/api/transcode/:sessionId", (req, res) => {
  killSession(req.params.sessionId);
  res.json({ ok: true });
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