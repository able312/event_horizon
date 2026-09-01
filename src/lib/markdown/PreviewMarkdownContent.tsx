import type { InlineSpan, PreviewMarkdownBlock } from "./previewMarkdown"
import { parsePreviewMarkdown } from "./previewMarkdown"

type PreviewMarkdownContentProps = {
  source: string
}

export function PreviewMarkdownContent({ source }: PreviewMarkdownContentProps) {
  const blocks = parsePreviewMarkdown(source)

  if (blocks.length === 0) {
    return null
  }

  return (
    <div className="preview-markdown">
      {blocks.map((block, index) => (
        <PreviewMarkdownBlockView key={index} block={block} />
      ))}
    </div>
  )
}

type PreviewMarkdownBlockViewProps = {
  block: PreviewMarkdownBlock
}

function PreviewMarkdownBlockView({ block }: PreviewMarkdownBlockViewProps) {
  switch (block.type) {
    case "heading":
      if (block.level === 1) {
        return (
          <p className="text-sm font-bold uppercase tracking-wide text-stone-800 mt-2 mb-1">
            <InlineSpans spans={block.inlines} />
          </p>
        )
      }

      return (
        <p className="text-xs font-bold text-stone-600 mt-2 mb-1">
          <InlineSpans spans={block.inlines} />
        </p>
      )

    case "paragraph":
      return (
        <p className="text-xs font-sans text-stone-700 mb-1">
          {block.lines.map((line, lineIndex) => (
            <span key={lineIndex}>
              {lineIndex > 0 ? <br /> : null}
              <InlineSpans spans={line} />
            </span>
          ))}
        </p>
      )

    case "list":
      if (block.ordered) {
        return (
          <ol className="list-decimal pl-4 text-xs text-stone-700 mb-1">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <InlineSpans spans={item} />
              </li>
            ))}
          </ol>
        )
      }

      return (
        <ul className="list-disc pl-4 text-xs text-stone-700 mb-1">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <InlineSpans spans={item} />
            </li>
          ))}
        </ul>
      )

    case "hr":
      return <hr className="border-t border-stone-300 my-2" />
  }
}

type InlineSpansProps = {
  spans: InlineSpan[]
}

function InlineSpans({ spans }: InlineSpansProps) {
  return (
    <>
      {spans.map((span, index) => {
        if (span.bold && span.italic) {
          return (
            <strong key={index} className="font-bold italic">
              {span.text}
            </strong>
          )
        }

        if (span.bold) {
          return (
            <strong key={index} className="font-bold">
              {span.text}
            </strong>
          )
        }

        if (span.italic) {
          return (
            <em key={index} className="italic">
              {span.text}
            </em>
          )
        }

        return <span key={index}>{span.text}</span>
      })}
    </>
  )
}
