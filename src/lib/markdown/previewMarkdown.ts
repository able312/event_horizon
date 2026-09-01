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
  const normalized = source.replace(/\r\n/g, "\n")

  if (!normalized.trim()) {
    return []
  }

  const rawBlocks = normalized.split(/\n{2,}/)
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
  const blocks: PreviewMarkdownBlock[] = []
  let paragraphLines: string[] = []
  let listBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return
    }

    blocks.push({
      type: "paragraph",
      lines: paragraphLines.map((line) => parseInlines(line)),
    })
    paragraphLines = []
  }

  const flushList = () => {
    if (listBuffer.length === 0) {
      return
    }

    blocks.push(parseListBlock(listBuffer))
    listBuffer = []
  }

  for (const line of lines) {
    if (HORIZONTAL_RULE.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ type: "hr" })
      continue
    }

    const heading = parseHeadingLine(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push(heading)
      continue
    }

    if (isListLine(line)) {
      flushParagraph()
      listBuffer.push(line)
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()

  return blocks
}

function parseHeadingLine(line: string): PreviewMarkdownBlock | null {
  // Treat ###+ as plain text so ### Section is not h2 with a leading "# ".
  if (/^#{3,}/.test(line)) {
    return null
  }

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

function isListLine(line: string): boolean {
  return UNORDERED_LIST.test(line) || ORDERED_LIST.test(line)
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

function isNonSpace(char: string | undefined): boolean {
  return char !== undefined && char !== " " && char !== "\t"
}

function findClosingMarker(
  text: string,
  openIndex: number,
  marker: string,
): number {
  const contentStart = openIndex + marker.length
  let searchFrom = contentStart

  while (searchFrom < text.length) {
    const end = text.indexOf(marker, searchFrom)
    if (end === -1) {
      return -1
    }

    // Empty emphasis (e.g. ****) — skip; do not treat as a match.
    if (end === contentStart) {
      searchFrom = end + marker.length
      continue
    }

    const charBeforeClose = text[end - 1]
    if (isNonSpace(charBeforeClose)) {
      return end
    }

    searchFrom = end + marker.length
  }

  return -1
}

export function parseInlines(text: string): InlineSpan[] {
  const spans: InlineSpan[] = []
  let index = 0

  while (index < text.length) {
    if (text.startsWith("***", index)) {
      if (isNonSpace(text[index + 3])) {
        const end = findClosingMarker(text, index, "***")
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

      // Cannot open *** (or unmatched) — fall through to ** / * handling.
    }

    if (text.startsWith("**", index)) {
      if (isNonSpace(text[index + 2])) {
        const end = findClosingMarker(text, index, "**")
        if (end !== -1) {
          spans.push({
            text: text.slice(index + 2, end),
            bold: true,
          })
          index = end + 2
          continue
        }
      }

      spans.push({ text: "**" })
      index += 2
      continue
    }

    if (text[index] === "*") {
      if (isNonSpace(text[index + 1])) {
        const end = findClosingMarker(text, index, "*")
        if (end !== -1) {
          spans.push({
            text: text.slice(index + 1, end),
            italic: true,
          })
          index = end + 1
          continue
        }
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
