interface ClientDetailsPlainItem {
    name: string,
    email: string,
    phone: string,
    eventTitle: string,
}

export default function formatClientDetailsPlainText (data: ClientDetailsPlainItem): string | null {
    if (!data.name || !data.eventTitle) return null

    const lines = [`${data.eventTitle} Main Contact`]
    lines.push(`Name: ${data.name}`)
    if (data.email.length > 0) lines.push(`Email: ${data.email}`)
    if (data.phone.length > 0) lines.push(`Phone: ${data.phone}`)

    return lines.join("\n")
}