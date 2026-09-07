const { app, BrowserWindow, globalShortcut } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

// In dev, the machine runs `vinext dev` separately (use `npm run electron:dev`)
// and we load from the dev server. In production we serve the static export
// straight out of dist/client with a tiny built-in HTTP server. This keeps the
// packaged app fully self-contained (no node_modules for the server runtime).

const DEV_PORT = process.env.VINEXT_DEV_PORT || 3000;
const PROD_PORT = 41230; // ascii for GAME-ish, fixed for the app
const SERVE_ROOT = path.join(__dirname, '..', 'dist', 'client');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.rsc': 'text/plain; charset=utf-8',
};

let server = null;
let mainWindow = null;

function getMime(file) {
  const ext = path.extname(file).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': getMime(filePath),
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(
        (req.url || '/').split('?')[0].split('#')[0]
      );
      let filePath = path.normalize(path.join(SERVE_ROOT, urlPath));

      if (!filePath.startsWith(SERVE_ROOT + path.sep) && filePath !== SERVE_ROOT) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.stat(filePath, (statErr, stats) => {
        if (!statErr && stats.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
        if (urlPath.endsWith('/') || urlPath === '') {
          filePath = path.join(SERVE_ROOT, 'index.html');
        }
        serveFile(res, filePath);
      });
    });

    server.on('error', reject);
    server.listen(PROD_PORT, '127.0.0.1', () => resolve());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    title: 'AFTERGLOW — Coastal Drift',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webgl: true,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0a0a',
    show: false,
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 2000);

  const url = isDev
    ? `http://localhost:${DEV_PORT}`
    : `http://127.0.0.1:${PROD_PORT}/`;

  mainWindow.loadURL(url);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    if (!isDev) {
      await startStaticServer();
    }
    createWindow();

    globalShortcut.register('CommandOrControl+R', () => {
      if (mainWindow) mainWindow.webContents.reload();
    });
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (mainWindow) mainWindow.webContents.toggleDevTools();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (err) {
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'AFTERGLOW could not start',
      String((err && err.message) || err)
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (server) {
    server.close();
    server = null;
  }
});