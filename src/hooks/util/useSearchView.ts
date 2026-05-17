import { useMemo } from "react"

import { useDebounceValue } from "~/lib/debounce"

export type ViewParams = {
  query?: string
  tees?: "Red" | "White" | "Blue" | null
  sortBy?: "name" | "handicap" | "tees"
}

export function useSearchView<T extends { fname: string; lname: string }>(
  data: readonly T[] | undefined,
  searchTerm: string,
) {
  const debouncedSearch = useDebounceValue(searchTerm.trim().toLowerCase(), 300)

  const filtered = useMemo((): T[] => {
    if (!data?.length) return []

    if (!debouncedSearch) return data.slice()

    return data.filter((o) =>
      `${o.fname} ${o.lname}`.toLowerCase().includes(debouncedSearch),
    )
  }, [data, debouncedSearch])

  return { parsedList: filtered, total: filtered.length }
}
