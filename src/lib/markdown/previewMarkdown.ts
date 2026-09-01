export type InlineSpan = {
  text: string
  bold?: boolean
  italic?: boolean
}

export type PreviewMarkdownBlock =
  | { type: "heading"; level: 1 | 2; inlines: InlineSpan[] }
  | { type: "paragraph"; lines: InlineSpan[][] }
  | { type: "list"; ordered: boolean; items: InlineSpan[][] }
  | { type: "hr" }

const HEADING_LEVEL_1 = /^# (.+)$/
const HEADING_LEVEL_2 = /^## (.+)$/
const UNORDERED_LIST = /^[*-] (.+)$/
const ORDERED_LIST = /^\d+\. (.+)$/
const HORIZONTAL_RULE = /^(?:---|\*\*\*)$/

export function parsePreviewMarkdown(source: string): PreviewMarkdownBlock[] {
  if (!source.trim()) {
    return []
  }

  const rawBlocks = source.split(/\n{2,}/)
  const blocks: PreviewMarkdownBlock[] = []

  for (const rawBlock of rawBlocks) {
    blocks.push(...parseBlock(rawBlock))
  }

  return blocks
}

function parseBlock(rawBlock: string): PreviewMarkdownBlock[] {
  const trimmed = rawBlock.trim()
  if (!trimmed) {
    return []
  }

  const lines = trimmed.split("\n")

  if (lines.length === 1) {
    if (HORIZONTAL_RULE.test(lines[0] ?? "")) {
      return [{ type: "hr" }]
    }

    const heading = parseHeadingLine(lines[0] ?? "")
    if (heading) {
      return [heading]
    }
  }

  if (lines.length > 1) {
    const firstHeading = parseHeadingLine(lines[0] ?? "")
    if (firstHeading) {
      const remainder = lines.slice(1).join("\n").trim()
      if (!remainder) {
        return [firstHeading]
      }

      return [firstHeading, ...parseBlock(remainder)]
    }
  }

  if (isListBlock(lines)) {
    return [parseListBlock(lines)]
  }

  return [{
    type: "paragraph",
    lines: lines.map((line) => parseInlines(line)),
  }]
}

function parseHeadingLine(line: string): PreviewMarkdownBlock | null {
  const level2Match = line.match(HEADING_LEVEL_2)
  if (level2Match) {
    return {
      type: "heading",
      level: 2,
      inlines: parseInlines(level2Match[1] ?? ""),
    }
  }

  const level1Match = line.match(HEADING_LEVEL_1)
  if (level1Match) {
    return {
      type: "heading",
      level: 1,
      inlines: parseInlines(level1Match[1] ?? ""),
    }
  }

  return null
}

function isListBlock(lines: string[]): boolean {
  return lines.every((line) => UNORDERED_LIST.test(line) || ORDERED_LIST.test(line))
}

function parseListBlock(lines: string[]): PreviewMarkdownBlock {
  const firstLine = lines[0] ?? ""
  const ordered = ORDERED_LIST.test(firstLine)

  const items = lines.map((line) => {
    const unorderedMatch = line.match(UNORDERED_LIST)
    if (unorderedMatch) {
      return parseInlines(unorderedMatch[1] ?? "")
    }

    const orderedMatch = line.match(ORDERED_LIST)
    return parseInlines(orderedMatch?.[1] ?? line)
  })

  return { type: "list", ordered, items }
}

export function parseInlines(text: string): InlineSpan[] {
  const spans: InlineSpan[] = []
  let index = 0

  while (index < text.length) {
    if (text.startsWith("***", index)) {
      const end = text.indexOf("***", index + 3)
      if (end !== -1) {
        spans.push({
          text: text.slice(index + 3, end),
          bold: true,
          italic: true,
        })
        index = end + 3
        continue
      }
    }

    if (text.startsWith("**", index)) {
      const end = text.indexOf("**", index + 2)
      if (end !== -1) {
        spans.push({
          text: text.slice(index + 2, end),
          bold: true,
        })
        index = end + 2
        continue
      }

      spans.push({ text: "**" })
      index += 2
      continue
    }

    if (text[index] === "*") {
      const end = text.indexOf("*", index + 1)
      if (end !== -1) {
        spans.push({
          text: text.slice(index + 1, end),
          italic: true,
        })
        index = end + 1
        continue
      }

      spans.push({ text: "*" })
      index += 1
      continue
    }

    const nextMarkers = [
      text.indexOf("***", index),
      text.indexOf("**", index),
      text.indexOf("*", index),
    ].filter((markerIndex) => markerIndex !== -1)

    const nextMarker = nextMarkers.length > 0 ? Math.min(...nextMarkers) : text.length
    spans.push({ text: text.slice(index, nextMarker) })
    index = nextMarker
  }

  return spans.length > 0 ? spans : [{ text: "" }]
}
