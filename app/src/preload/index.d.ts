import { ElectronAPI } from '@electron-toolkit/preload'

export interface AuthUser {
  id: number
  username: string
  email: string | null
  created_at: string
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

interface API {
  auth: {
    login: (username: string, password: string) => Promise<AuthResult>
    register: (username: string, password: string, email?: string) => Promise<AuthResult>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
