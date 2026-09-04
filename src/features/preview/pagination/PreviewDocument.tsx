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

import { cn } from "~/lib/utils"
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
  return <div className={cn(className)}>{children}</div>
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
}

export function PreviewDocument({
  children,
  continuationHeadings = {},
  className,
}: PreviewDocumentProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PackedPage[]>([])
  const [ready, setReady] = useState(false)
  const generationRef = useRef(0)
  const previousSignatureRef = useRef<string | null>(null)

  const blocks = useMemo(() => collectBlocks(children), [children])
  const blockSignature = useMemo(
    () => blocks.map((block) => block.props.id).join("|"),
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
    if (!root) return

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

    // Skip when print:hidden collapses the measure root to 0 height so we
    // never feed the packer zeros while a print dialog is open.
    if (root.getBoundingClientRect().height === 0) return

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
          breakBefore: source?.props.breakBefore,
          keepTogether: source?.props.keepTogether,
          continuationKey: source?.props.continuationKey,
        }
      })
      .filter((entry) => entry.id.length > 0)

    if (generation !== generationRef.current) return

    if (import.meta.env.DEV) {
      for (const entry of measured) {
        if (entry.height > PAGE_CONTENT_HEIGHT_PX) {
          console.warn(
            `[PreviewDocument] Block "${entry.id}" is ${Math.round(entry.height)}px tall ` +
              `(page content is ${PAGE_CONTENT_HEIGHT_PX}px). It will sit alone and may clip.`,
          )
        }
      }
    }

    setPages(
      packBlocksIntoPages(measured, {
        contentHeightPx: PAGE_CONTENT_HEIGHT_PX,
        continuationHeadingHeights: headingHeights,
      }),
    )
    setReady(true)
  }, [])

  useLayoutEffect(() => {
    const signatureChanged = previousSignatureRef.current !== blockSignature
    previousSignatureRef.current = blockSignature

    // Only hide pages when the set of block ids changes (structure change).
    // Content-only remeasures keep the previous pages visible to avoid flash.
    if (signatureChanged) {
      setReady(false)
    }
    void remeasure()
  }, [blockSignature, remeasure])

  useEffect(() => {
    const root = measureRef.current
    if (!root || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(() => {
      void remeasure()
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [remeasure])

  return (
    <div className={cn("preview-document", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[99999px] top-0 opacity-0 print:hidden"
        style={{ width: PAGE_CONTENT_WIDTH_PX }}
      >
        <div ref={measureRef} className="flex flex-col">
          {continuationKeys.map((key) => (
            <div key={`measure-cont-${key}`} data-preview-continuation-key={key} className="mb-2">
              {continuationHeadings[key]}
            </div>
          ))}
          {blocks.map((block) => (
            <div key={`measure-${block.props.id}`} data-preview-block-id={block.props.id}>
              {block.props.children}
            </div>
          ))}
        </div>
      </div>

      {!ready ? (
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
                className="flex flex-col overflow-hidden"
                style={{
                  width: PAGE_CONTENT_WIDTH_PX,
                  height: PAGE_CONTENT_HEIGHT_PX,
                }}
              >
                {page.continuationKeys.map((key) => (
                  <div key={`cont-${pageIndex}-${key}`} className="mb-2">
                    {continuationHeadings[key] ?? null}
                  </div>
                ))}
                {page.blockIds.map((id) => {
                  const block = blockById.get(id)
                  if (!block) return null
                  return (
                    <div
                      key={`${pageIndex}-${id}`}
                      className={cn(
                        block.props.className,
                        block.props.keepTogether ? "break-inside-avoid" : undefined,
                      )}
                    >
                      {block.props.children}
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
