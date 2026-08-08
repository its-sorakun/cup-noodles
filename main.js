require("dotenv").config({ path: require('path').join(__dirname, '.env') });
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

// Inject user data path for the Express server to use writable config
process.env.USER_DATA_PATH = app.getPath("userData");

const { startServer } = require("./server");

let mainWindow;

async function createWindow() {
  // Start the Express server on an available port or fallback to default
  const server = await startServer(1337);
  const address = server.address();
  const port = address.port;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Cup-Noodles",
    backgroundColor: "#000000",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "public", "img", "current_icon.ico")
  });

  // Remove default menu for a cleaner app feel
  Menu.setApplicationMenu(null);

  // Re-enable essential developer shortcuts since menu is hidden
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.control && input.key.toLowerCase() === "r") {
      mainWindow.reload();
      event.preventDefault();
    } else if (input.control && input.shift && input.key.toLowerCase() === "i") {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Intercept target="_blank" and open in OS default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });

  // Fix video fullscreen bug where exiting video fullscreen exits app fullscreen
  let wasFullScreenBeforeVideo = false;
  let lastEnterFullScreenTime = 0;

  mainWindow.on('enter-full-screen', () => {
    lastEnterFullScreenTime = Date.now();
  });

  mainWindow.webContents.on('enter-html-full-screen', () => {
    // If enter-full-screen didn't fire in the last 200ms, the app was ALREADY fullscreen!
    wasFullScreenBeforeVideo = (Date.now() - lastEnterFullScreenTime) > 200;
  });

  mainWindow.webContents.on('leave-html-full-screen', () => {
    if (wasFullScreenBeforeVideo) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isFullScreen()) {
          mainWindow.setFullScreen(true);
        }
      }, 50);
    }
  });

  // Load the web app
  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
