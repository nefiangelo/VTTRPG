import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('auth:login', username, password),
    register: (username: string, password: string, email?: string) =>
      ipcRenderer.invoke('auth:register', username, password, email)
  },

  campaigns: {
    create: (payload: { title: string; description?: string; rpg_system_id: number; owner_id: number }) =>
      ipcRenderer.invoke('campaign:create', payload),
    getByUser: (userId: number) =>
      ipcRenderer.invoke('campaign:getByUser', userId),
    getById: (id: number) =>
      ipcRenderer.invoke('campaign:getById', id),
    getMembers: (campaignId: number) =>
      ipcRenderer.invoke('campaign:getMembers', campaignId),
    getSystems: () =>
      ipcRenderer.invoke('campaign:getSystems'),
  },

  sessions: {
    getByCampaign: (campaignId: number) =>
      ipcRenderer.invoke('session:getByCampaign', campaignId),
    getById: (id: number) =>
      ipcRenderer.invoke('session:getById', id),
    create: (payload: { campaign_id: number; title?: string; notes?: string }) =>
      ipcRenderer.invoke('session:create', payload),
    update: (payload: { id: number; title?: string; notes?: string; status?: string }) =>
      ipcRenderer.invoke('session:update', payload),
    start: (id: number) =>
      ipcRenderer.invoke('session:start', id),
    end: (id: number, notes?: string) =>
      ipcRenderer.invoke('session:end', id, notes),
    reopen: (id: number) =>
      ipcRenderer.invoke('session:reopen', id),
    delete: (id: number) =>
      ipcRenderer.invoke('session:delete', id),
    importBundle: (payload: { bundle: unknown; userId: number; serverUrl?: string }) =>
      ipcRenderer.invoke('session:importBundle', payload),
    applySyncUpdate: (payload: unknown, userId?: number) =>
      ipcRenderer.invoke('session:applySyncUpdate', payload, userId),
  },

  characters: {
    getByCampaign: (campaignId: number, userId?: number) =>
      ipcRenderer.invoke('character:getByCampaign', campaignId, userId),
    getById: (id: number) =>
      ipcRenderer.invoke('character:getById', id),
    save: (payload: unknown) =>
      ipcRenderer.invoke('character:save', payload),
    delete: (id: number, userId: number, isGM?: boolean) =>
      ipcRenderer.invoke('character:delete', id, userId, isGM),
  },

  systems: {
    getAll: () => ipcRenderer.invoke('system:getAll'),
    getById: (id: number) => ipcRenderer.invoke('system:getById', id),
    create: (payload: unknown) => ipcRenderer.invoke('system:create', payload),
    update: (payload: unknown) => ipcRenderer.invoke('system:update', payload),
    delete: (id: number) => ipcRenderer.invoke('system:delete', id),
  },

  content: {
    getBySystem: (rpgSystemId: number, type?: string) => ipcRenderer.invoke('content:getBySystem', rpgSystemId, type),
    create: (payload: unknown) => ipcRenderer.invoke('content:create', payload),
    update: (payload: unknown) => ipcRenderer.invoke('content:update', payload),
    delete: (id: number) => ipcRenderer.invoke('content:delete', id),
  },

  server: {
    start: (sessionId: number, port?: number) => ipcRenderer.invoke('server:start', sessionId, port),
    stop: (endedInfo?: { sessionId?: number; notes?: string }) => ipcRenderer.invoke('server:stop', endedInfo),
    getStatus: () => ipcRenderer.invoke('server:getStatus'),
    getLocalIps: () => ipcRenderer.invoke('server:getLocalIps'),
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
