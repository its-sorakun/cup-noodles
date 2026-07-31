const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
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
    icon: path.join(__dirname, "public", "favicon.ico") // Using favicon for now
  });

  // Remove default menu for a cleaner app feel
  Menu.setApplicationMenu(null);

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
