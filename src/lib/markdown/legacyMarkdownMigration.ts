/**
 * Rewrites legacy inverted heading prefixes to real markdown.
 * Old syntax: `## ` = primary heading, `# ` = secondary heading.
 * New syntax: `# ` = h1, `## ` = h2.
 */
export function migrateLegacyHeadingSyntax(source: string): string {
  if (!source) {
    return source
  }

  return source
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) {
        return `# ${line.slice(3)}`
      }

      if (line.startsWith("# ")) {
        return `## ${line.slice(2)}`
      }

      return line
    })
    .join("\n")
}

export function hasLegacyHeadingSyntax(source: string): boolean {
  if (!source) {
    return false
  }

  return source
    .split("\n")
    .some((line) => line.startsWith("## ") || line.startsWith("# "))
}
