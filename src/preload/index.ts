import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Diagnosis
  startDiagnosis: (data: { text: string; images: string[] }) =>
    ipcRenderer.invoke('diagnose:start', data),
  abortDiagnosis: () => ipcRenderer.invoke('diagnose:abort'),
  onStream: (callback: (message: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: unknown) => callback(message)
    ipcRenderer.on('diagnose:stream', handler)
    return () => ipcRenderer.removeListener('diagnose:stream', handler)
  },
  onComplete: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('diagnose:complete', handler)
    return () => ipcRenderer.removeListener('diagnose:complete', handler)
  },
  onError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on('diagnose:error', handler)
    return () => ipcRenderer.removeListener('diagnose:error', handler)
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
}

// Use `contextBridge` to expose APIs to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
