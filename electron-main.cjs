// Grace Flow — Electron Desktop Application Entry Point
// Author: Peter Olatunji (@_mayowapeter)

const { app, BrowserWindow, Menu, shell, screen, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

// 1. Single Instance Lock (prevents port conflicts)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

const PORT = process.env.PORT || 3000;
let mainWindow = null;
let stageWindow = null;
let serverInstance = null;

// 2. Set up Persistent User Data Directory
// This ensures templates and schedules survive updates and work in read-only packaged app
const userDataDir = app.getPath('userData');
const appDataDir = path.join(userDataDir, 'data');
if (!fs.existsSync(appDataDir)) {
  fs.mkdirSync(appDataDir, { recursive: true });
}

// Seed default templates and schedule if they do not exist in userData yet
const bundledDataDir = path.join(__dirname, 'data');
['templates.json', 'schedule.json'].forEach((filename) => {
  const destPath = path.join(appDataDir, filename);
  const srcPath = path.join(bundledDataDir, filename);
  if (!fs.existsSync(destPath) && fs.existsSync(srcPath)) {
    try {
      fs.copyFileSync(srcPath, destPath);
    } catch (e) {
      console.warn(`Could not seed ${filename}:`, e);
    }
  }
});

// Configure DATA_DIR environment variable for server.js
process.env.DATA_DIR = appDataDir;
process.env.PORT = String(PORT);

// 3. Start Background Server
async function startServer() {
  try {
    // Dynamic import of ESM server.js
    const serverModule = await import('./server.js');
    console.log('Grace Flow server started successfully on port', PORT);
  } catch (err) {
    console.error('Failed to start internal Grace Flow server:', err);
    dialog.showErrorBox(
      'Server Startup Error',
      `Grace Flow could not start its local server on port ${PORT}.\n${err.message}`
    );
  }
}

// Check if server is ready
function waitForServer(url, timeoutMs = 8000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    function check() {
      http.get(url, (res) => {
        if (res.statusCode < 500) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', retry);
    }

    function retry() {
      if (Date.now() - startTime > timeoutMs) {
        resolve(false);
      } else {
        setTimeout(check, 150);
      }
    }

    check();
  });
}

// 4. Create Main Operator Console Window
async function createMainWindow() {
  const iconPath = process.platform === 'darwin'
    ? path.join(__dirname, 'public', 'assets', 'AppIcon.icns')
    : path.join(__dirname, 'public', 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0b0f19',
    title: 'Grace Flow — Church Countdown & Service System',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  const baseUrl = `http://localhost:${PORT}/app`;
  const serverReady = await waitForServer(`http://localhost:${PORT}`);

  if (serverReady) {
    mainWindow.loadURL(baseUrl);
  } else {
    // Fallback load local file
    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (stageWindow) {
      stageWindow.close();
      stageWindow = null;
    }
  });

  // Handle external links safely in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  setupAppMenu();
}

// 5. Open Dedicated Stage Output Window (for second monitor or projector)
function openStageDisplayWindow() {
  if (stageWindow && !stageWindow.isDestroyed()) {
    stageWindow.focus();
    return;
  }

  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0);

  const stageOptions = {
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    title: 'Grace Flow — Stage Display Output',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  };

  // If a secondary display (projector / confidence TV) is connected, place window there
  if (externalDisplay) {
    stageOptions.x = externalDisplay.bounds.x + 50;
    stageOptions.y = externalDisplay.bounds.y + 50;
  }

  stageWindow = new BrowserWindow(stageOptions);
  stageWindow.loadURL(`http://localhost:${PORT}/stage`);

  stageWindow.on('closed', () => {
    stageWindow = null;
  });
}

// 6. Application Menu
function setupAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        {
          label: 'About Grace Flow',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Grace Flow',
              message: 'Grace Flow — v1.0.0',
              detail: 'Church Countdown, Stage Display & Run of Show Management System.\n\nCreator: Peter Olatunji\nInstagram: @_mayowapeter\nWebsite: https://grace-flow.onrender.com'
            });
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Stage Display Window',
          accelerator: isMac ? 'Cmd+Shift+S' : 'Ctrl+Shift+S',
          click: openStageDisplayWindow
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Visit Creator Instagram (@_mayowapeter)',
          click: () => shell.openExternal('https://instagram.com/_mayowapeter')
        },
        {
          label: 'View on GitHub',
          click: () => shell.openExternal('https://github.com/Bombaj6/grace-flow')
        },
        {
          label: 'Open Web Live Version',
          click: () => shell.openExternal('https://grace-flow.onrender.com')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 7. Lifecycle Handlers
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  await startServer();
  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
