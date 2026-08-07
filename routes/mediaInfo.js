const express = require("express");
const router = express.Router();
const path = require("path");
const fsPromises = require("node:fs/promises");
const { spawn } = require("node:child_process");
const paths = require("../services/paths");
const { loadConfig } = require("../mediascanner");

// Helper to run ffprobe and get JSON
function probeFile(filePath) {
  return new Promise((resolve, reject) => {
    const rawFfprobePath = require("ffprobe-static").path;
    const ffprobePath = paths.getBinPath(rawFfprobePath);

    const args = [
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      filePath
    ];

    const ffprobe = spawn(ffprobePath, args);
    let output = "";
    
    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe exited with code ${code}`));
      }
      try {
        const parsed = JSON.parse(output);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });

    ffprobe.on("error", (err) => reject(err));
  });
}

router.get("/:libraryName/{*filePath}", async (req, res) => {
  try {
    const config = await loadConfig();
    const lib = config.libraries.find(
      (l) => l.name.toLowerCase() === req.params.libraryName.toLowerCase()
    );

    if (!lib || !lib.path) {
      return res.status(404).json({ error: "Library not found" });
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

    const metadata = await probeFile(resolved);
    const audio = [];
    const subtitles = [];

    if (metadata && metadata.streams) {
      metadata.streams.forEach((s) => {
        if (s.codec_type === "audio") {
          audio.push({
            index: s.index,
            language: s.tags?.language || s.tags?.LANGUAGE || "und",
            title: s.tags?.title || s.tags?.TITLE || `Audio Track ${audio.length + 1}`,
            codec: s.codec_name
          });
        } else if (s.codec_type === "subtitle") {
          subtitles.push({
            index: s.index,
            language: s.tags?.language || s.tags?.LANGUAGE || "und",
            title: s.tags?.title || s.tags?.TITLE || `Subtitle Track ${subtitles.length + 1}`,
            codec: s.codec_name
          });
        }
      });
    }

    res.json({ audio, subtitles });
  } catch (err) {
    res.status(500).json({ error: "Probe failed", details: err.message });
  }
});

module.exports = router;
