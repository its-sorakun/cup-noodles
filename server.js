const express = require("express");
const path = require("path");
const fs = require("node:fs");

// Import modularized middlewares and routes
const babelMiddleware = require("./middlewares/babel");
const apiRoutes = require("./routes/api");
const transcodeRoutes = require("./routes/transcode");

// ---------------------------------------------------------------------------
// Load config (sync at startup for PORT/HOST)
// ---------------------------------------------------------------------------
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"));

const PORT = CONFIG?.server?.port || 1337;
const HOST = CONFIG?.server?.host || "0.0.0.0";
const app = express();

app.use(express.json());

// Intercept requested .js files to serve an ES5-transpiled version via Babel
// Supports legacy iPads/iOS 9+ natively without manual build steps
app.use(babelMiddleware);

// Serve every file inside the "public" directory automatically
app.use(express.static(path.join(__dirname, "public")));

// Mount API routes
app.use("/api/transcode", transcodeRoutes);
app.use("/api", apiRoutes);

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