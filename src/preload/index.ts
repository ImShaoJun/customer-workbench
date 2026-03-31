import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

function onIpc<T>(channel: string, callback: (payload: T) => void) {
  const handler = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

// Custom APIs for renderer
const api = {
  // Diagnosis
  startDiagnosis: (data: { text: string; images: string[] }) =>
    ipcRenderer.invoke('diagnose:start', data),
  abortDiagnosis: () => ipcRenderer.invoke('diagnose:abort'),
  onStream: (callback: (message: unknown) => void) => onIpc('diagnose:stream', callback),
  onComplete: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('diagnose:complete', handler)
    return () => ipcRenderer.removeListener('diagnose:complete', handler)
  },
  onError: (callback: (error: string) => void) => onIpc('diagnose:error', callback),

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
