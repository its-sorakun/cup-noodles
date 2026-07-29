const fsPromises = require("node:fs/promises");
const path = require("path");
const babel = require("@babel/core");

// Cache for transpiled JS files
const transpileCache = new Map();

async function babelMiddleware(req, res, next) {
  if (!req.path.endsWith(".js")) {
    return next();
  }

  try {
    const jsPath = path.join(__dirname, "..", "public", req.path);
    const stats = await fsPromises.stat(jsPath).catch(() => null);
    
    // If file doesn't exist, let express.static handle the 404
    if (!stats || !stats.isFile()) {
      return next();
    }

    let cached = transpileCache.get(req.path) || { mtimeMs: 0, code: "" };

    if (stats.mtimeMs > cached.mtimeMs) {
      console.log(`[babel] Transpiling ${req.path} to ES5...`);
      const rawCode = await fsPromises.readFile(jsPath, "utf-8");
      const result = babel.transformSync(rawCode, {
        presets: [
          ["@babel/preset-env", {
            targets: "defaults, ie >= 11, ios >= 9",
          }]
        ],
        sourceMaps: false,
      });
      cached = { mtimeMs: stats.mtimeMs, code: result.code };
      transpileCache.set(req.path, cached);
    }

    res.setHeader("Content-Type", "application/javascript");
    res.send(cached.code);
  } catch (err) {
    console.error(`[babel] Transpilation failed for ${req.path}, falling back to static file:`, err.message);
    next();
  }
}

module.exports = babelMiddleware;
