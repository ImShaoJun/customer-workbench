import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Disable GPU acceleration to prevent black screen in WSL/Linux environments
app.disableHardwareAcceleration();

function shouldAutoOpenDevTools(): boolean {
  const flag = (process.env.ELECTRON_OPEN_DEVTOOLS || '').toLowerCase()
  return flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on'
}

function toggleWindowMaximize(mainWindow: BrowserWindow): void {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
    return
  }
  mainWindow.maximize()
}

function registerWindowIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle('window:minimize', () => mainWindow.minimize())
  ipcMain.handle('window:maximize', () => toggleWindowMaximize(mainWindow))
  ipcMain.handle('window:close', () => mainWindow.close())
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // DevTools is opt-in in dev mode to avoid startup distraction and extra rendering cost.
    if (is.dev && shouldAutoOpenDevTools()) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR in dev, load built file in prod
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.workbench.customer')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createWindow()

  // Keep window controls centralized to avoid duplicate IPC wiring.
  registerWindowIpc(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
