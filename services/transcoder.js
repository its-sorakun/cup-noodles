const fs = require("node:fs");
const path = require("path");
const { spawn } = require("node:child_process");
const paths = require("./paths");

const QUALITY_PRESETS = {
  "remux": { resolution: "original", videoBitrate: "copy", audioBitrate: "copy" },
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

function startTranscodeProcess(sessionId, sessionDir, filePath, playlistPath, quality, startTime, audioTrackIndex = null) {
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS["720p"];
  
  const rawFfmpegPath = require("ffmpeg-static");
  const ffmpegPath = paths.getBinPath(rawFfmpegPath);
  
  const ffmpegArgs = [
    "-y",
    "-nostats",
    "-loglevel", "warning",
    ...(startTime > 0 ? ["-ss", String(startTime)] : []),
    "-i", filePath
  ];

  if (audioTrackIndex !== null) {
    ffmpegArgs.push("-map", "0:v:0", "-map", `0:${audioTrackIndex}`);
  }

  if (quality === "remux") {
    ffmpegArgs.push(
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-ac", "2"
    );
  } else {
    const targetW = parseInt(preset.resolution.split("x")[0]);
    const targetH = parseInt(preset.resolution.split("x")[1]);
    ffmpegArgs.push(
      "-c:v", "h264_nvenc",
      "-preset", "p4",
      "-tune", "ll",
      "-vf", `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2`,
      "-b:v", preset.videoBitrate,
      "-maxrate", preset.videoBitrate,
      "-bufsize", `${parseInt(preset.videoBitrate) * 2}k`,
      "-c:a", "aac",
      "-b:a", preset.audioBitrate,
      "-ac", "2"
    );
  }

  ffmpegArgs.push(
    "-f", "hls",
    "-hls_time", "4",
    "-hls_list_size", "0",
    "-hls_segment_type", "mpegts",
    "-hls_segment_filename", path.join(sessionDir, "seg%05d.ts"),
    playlistPath
  );

  console.log(`[transcode] Starting session ${sessionId} — quality: ${quality}`);
  console.log(`[transcode] FFmpeg args: ${ffmpegPath} ${ffmpegArgs.join(" ")}`);
  
  const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, {
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderrBuf = "";
  ffmpegProcess.stderr.on("data", (data) => {
    const text = data.toString();
    if (stderrBuf.length < 10000) {
      stderrBuf += text;
    }
  });

  ffmpegProcess.on("error", (err) => {
    console.error(`[transcode] Failed to spawn FFmpeg: ${err.message}`);
    const session = transcodeSessions.get(sessionId);
    if (session) session.error = `FFmpeg not found: ${err.message}`;
  });

  ffmpegProcess.on("exit", (code) => {
    console.log(`[transcode] Session ${sessionId} FFmpeg exited with code ${code}`);
    const session = transcodeSessions.get(sessionId);
    if (session && code !== 0) {
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

  return { preset };
}

module.exports = {
  QUALITY_PRESETS,
  transcodeSessions,
  killSession,
  startTranscodeProcess
};
