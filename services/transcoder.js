const fs = require("node:fs");
const path = require("path");
const { spawn } = require("node:child_process");

const QUALITY_PRESETS = {
  "1080p": { resolution: "1920x1080", videoBitrate: "4000k", audioBitrate: "192k" },
  "720p":  { resolution: "1280x720",  videoBitrate: "2500k", audioBitrate: "128k" },
  "480p":  { resolution: "854x480",   videoBitrate: "1000k", audioBitrate: "128k" },
  "360p":  { resolution: "640x360",   videoBitrate: "500k",  audioBitrate: "96k"  },
};

// Maps sessionId -> { filePath, dir, ffmpegProcess, lastAccess, quality, playlistPath, error }
const transcodeSessions = new Map();

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

// Cleanup stale sessions every 5 minutes (if no client activity for 10 min)
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of transcodeSessions.entries()) {
    if (now - session.lastAccess > 10 * 60 * 1000) {
      killSession(id);
    }
  }
}, 5 * 60 * 1000);

function startTranscodeProcess(sessionId, sessionDir, filePath, playlistPath, quality, startTime) {
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS["720p"];
  
  const targetW = parseInt(preset.resolution.split("x")[0]);
  const targetH = parseInt(preset.resolution.split("x")[1]);
  
  const ffmpegArgs = [
    "-y",
    "-nostats",
    "-loglevel", "warning",
    ...(startTime > 0 ? ["-ss", String(startTime)] : []),
    "-i", filePath,
    "-c:v", "h264_nvenc",
    "-preset", "p4",
    "-b:v", preset.videoBitrate,
    "-c:a", "aac",
    "-b:a", preset.audioBitrate,
    "-vf", `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
    "-f", "hls",
    "-hls_time", "6",
    "-hls_list_size", "0",
    "-hls_segment_type", "mpegts",
    "-hls_segment_filename", path.join(sessionDir, "seg%05d.ts"),
    playlistPath,
  ];

  console.log(`[transcode] Starting session ${sessionId} — quality: ${quality}`);
  console.log(`[transcode] FFmpeg args: ffmpeg ${ffmpegArgs.join(" ")}`);
  const { getBinPath } = require('./binpaths');
  const ffmpegPath = getBinPath('ffmpeg');
  const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, {
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderrBuf = "";
  ffmpegProcess.stderr.on("data", (data) => {
    const text = data.toString();
    if (stderrBuf.length < 50000) {
      stderrBuf += text;
    }
  });

  ffmpegProcess.on("error", (err) => {
    console.error(`[transcode] Failed to spawn FFmpeg: ${err.message}`);
    const session = transcodeSessions.get(sessionId);
    if (session) session.error = `FFmpeg not found: ${err.message}`;
  });

  ffmpegProcess.on("close", (code) => {
    console.log(`[transcode] FFmpeg session ${sessionId} closed with code ${code}`);
    const session = transcodeSessions.get(sessionId);
    if (code !== 0 && code !== null) {
      if (session) session.error = stderrBuf || `FFmpeg exited with code ${code}`;
      try { require('fs').writeFileSync(path.join(sessionDir, "error.log"), session.error); } catch(e){}
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

  return { preset };
}

module.exports = {
  QUALITY_PRESETS,
  transcodeSessions,
  killSession,
  startTranscodeProcess
};
