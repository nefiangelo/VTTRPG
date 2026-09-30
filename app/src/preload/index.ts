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
    getSystems: () =>
      ipcRenderer.invoke('campaign:getSystems'),
  }
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
