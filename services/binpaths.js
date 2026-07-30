const path = require("path");
const fs = require("fs");

function getAppRoot() {
  const cwd = process.cwd();
  if (cwd.includes("target\\debug") || cwd.includes("target/debug")) {
    return path.join(cwd, "..", "..", "..");
  }
  if (cwd.endsWith("src-tauri")) {
    return path.join(cwd, "..");
  }
  return cwd;
}

function getBinPath(binName) {
  const exeName = process.platform === "win32" ? `${binName}.exe` : binName;
  const paths = [];
  
  if (process.pkg) {
    paths.push(path.join(path.dirname(process.execPath), exeName));
    paths.push(path.join(getAppRoot(), "src-tauri", "bin", exeName));
  } else {
    if (binName === "ffmpeg") {
      paths.push(require('ffmpeg-static'));
    } else if (binName === "ffprobe") {
      paths.push(require('ffprobe-static').path);
    }
  }
  
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return paths[0];
}

module.exports = { getAppRoot, getBinPath };
