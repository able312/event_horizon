import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router"

import type { EventStatus, EventType } from "~/definitions/database"
import { ITER_EVENT_STATUSES } from "~/definitions/events/event-constants"
import { EVENT_TYPE_OPTIONS } from "~/definitions/events/ui"
import { getCurrentMonthParam, normalizeMonthParam } from "~/lib/months"

export type EventView = "calendar" | "list"

export interface EventsQueryState {
  view: EventView
  date: string
  search: string | null
  type: EventType | null
  status: EventStatus | null
}

export interface UseEventsQueryStateReturn {
  state: EventsQueryState
  searchInput: string

  setView: (view: EventView) => void
  setDate: (date: string) => void
  setSearch: (search: string | null) => void
  setSearchInput: (search: string) => void
  resetSearchAndFilters: () => void
  setType: (type: EventType | null) => void
  setStatus: (status: EventStatus | null) => void

  reset: () => void
}

const DEFAULT_VIEW: EventView = "calendar"
const SEARCH_DEBOUNCE_MS = 300
const VIEW_VALUES = new Set<EventView>(["calendar", "list"])
const TYPE_VALUES = new Set<EventType>(EVENT_TYPE_OPTIONS)
const STATUS_VALUES = new Set<EventStatus>(ITER_EVENT_STATUSES)

function normalizeView(value: unknown): EventView {
  if (typeof value !== "string") return DEFAULT_VIEW
  return VIEW_VALUES.has(value as EventView) ? (value as EventView) : DEFAULT_VIEW
}

function normalizeDate(value: unknown): string | null {
  return normalizeMonthParam(value)
}

function normalizeSearch(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeType(value: unknown): EventType | null {
  if (typeof value !== "string") return null
  return TYPE_VALUES.has(value as EventType) ? (value as EventType) : null
}

function normalizeStatus(value: unknown): EventStatus | null {
  if (typeof value !== "string") return null
  return STATUS_VALUES.has(value as EventStatus) ? (value as EventStatus) : null
}

function sanitizeState(state: EventsQueryState): EventsQueryState {
  return {
    view: normalizeView(state.view),
    date: normalizeDate(state.date) ?? getCurrentMonthParam(),
    search: normalizeSearch(state.search),
    type: normalizeType(state.type),
    status: normalizeStatus(state.status),
  }
}

function parseState(searchParams: URLSearchParams): EventsQueryState {
  return sanitizeState({
    view: normalizeView(searchParams.get("view")),
    date: normalizeDate(searchParams.get("date")) ?? getCurrentMonthParam(),
    search: normalizeSearch(searchParams.get("search")),
    type: normalizeType(searchParams.get("type")),
    status: normalizeStatus(searchParams.get("status")),
  })
}

function toCanonicalSearchParams(state: EventsQueryState): URLSearchParams {
  const params = new URLSearchParams()
  params.set("date", state.date)

  if (state.search) params.set("search", state.search)
  if (state.type) params.set("type", state.type)
  if (state.status) params.set("status", state.status)

  return params
}

export function useEventsQueryState(): UseEventsQueryStateReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const state = useMemo(() => parseState(searchParams), [searchParams])
  const [searchInput, setSearchInputState] = useState<string>(state.search ?? "")

  const updateState = useCallback(
    (updater: (prev: EventsQueryState) => EventsQueryState) => {
      const currentState = parseState(searchParams)
      const nextState = sanitizeState(updater(currentState))

      const currentQuery = toCanonicalSearchParams(currentState).toString()
      const nextQuery = toCanonicalSearchParams(nextState).toString()
      if (currentQuery === nextQuery) return

      setSearchParams(toCanonicalSearchParams(nextState), { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const setView = useCallback(
    (view: EventView) => {
      updateState((prev) => ({ ...prev, view }))
    },
    [updateState],
  )

  const setDate = useCallback(
    (date: string) => {
      updateState((prev) => ({ ...prev, date }))
    },
    [updateState],
  )

  const setSearch = useCallback(
    (search: string | null) => {
      updateState((prev) => ({ ...prev, search }))
    },
    [updateState],
  )

  const setType = useCallback(
    (type: EventType | null) => {
      updateState((prev) => ({ ...prev, type }))
    },
    [updateState],
  )

  const setStatus = useCallback(
    (status: EventStatus | null) => {
      updateState((prev) => ({ ...prev, status }))
    },
    [updateState],
  )

  const reset = useCallback(() => {
    updateState(() => ({
      view: DEFAULT_VIEW,
      date: getCurrentMonthParam(),
      search: null,
      type: null,
      status: null,
    }))
  }, [updateState])

  const setSearchInput = useCallback((search: string) => {
    setSearchInputState(search)
  }, [])

  const resetSearchAndFilters = useCallback(() => {
      setSearchInput("")
      setSearch(null)
      setType(null)
      setStatus(null)
    }, [setSearch, setSearchInput, setStatus, setType])

  useEffect(() => {
    const canonicalQuery = toCanonicalSearchParams(state).toString()
    const currentQuery = searchParams.toString()
    if (canonicalQuery === currentQuery) return

    setSearchParams(toCanonicalSearchParams(state), { replace: true })
  }, [searchParams, setSearchParams, state])

  useEffect(() => {
    const nextSearchInput = state.search ?? ""
    setSearchInputState((current) =>
      current === nextSearchInput ? current : nextSearchInput,
    )
  }, [state.search])

  useEffect(() => {
    const normalizedInput = normalizeSearch(searchInput)
    if (normalizedInput === state.search) return

    const timer = window.setTimeout(() => {
      setSearch(normalizedInput)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [searchInput, setSearch, state.search])

  return {
    state,
    searchInput,
    setView,
    setDate,
    setSearch,
    setSearchInput,
    resetSearchAndFilters,
    setType,
    setStatus,
    reset,
  }
}
