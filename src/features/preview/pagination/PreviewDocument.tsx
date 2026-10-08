import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"

import { PreviewDataError } from "~/features/preview/components/PreviewDataError"
import { cn } from "~/lib/utils"
import { measureBlockBreaks } from "./measureBlockBreaks"
import { useReportPreviewReadiness } from "./PreviewReadinessContext"
import {
  LETTER_HEIGHT_PX,
  LETTER_WIDTH_PX,
  PAGE_CONTENT_HEIGHT_PX,
  PAGE_CONTENT_WIDTH_PX,
  PAGE_MARGIN_PX,
  packBlocksIntoPages,
  type MeasurableBlockMeta,
  type PackedPage,
} from "./packBlocksIntoPages"

export type PreviewBlockProps = MeasurableBlockMeta & {
  children: ReactNode
  className?: string
}

export function PreviewBlock({ children, className }: PreviewBlockProps) {
  return <div className="flow-root"><div className={cn("flow-root", className)}>{children}</div></div>
}

type PreviewBlockElement = ReactElement<PreviewBlockProps>

function isPreviewBlockElement(node: ReactNode): node is PreviewBlockElement {
  return isValidElement(node) && node.type === PreviewBlock
}

function isFragmentElement(node: ReactNode): node is ReactElement<{ children?: ReactNode }> {
  return isValidElement(node) && node.type === Fragment
}

/**
 * Collect PreviewBlock elements from children, recursing into Fragments and arrays.
 * Components that *return* PreviewBlocks are invisible — blocks must be direct
 * (or Fragment-wrapped) JSX children of PreviewDocument.
 */
function collectBlocks(children: ReactNode): PreviewBlockElement[] {
  const blocks: PreviewBlockElement[] = []

  const visit = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (child == null || child === false) return
      if (isPreviewBlockElement(child)) {
        blocks.push(child)
        return
      }
      if (isFragmentElement(child)) {
        visit(child.props.children)
      }
    })
  }

  visit(children)
  return blocks
}

type PreviewDocumentProps = {
  children: ReactNode
  continuationHeadings?: Record<string, ReactNode>
  className?: string
  dataReady?: boolean
  dataError?: boolean
}

const EMPTY_CONTINUATION_HEADINGS: Record<string, ReactNode> = {}

