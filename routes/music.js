const express = require("express");
const router = express.Router();
const path = require("path");
const fsPromises = require("node:fs/promises");
const { spawn } = require("node:child_process");
const paths = require("../services/paths");
const { loadConfig } = require("../mediascanner");
const https = require("https");

// Helper to resolve filePath
async function resolveLibraryFile(req) {
  const config = await loadConfig();
  const lib = config.libraries.find(
    (l) => l.name.toLowerCase() === req.params.libraryName.toLowerCase()
  );
  if (!lib || !lib.path) throw new Error("Library not found");

  const relativePath = Array.isArray(req.params.filePath)
    ? req.params.filePath.join("/")
    : req.params.filePath;
  const filePath = path.join(lib.path, relativePath);

  const resolved = path.resolve(filePath);
  const libraryRoot = path.resolve(lib.path);
  if (!resolved.startsWith(libraryRoot)) throw new Error("Access denied");
  
  await fsPromises.access(resolved);
  return resolved;
}

router.get("/metadata/:libraryName/{*filePath}", async (req, res) => {
  try {
    const resolved = await resolveLibraryFile(req);
    const rawFfprobePath = require("ffprobe-static").path;
    const ffprobePath = paths.getBinPath(rawFfprobePath);

    const args = [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      resolved
    ];

    const ffprobe = spawn(ffprobePath, args);
    let output = "";
    
    ffprobe.stdout.on("data", (data) => output += data.toString());

    ffprobe.on("close", (code) => {
      if (code !== 0) return res.status(500).json({ error: "Probe failed" });
      try {
        const parsed = JSON.parse(output);
        const format = parsed.format || {};
        const tags = format.tags || {};
        
        let audioStream = parsed.streams?.find(s => s.codec_type === 'audio') || {};
        
        res.json({
          title: tags.title || tags.TITLE || path.basename(resolved, path.extname(resolved)),
          artist: tags.artist || tags.ARTIST || "Unknown Artist",
          album: tags.album || tags.ALBUM || "Unknown Album",
          year: tags.date || tags.DATE || tags.year || tags.YEAR || "",
          genre: tags.genre || tags.GENRE || "",
          track: tags.track || tags.TRACK || "",
          codec: audioStream.codec_name || "unknown",
          bitrate: format.bit_rate || audioStream.bit_rate || 0,
          sampleRate: audioStream.sample_rate || 0,
          channels: audioStream.channels || 2,
          bitDepth: audioStream.bits_per_raw_sample || audioStream.bits_per_sample || 16
        });
      } catch (e) {
        res.status(500).json({ error: "Parse error" });
      }
    });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.get("/cover/:libraryName/{*filePath}", async (req, res) => {
  try {
    const resolved = await resolveLibraryFile(req);
    const rawFfmpegPath = require("ffmpeg-static");
    const ffmpegPath = paths.getBinPath(rawFfmpegPath);

    const args = [
      "-i", resolved,
      "-an",
      "-c:v", "copy",
      "-f", "image2pipe",
      "-vframes", "1",
      "pipe:1"
    ];

    const ffmpeg = spawn(ffmpegPath, args);
    let sentHeader = false;

    ffmpeg.stdout.once("data", () => {
      if (!sentHeader) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
        sentHeader = true;
      }
    });

    ffmpeg.stdout.pipe(res);

    ffmpeg.on("close", (code) => {
      if (code !== 0 && !sentHeader) {
        if (!res.headersSent) res.status(404).end();
      }
    });

  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.get("/lyrics", (req, res) => {
  const artist = req.query.artist;
  const title = req.query.title;
  if (!artist || !title) return res.status(400).json({ error: "Missing artist/title" });

  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  
  https.get(url, { headers: { 'User-Agent': 'CupNoodlesMediaServer/1.0' } }, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      if (apiRes.statusCode === 200) {
        try {
          const parsed = JSON.parse(data);
          res.json({ lyrics: parsed.lyrics });
        } catch {
          res.status(500).json({ error: "Parse error" });
        }
      } else {
        res.status(apiRes.statusCode).json({ error: "Not found" });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

module.exports = router;
