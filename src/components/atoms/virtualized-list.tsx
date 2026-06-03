import React, { useRef, useState, useEffect, useCallback } from "react"

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  containerHeight: number
  overscanCount?: number
}

export function VirtualizedList<T>({
    items,
    renderItem,
    itemHeight,
    containerHeight,
    overscanCount = 5,
}: VirtualizedListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [scrollTop, setScrollTop] = useState(0)

    const totalHeight = items.length * itemHeight
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscanCount)
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscanCount)
    const visibleItems = items.slice(startIndex, endIndex)

    const handleScroll = useCallback(() => {
        if (containerRef.current) {
            setScrollTop(containerRef.current.scrollTop)
        }
    }, [])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        el.addEventListener("scroll", handleScroll)
        return () => el.removeEventListener("scroll", handleScroll)
    }, [handleScroll])

    return (
        <div
            ref={containerRef}
            className="overflow-y-auto relative z-0 pt-12"
            style={{ height: containerHeight }}
        >
            <div style={{ height: totalHeight, position: "relative" }}>
                {visibleItems.map((item, index) => {
                    const itemIndex = startIndex + index
                    const top = itemIndex * itemHeight
                    return (
                        <div
                            key={`virtualizedList_${index}`}
                            style={{
                                position: "absolute",
                                top,
                                height: itemHeight,
                                left: 0,
                                right: 0,
                            }}
                        >
                            {renderItem(item, itemIndex)}
                        </div>
                    )
                })}
            </div>
        </div>
    )

}