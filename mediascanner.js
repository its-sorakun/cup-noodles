const fs = require("node:fs/promises");
const path = require("node:path");

// ---------------------------------------------------------------------------
// File extension → media type mapping
// ---------------------------------------------------------------------------
const EXT_MAP = {
  // Video
  ".mp4": "video", ".mkv": "video", ".avi": "video", ".mov": "video",
  ".wmv": "video", ".flv": "video", ".webm": "video", ".m4v": "video",
  ".ts": "video", ".mpg": "video", ".mpeg": "video",
  // Image
  ".jpg": "image", ".jpeg": "image", ".png": "image", ".gif": "image",
  ".bmp": "image", ".webp": "image", ".svg": "image", ".avif": "image",
  ".tiff": "image", ".tif": "image", ".ico": "image", ".heic": "image",
  ".heif": "image", ".jxl": "image",
  // Audio
  ".mp3": "audio", ".flac": "audio", ".wav": "audio", ".aac": "audio",
  ".ogg": "audio", ".wma": "audio", ".m4a": "audio", ".opus": "audio",
  ".alac": "audio",
};

/**
 * Classify a file by its extension.
 * Returns "video" | "image" | "audio" | null
 */
function classifyFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return EXT_MAP[ext] || null;
}

/**
 * Recursively walk a directory and collect files.
 * Returns an array of { name, relativePath, absolutePath, type, size, modified }
 */
async function walkDir(dirPath, basePath = dirPath) {
  const results = [];

  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    // Directory doesn't exist or is unreadable — return empty
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const sub = await walkDir(fullPath, basePath);
      results.push(...sub);
    } else if (entry.isFile()) {
      const mediaType = classifyFile(entry.name);
      if (!mediaType) continue; // skip non-media files

      let stat;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        continue;
      }

      results.push({
        name: entry.name,
        relativePath: path.relative(basePath, fullPath).replace(/\\/g, "/"),
        absolutePath: fullPath,
        type: mediaType,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      });
    }
  }

  return results;
}

/**
 * Load the config and return the libraries array.
 */
const paths = require("./services/paths");

async function loadConfig() {
  const configPath = paths.config;
  const raw = await fs.readFile(configPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Scan a single library by its config entry.
 * Returns { ...libraryConfig, files: [...], fileCount, configured }
 */
async function scanLibrary(library) {
  if (!library.path || library.path.trim() === "") {
    return {
      name: library.name,
      type: library.type,
      icon: library.icon,
      description: library.description || "",
      path: "",
      configured: false,
      fileCount: 0,
      files: [],
    };
  }

  // Check if path exists
  try {
    await fs.access(library.path);
  } catch {
    return {
      name: library.name,
      type: library.type,
      icon: library.icon,
      description: library.description || "",
      path: library.path,
      configured: true,
      exists: false,
      fileCount: 0,
      files: [],
    };
  }

  const files = await walkDir(library.path);

  // Filter files to match the library type (or return all if type is mixed)
  const filtered = library.type === "mixed"
    ? files
    : files.filter((f) => f.type === library.type);

  return {
    name: library.name,
    type: library.type,
    icon: library.icon,
    description: library.description || "",
    path: library.path,
    configured: true,
    exists: true,
    fileCount: filtered.length,
    files: filtered,
  };
}

/**
 * Scan all libraries defined in config.json.
 * Returns an array of library objects with their files.
 */
async function scanAll() {
  const config = await loadConfig();
  const results = [];
  for (const lib of config.libraries) {
    results.push(await scanLibrary(lib));
  }
  return results;
}

/**
 * Scan a specific library by name.
 */
async function scanByName(name) {
  const config = await loadConfig();
  const lib = config.libraries.find(
    (l) => l.name.toLowerCase() === name.toLowerCase()
  );
  if (!lib) return null;
  return scanLibrary(lib);
}

module.exports = { scanAll, scanByName, loadConfig, classifyFile };