import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { register, login } from './auth'
import { createCampaign, getCampaignsByUser, getRpgSystems } from './campaign'
import {
  getRpgSystemsFull, getRpgSystemById, createRpgSystem, updateRpgSystem, deleteRpgSystem,
  getSystemContent, createSystemContent, updateSystemContent, deleteSystemContent,
} from './rpg_system'
import type { CreateRpgSystemPayload, UpdateRpgSystemPayload, CreateContentPayload, UpdateContentPayload, ContentType } from './rpg_system'
import type { CreateCampaignPayload } from './campaign'
import { closeDb } from './db'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Auth
  ipcMain.handle('auth:register', (_e, username: string, password: string, email?: string) =>
    register(username, password, email)
  )
  ipcMain.handle('auth:login', (_e, username: string, password: string) =>
    login(username, password)
  )

  // Campaigns
  ipcMain.handle('campaign:create', (_e, payload: CreateCampaignPayload) =>
    createCampaign(payload)
  )
  ipcMain.handle('campaign:getByUser', (_e, userId: number) =>
    getCampaignsByUser(userId)
  )
  ipcMain.handle('campaign:getSystems', () =>
    getRpgSystems()
  )

  // RPG Systems full CRUD
  ipcMain.handle('system:getAll', () => getRpgSystemsFull())
  ipcMain.handle('system:getById', (_e, id: number) => getRpgSystemById(id))
  ipcMain.handle('system:create', (_e, payload: CreateRpgSystemPayload) => createRpgSystem(payload))
  ipcMain.handle('system:update', (_e, payload: UpdateRpgSystemPayload) => updateRpgSystem(payload))
  ipcMain.handle('system:delete', (_e, id: number) => deleteRpgSystem(id))

  // System Content CRUD
  ipcMain.handle('content:getBySystem', (_e, rpgSystemId: number, type?: ContentType) => getSystemContent(rpgSystemId, type))
  ipcMain.handle('content:create', (_e, payload: CreateContentPayload) => createSystemContent(payload))
  ipcMain.handle('content:update', (_e, payload: UpdateContentPayload) => updateSystemContent(payload))
  ipcMain.handle('content:delete', (_e, id: number) => deleteSystemContent(id))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
