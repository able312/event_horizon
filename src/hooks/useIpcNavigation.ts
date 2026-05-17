import { useEffect } from 'react'
import { useNavigate } from 'react-router'

export function useIpcNavigation() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const path = args[0] as string
      if (typeof path !== 'string') {
        console.error('navigate event received a non-string path:', path)
        return
      }
      navigate(path)
    }

    window.electron.ipcRenderer.on('navigate', handler)

    return () => {
      window.electron.ipcRenderer.removeListener('navigate', handler)
    }
  }, [navigate])
}
