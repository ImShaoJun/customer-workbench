export {}

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, ...args: unknown[]) => void
        on: (channel: string, func: (...args: unknown[]) => void) => void
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      }
    }
    api: {
      startDiagnosis: (data: { text: string; images: string[] }) => Promise<void>
      abortDiagnosis: () => Promise<void>
      onStream: (callback: (message: unknown) => void) => () => void
      onComplete: (callback: () => void) => () => void
      onError: (callback: (error: string) => void) => () => void
      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
    }
  }
}
