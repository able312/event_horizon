const GMAIL_COMPOSE_URL = "https://mail.google.com/mail/u/0/"

function cleanText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function buildGmailComposeUrl(to: string, subject: string, body?: string): string {
  const recipient = cleanText(to)
  if (!recipient) {
    throw new Error("Recipient email is required")
  }

  const subjectLine = cleanText(subject)
  if (!subjectLine) {
    throw new Error("Subject is required")
  }

  const url = new URL(GMAIL_COMPOSE_URL)
  url.searchParams.set("view", "cm")
  url.searchParams.set("fs", "1")
  url.searchParams.set("to", recipient)
  url.searchParams.set("su", subjectLine)
  if (body) {
    url.searchParams.set("body", body)
  }
  return url.toString()
}

export function buildGmailSearchUrl(emailAddress: string): string {
  const url = new URL(GMAIL_COMPOSE_URL)
  // This constructs a URL like: https://mail.google.com/mail/u/0/#search/email@example.com
  url.hash = `search/${emailAddress}`
  return url.toString()
}