export function PreviewDocument({
  children,
  continuationHeadings = EMPTY_CONTINUATION_HEADINGS,
  className,
  dataReady = true,
  dataError = false,
}: PreviewDocumentProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  // null until the first measurement; afterwards the last layout stays visible while remeasuring.
  const [pages, setPages] = useState<PackedPage[] | null>(null)
  const [ready, setReady] = useState(false)
  const generationRef = useRef(0)
  const requestedMarkupRef = useRef<string | null>(null)
  useReportPreviewReadiness(ready && dataReady && !dataError)

  const blocks = useMemo(() => collectBlocks(children), [children])
  const blockSignature = useMemo(
    () => JSON.stringify(blocks.map(({ props }) => [props.id, props.breakBefore, props.keepTogether, props.continuationKey, props.className])),
    [blocks],
  )
  const continuationKeySignature = Object.keys(continuationHeadings).sort().join("|")
  const continuationKeys = useMemo(
    () => (continuationKeySignature.length > 0 ? continuationKeySignature.split("|") : []),
    [continuationKeySignature],
  )

  const blockById = useMemo(() => {
    const map = new Map<string, PreviewBlockElement>()
    for (const block of blocks) {
      map.set(block.props.id, block)
    }
    return map
  }, [blocks])

  // Keep latest block map in a ref so remeasure identity stays stable.
  const blockByIdRef = useRef(blockById)
  blockByIdRef.current = blockById

  const remeasure = useCallback(async () => {
    const generation = ++generationRef.current
    const root = measureRef.current
    // print:hidden collapses the measure root's width; an empty document still has width.
    if (!root || root.getBoundingClientRect().width === 0) return
    setReady(false)

    if (typeof document !== "undefined" && "fonts" in document) {
      try {
        await document.fonts.ready
      } catch {
        // Ignore font loading failures and measure with fallbacks.
      }
    }

    // Allow layout to settle after fonts.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })

    if (generation !== generationRef.current) return

    // Never feed the packer zeros while a print dialog is open.
    if (root.getBoundingClientRect().width === 0) return

    const headingHeights: Record<string, number> = {}
    root.querySelectorAll<HTMLElement>("[data-preview-continuation-key]").forEach((node) => {
      const key = node.dataset.previewContinuationKey
      if (!key) return
      headingHeights[key] = node.getBoundingClientRect().height
    })

    const latestBlockById = blockByIdRef.current
    const measuredNodes = root.querySelectorAll<HTMLElement>("[data-preview-block-id]")
    const measured = Array.from(measuredNodes)
      .map((node) => {
        const id = node.dataset.previewBlockId ?? ""
        const source = latestBlockById.get(id)
        return {
          id,
          height: node.getBoundingClientRect().height,
          breakOffsets: measureBlockBreaks(node, PAGE_CONTENT_HEIGHT_PX - (headingHeights[source?.props.continuationKey ?? ""] ?? 0)),
          breakBefore: source?.props.breakBefore,
          keepTogether: source?.props.keepTogether,
          continuationKey: source?.props.continuationKey,
        }
      })
      .filter((entry) => entry.id.length > 0)

    if (generation !== generationRef.current) return

    const packed = packBlocksIntoPages(measured, {
      contentHeightPx: PAGE_CONTENT_HEIGHT_PX,
      continuationHeadingHeights: headingHeights,
    })

    if (import.meta.env.DEV) {
      for (const page of packed) {
        for (const [id, fragment] of Object.entries(page.fragments ?? {})) {
          if (!fragment.endsMidLine) continue
          console.warn(
            `[PreviewDocument] Block "${id}" has no safe break within a page, ` +
              `so it is cut mid-line at ${Math.round(fragment.offset + fragment.height)}px.`,
          )
        }
      }
    }

    setPages(packed)
    setReady(true)
  }, [])

  // Parents pass fresh children and heading objects on every render, so compare
  // the measured markup itself and only remeasure when it actually changed.
  useLayoutEffect(() => {
    const markup = measureRef.current?.innerHTML ?? null
    if (markup === requestedMarkupRef.current) return
    requestedMarkupRef.current = markup
    setReady(false)
    void remeasure()
  }, [blocks, continuationHeadings, remeasure])

  useEffect(() => () => {
    generationRef.current += 1
    requestedMarkupRef.current = null
  }, [])

  useEffect(() => {
    const root = measureRef.current
    if (!root || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => { void remeasure() })
    observer.observe(root)
    // Observe individual blocks too: two changes can cancel out in the root height.
    root.querySelectorAll<HTMLElement>("[data-preview-block-id], [data-preview-continuation-key]")
      .forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [blockSignature, continuationKeySignature, remeasure])

  return (
    <div className={cn("preview-document", className)} data-preview-ready={ready && dataReady && !dataError}>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[99999px] top-0 opacity-0 print:hidden"
        style={{ width: PAGE_CONTENT_WIDTH_PX }}
      >
        <div ref={measureRef} className="flex flex-col">
          {continuationKeys.map((key) => (
            <div key={`measure-cont-${key}`} data-preview-continuation-key={key} className="flow-root">
              <div className="flow-root mb-2">{continuationHeadings[key]}</div>
            </div>
          ))}
          {blocks.map((block) => (
            <div key={`measure-${block.props.id}`} data-preview-block-id={block.props.id}>
              <PreviewBlock {...block.props} />
            </div>
          ))}
        </div>
      </div>

      {dataError ? (
        <PreviewDataError />
      ) : !dataReady ? (
        <p className="p-8 text-sm text-muted-foreground">Loading event details…</p>
      ) : pages === null ? (
        <div
          className="preview-page mx-auto bg-white shadow-[0_4px_32px_rgba(0,0,0,0.18)] print:shadow-none"
          style={{
            width: LETTER_WIDTH_PX,
            minHeight: LETTER_HEIGHT_PX,
            padding: PAGE_MARGIN_PX,
          }}
        >
          <p className="text-sm text-muted-foreground">Preparing pages…</p>
        </div>
      ) : pages.length === 0 ? (
        <div
          className="preview-page mx-auto bg-white shadow-[0_4px_32px_rgba(0,0,0,0.18)] print:shadow-none"
          style={{
            width: LETTER_WIDTH_PX,
            minHeight: LETTER_HEIGHT_PX,
            padding: PAGE_MARGIN_PX,
          }}
        >
          <p className="text-sm text-muted-foreground">Nothing to preview.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-8 print:block print:gap-0">
          {pages.map((page, pageIndex) => (
            <div
              key={`page-${pageIndex}`}
              className={cn(
                "preview-page relative bg-white shadow-[0_4px_32px_rgba(0,0,0,0.18)]",
                "print:shadow-none print:break-after-page",
                pageIndex === pages.length - 1 ? "print:break-after-auto" : null,
              )}
              style={{
                width: LETTER_WIDTH_PX,
                minHeight: LETTER_HEIGHT_PX,
                padding: PAGE_MARGIN_PX,
              }}
            >
              <div
                className="flex flex-col"
                style={{
                  width: PAGE_CONTENT_WIDTH_PX,
                  height: PAGE_CONTENT_HEIGHT_PX,
                }}
              >
                {page.continuationKeys.map((key) => (
                  <div key={`cont-${pageIndex}-${key}`} className="flow-root shrink-0">
                    <div className="flow-root mb-2">{continuationHeadings[key] ?? null}</div>
                  </div>
                ))}
                {page.blockIds.map((id) => {
                  const block = blockById.get(id)
                  if (!block) return null
                  const fragment = page.fragments?.[id]
                  return (
                    <div
                      key={`${pageIndex}-${id}`}
                      className="flow-root shrink-0 break-inside-avoid"
                      style={fragment ? { height: fragment.height, overflow: "hidden" } : undefined}
                      data-preview-fragment={fragment ? id : undefined}
                      data-preview-offset={fragment?.offset}
                    >
                      <div style={fragment ? { transform: `translateY(-${fragment.offset}px)` } : undefined}>
                        <PreviewBlock {...block.props} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
