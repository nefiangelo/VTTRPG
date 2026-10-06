import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { register, login, updateProfile } from './auth'
import { createCampaign, getCampaignsByUser, getRpgSystems, getCampaignById, getCampaignMembers, updateCampaign, deleteCampaign, UpdateCampaignPayload } from './campaign'
import {
  getSessionsByCampaign,
  getSessionById,
  createSession,
  updateSession,
  startSession,
  endSession,
  reopenSession,
  deleteSession,
  importSessionBundle,
  applySessionSyncUpdate
} from './session'
import type { CreateSessionPayload, UpdateSessionPayload, ImportBundlePayload, ApplySyncPayload } from './session'
import {
  getCharactersByCampaign,
  getCharacterById,
  saveCharacter,
  deleteCharacter
} from './character'
import type { SaveCharacterPayload } from './character'
import {
  getRpgSystemsFull, getRpgSystemById, createRpgSystem, updateRpgSystem, deleteRpgSystem,
  getSystemContent, createSystemContent, updateSystemContent, deleteSystemContent,
} from './rpg_system'
import type { CreateRpgSystemPayload, UpdateRpgSystemPayload, CreateContentPayload, UpdateContentPayload, ContentType } from './rpg_system'
import type { CreateCampaignPayload } from './campaign'
import { closeDb } from './db'
import {
  startSessionServer,
  stopSessionServer,
  getSessionServerStatus,
  getLocalIpAddresses
} from './session_server'

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
  ipcMain.handle('auth:updateProfile', (_e, payload: Parameters<typeof updateProfile>[0]) =>
    updateProfile(payload)
  )

  // Campaigns
  ipcMain.handle('campaign:create', (_e, payload: CreateCampaignPayload) =>
    createCampaign(payload)
  )
  ipcMain.handle('campaign:update', (_e, payload: UpdateCampaignPayload) =>
    updateCampaign(payload)
  )
  ipcMain.handle('campaign:delete', async (_e, id: number) => {
    const status = getSessionServerStatus()
    if (status.isRunning && status.campaignId === id) {
      await stopSessionServer()
    }
    return deleteCampaign(id)
  })
  ipcMain.handle('campaign:getByUser', (_e, userId: number) =>
    getCampaignsByUser(userId)
  )
  ipcMain.handle('campaign:getById', (_e, id: number) =>
    getCampaignById(id)
  )
  ipcMain.handle('campaign:getMembers', (_e, campaignId: number) =>
    getCampaignMembers(campaignId)
  )
  ipcMain.handle('campaign:getSystems', () =>
    getRpgSystems()
  )

  // Sessions
  ipcMain.handle('session:getByCampaign', (_e, campaignId: number) =>
    getSessionsByCampaign(campaignId)
  )
  ipcMain.handle('session:getById', (_e, id: number) =>
    getSessionById(id)
  )
  ipcMain.handle('session:create', (_e, payload: CreateSessionPayload) =>
    createSession(payload)
  )
  ipcMain.handle('session:update', (_e, payload: UpdateSessionPayload) =>
    updateSession(payload)
  )
  ipcMain.handle('session:start', (_e, id: number) =>
    startSession(id)
  )
  ipcMain.handle('session:end', (_e, id: number, notes?: string) =>
    endSession(id, notes)
  )
  ipcMain.handle('session:reopen', (_e, id: number) =>
    reopenSession(id)
  )
  ipcMain.handle('session:delete', (_e, id: number) =>
    deleteSession(id)
  )
  ipcMain.handle('session:importBundle', (_e, payload: ImportBundlePayload) =>
    importSessionBundle(payload)
  )
  ipcMain.handle('session:applySyncUpdate', (_e, payload: ApplySyncPayload, userId?: number) =>
    applySessionSyncUpdate(payload, userId)
  )

  // Characters (Fichas de Personagem)
  ipcMain.handle('character:getByCampaign', (_e, campaignId: number, userId?: number) =>
    getCharactersByCampaign(campaignId, userId)
  )
  ipcMain.handle('character:getById', (_e, id: number) =>
    getCharacterById(id)
  )
  ipcMain.handle('character:save', (_e, payload: SaveCharacterPayload) =>
    saveCharacter(payload)
  )
  ipcMain.handle('character:delete', (_e, id: number, userId?: number, isGM?: boolean) =>
    deleteCharacter(id, userId, isGM)
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

  // Session Server (Express + Socket.io)
  ipcMain.handle('server:start', (_e, sessionId: number, port?: number) =>
    startSessionServer(sessionId, port)
  )
  ipcMain.handle('server:stop', (_e, endedInfo?: { sessionId?: number; notes?: string }) =>
    stopSessionServer(endedInfo)
  )
  ipcMain.handle('server:getStatus', () =>
    getSessionServerStatus()
  )
  ipcMain.handle('server:getLocalIps', () =>
    getLocalIpAddresses()
  )

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
  stopSessionServer()
  closeDb()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
