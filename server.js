const express = require("express");
const path = require("path");
const fs = require("node:fs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

// Import modularized middlewares and routes
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



// Serve every file inside the "public" directory automatically
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// Authentication (JWT)
// ---------------------------------------------------------------------------
const AUTH_FILE = path.join(__dirname, "auth.json");

function loadAuth() {
  if (!fs.existsSync(AUTH_FILE)) {
    const defaultAuth = {
      username: "admin",
      password: "admin",
      jwtSecret: crypto.randomBytes(64).toString("hex")
    };
    fs.writeFileSync(AUTH_FILE, JSON.stringify(defaultAuth, null, 2));
    return defaultAuth;
  }
  return JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const authConfig = loadAuth();

  if (username === authConfig.username && password === authConfig.password) {
    const token = jwt.sign({ username }, authConfig.jwtSecret, { expiresIn: "30d" });
    return res.json({ success: true, token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

app.use("/api", (req, res, next) => {
  if (req.path === "/login" || req.path === "/ping") return next();

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

function startServer(port = PORT, host = HOST) {
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => {
      console.log(`\n  ╭─────────────────────────────────────────╮`);
      console.log(`  │                                         │`);
      console.log(`  │   🍜  Cup Noodles Media Server          │`);
      console.log(`  │                                         │`);
      console.log(`  │   Local:  http://localhost:${port}        │`);
      console.log(`  │                                         │`);
      console.log(`  ╰─────────────────────────────────────────╯\n`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };