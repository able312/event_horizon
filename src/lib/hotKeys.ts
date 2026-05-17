import { useEffect } from "react"

type KeyCombo = string
type NormalizedKey = string

type ParsedHotkey = {
  wantsMeta: boolean
  wantsCtrl: boolean
  wantsShift: boolean
  wantsAlt: boolean
  key: NormalizedKey
}

const MODIFIER_TOKENS = new Set(["cmd", "meta", "ctrl", "shift", "alt", "option"])
const SPACE_TOKEN = "space"

function isDev(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "development"
}

export function parseHotkeyCombo(combo: KeyCombo): ParsedHotkey {
  const normalized = combo.toLowerCase()
  const rawTokens = normalized.split("+")
  const tokens = rawTokens.map((token) => token.trim())
  const parts = tokens.filter((token) => token.length > 0)

  // Enforce explicit "space" and reject the legacy " " shorthand.
  if (normalized.includes(" ") && !tokens.includes(SPACE_TOKEN)) {
    throw new Error(`Invalid hotkey combo "${combo}": use "space" for space bar.`)
  }

  if (parts.length === 0) {
    throw new Error(`Invalid hotkey combo "${combo}": combo cannot be empty.`)
  }

  if (parts.length !== rawTokens.length) {
    throw new Error(`Invalid hotkey combo "${combo}": empty token detected.`)
  }

  const nonModifiers = parts.filter((part) => !MODIFIER_TOKENS.has(part))

  if (nonModifiers.length !== 1) {
    throw new Error(
      `Invalid hotkey combo "${combo}": exactly one non-modifier key is required.`,
    )
  }

  const keyToken = nonModifiers[0]!
  const key = keyToken === SPACE_TOKEN ? " " : keyToken

  return {
    wantsMeta: parts.includes("cmd") || parts.includes("meta"),
    wantsCtrl: parts.includes("ctrl"),
    wantsShift: parts.includes("shift"),
    wantsAlt: parts.includes("alt") || parts.includes("option"),
    key,
  }
}

export function useHotkey(combo: KeyCombo, callback: (e: KeyboardEvent) => void) {
  useEffect(() => {
    let parsed: ParsedHotkey
    try {
      parsed = parseHotkeyCombo(combo)
    } catch (error) {
      if (isDev()) {
        throw error
      }
      return
    }

    function handler(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC")

      const metaOk = parsed.wantsMeta ? e.metaKey : true
      const ctrlOk = parsed.wantsCtrl
        ? e.ctrlKey
        : parsed.wantsMeta
        ? isMac
          ? true // cmd only on mac
          : e.ctrlKey // fallback to ctrl on windows
        : true

      const shiftOk = parsed.wantsShift ? e.shiftKey : true
      const altOk = parsed.wantsAlt ? e.altKey : true

      const keyOk = parsed.key === " " ? e.key === " " : e.key.toLowerCase() === parsed.key

      if (metaOk && ctrlOk && shiftOk && altOk && keyOk) {
        e.preventDefault()
        callback(e)
      }
    }

    const listenerOptions = { passive: false }

    window.addEventListener("keydown", handler, listenerOptions)
    return () => window.removeEventListener("keydown", handler)
  }, [combo, callback])
}
