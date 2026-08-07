const express = require("express");
const path = require("path");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const { execSync } = require("child_process");
const { loadConfig } = require("../mediascanner");
const { transcodeSessions, killSession, startTranscodeProcess } = require("../services/transcoder");
const paths = require("../services/paths");

const router = express.Router();

// POST /api/transcode/session — register a file for transcoding, returns sessionId
router.post("/session", async (req, res) => {
  try {
    const { libraryName, relativePath, quality = "720p", startTime = 0, audioTrackIndex = null } = req.body;
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

    const playlistPath = path.join(sessionDir, "playlist.m3u8");
    
    // Extract total duration
    let duration = 0;
    try {
      const rawFfprobePath = require("ffprobe-static").path;
      const ffprobePath = paths.getBinPath(rawFfprobePath);
      const durationStr = execSync(`"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf-8' });
      duration = parseFloat(durationStr.trim()) || 0;
    } catch (e) {
      console.error("[transcode] Failed to get duration:", e.message);
    }

    // Start FFmpeg via service
    const { preset } = startTranscodeProcess(sessionId, sessionDir, filePath, playlistPath, quality, startTime, audioTrackIndex);

    res.json({ sessionId, quality, preset, duration });
  } catch (err) {
    res.status(500).json({ error: "Failed to start transcoding session", details: err.message });
  }
});

// GET /api/transcode/:sessionId/playlist.m3u8 — serve HLS playlist
router.get("/:sessionId/playlist.m3u8", async (req, res) => {
  const session = transcodeSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });

  session.lastAccess = Date.now();

  const playlistPath = session.playlistPath;
  const MIN_SEGMENTS = 3;
  let playlistReady = false;
  
  for (let i = 0; i < 60; i++) {
    if (session.error) {
      return res.status(500).json({ error: "FFmpeg failed", details: session.error });
    }
    try {
      const content = await fsPromises.readFile(playlistPath, "utf-8");
      const segCount = content.split("\n").filter(l => l.trim().endsWith(".ts")).length;
      const isComplete = content.includes("#EXT-X-ENDLIST");
      if (segCount >= MIN_SEGMENTS || isComplete) {
        playlistReady = true;
        break;
      }
    } catch {
      // File doesn't exist yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!playlistReady) {
    const errMsg = session.error || "FFmpeg did not produce enough segments in time. Check that ffmpeg is installed and on your PATH.";
    return res.status(503).json({ error: "Transcoding failed", details: errMsg });
  }

  try {
    let content = await fsPromises.readFile(playlistPath, "utf-8");
    content = content
      .split("\n")
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;
        if (trimmed.endsWith(".ts")) return path.basename(trimmed);
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
router.get("/:sessionId/:segment", async (req, res) => {
  const session = transcodeSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });

  session.lastAccess = Date.now();

  const segName = req.params.segment;
  if (!segName.endsWith(".ts")) return res.status(400).json({ error: "Invalid segment" });

  const segPath = path.join(session.dir, segName);
  if (!path.resolve(segPath).startsWith(path.resolve(session.dir))) {
    return res.status(403).json({ error: "Access denied" });
  }

  let segExists = false;
  for (let i = 0; i < 40; i++) {
    try {
      await fsPromises.access(segPath);
      segExists = true;

      const segNum = parseInt(segName.replace(/[^0-9]/g, ""), 10);
      const nextSeg = `seg${String(segNum + 1).padStart(5, "0")}.ts`;
      const nextSegPath = path.join(session.dir, nextSeg);
      
      try {
        await fsPromises.access(nextSegPath);
        break;
      } catch {
        if (session.ffmpegProcess && session.ffmpegProcess.exitCode !== null) {
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!segExists) {
    return res.status(404).json({ error: "Segment not found" });
  }

  try {
    const stat = await fsPromises.stat(segPath);
    res.setHeader("Content-Type", "video/mp2t");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const fs = require("node:fs");
    fs.createReadStream(segPath).pipe(res);
  } catch {
    res.status(404).json({ error: "Segment not found" });
  }
});

// DELETE /api/transcode/:sessionId — stop transcoding and clean up
router.delete("/:sessionId", (req, res) => {
  killSession(req.params.sessionId);
  res.json({ ok: true });
});

module.exports = router;
