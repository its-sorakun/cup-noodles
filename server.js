const express = require("express");
const path = require("path");
const fs = require("node:fs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

// Import modularized middlewares and routes
const apiRoutes = require("./routes/api");
const transcodeRoutes = require("./routes/transcode");

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

// ---------------------------------------------------------------------------
// Load config (sync at startup for PORT/HOST)
// ---------------------------------------------------------------------------
const CONFIG_FILE = path.join(getAppRoot(), "config.json");
let CONFIG = {};
if (fs.existsSync(CONFIG_FILE)) {
  CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
}

const PORT = CONFIG?.server?.port || 1337;
const HOST = CONFIG?.server?.host || "0.0.0.0";
const app = express();

// Allow Tauri origins for Sidecar communication
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());
// Serve every file inside the "public" directory automatically
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// Authentication (JWT)
// ---------------------------------------------------------------------------
const AUTH_FILE = path.join(getAppRoot(), "auth.json");

function loadAuth() {
  if (!fs.existsSync(AUTH_FILE)) {
    return { needsSetup: true };
  }
  return JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
}

app.get("/api/needs-setup", (req, res) => {
  const authConfig = loadAuth();
  res.json({ needsSetup: !!authConfig.needsSetup });
});

app.post("/api/setup", (req, res) => {
  if (fs.existsSync(AUTH_FILE)) {
    return res.status(400).json({ error: "Setup already completed" });
  }
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Create auth.json
  const newAuth = {
    username,
    password,
    jwtSecret: crypto.randomBytes(64).toString("hex")
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(newAuth, null, 2));

  const token = jwt.sign({ username }, newAuth.jwtSecret, { expiresIn: "30d" });
  res.json({ success: true, token });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const authConfig = loadAuth();

  if (authConfig.needsSetup) {
    return res.status(400).json({ error: "Setup required" });
  }

  if (username === authConfig.username && password === authConfig.password) {
    const token = jwt.sign({ username }, authConfig.jwtSecret, { expiresIn: "30d" });
    return res.json({ success: true, token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

app.use("/api", (req, res, next) => {
  if (
    req.path === "/login" || 
    req.path === "/ping" || 
    req.path === "/needs-setup" || 
    req.path === "/setup"
  ) {
    return next();
  }

  let token = req.headers.authorization?.split(" ")[1];
  if (!token && req.query.token) {
    token = req.query.token;
  }
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)jwt_token=([^;]*)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const authConfig = loadAuth();
    jwt.verify(token, authConfig.jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

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