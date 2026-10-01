import { useSyncExternalStore } from "react"

function subscribe(onChange: () => void) {
  window.addEventListener("focus", onChange)
  window.addEventListener("blur", onChange)
  return () => {
    window.removeEventListener("focus", onChange)
    window.removeEventListener("blur", onChange)
  }
}

export function useWindowFocused(): boolean {
  return useSyncExternalStore(subscribe, () => document.hasFocus())
}
