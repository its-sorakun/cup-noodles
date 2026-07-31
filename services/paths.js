const path = require("path");
const fs = require("fs");

const isElectron = !!process.env.USER_DATA_PATH;
const rootDir = path.join(__dirname, "..");

function getPaths() {
  if (!isElectron) {
    // Web only mode: resolve relative to app root directory
    return {
      config: path.join(rootDir, "config.json"),
      auth: path.join(rootDir, "auth.json"),
      thumbnails: path.join(rootDir, ".thumbnails"),
      getBinPath: (p) => p
    };
  }

  const userDataDir = process.env.USER_DATA_PATH;
  const configPath = path.join(userDataDir, "config.json");
  const authPath = path.join(userDataDir, "auth.json");
  const thumbnailsDir = path.join(userDataDir, ".thumbnails");

  // On first launch, copy default config.json from the app bundle if it doesn't exist
  if (!fs.existsSync(configPath)) {
    try {
      const defaultConfigPath = path.join(rootDir, "config.json");
      if (fs.existsSync(defaultConfigPath)) {
        fs.copyFileSync(defaultConfigPath, configPath);
      } else {
        // Fallback default structure
        fs.writeFileSync(configPath, JSON.stringify({ libraries: [], server: { port: 1337, host: "0.0.0.0" } }, null, 2));
      }
    } catch (err) {
      console.error("[paths] Failed to initialize default config.json in userData:", err.message);
    }
  }

  // Ensure thumbnails directory exists
  if (!fs.existsSync(thumbnailsDir)) {
    try {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    } catch (err) {
      console.error("[paths] Failed to create thumbnails directory in userData:", err.message);
    }
  }

  return {
    config: configPath,
    auth: authPath,
    thumbnails: thumbnailsDir,
    getBinPath: (p) => p.includes("app.asar") ? p.replace("app.asar", "app.asar.unpacked") : p
  };
}

module.exports = getPaths();
