import { useState } from "react"
import { Button } from "~/components/atoms/button"
import { Copy, Search, Edit, Mail } from "lucide-react"
import { toast } from "sonner"
import { buildGmailComposeUrl, buildGmailSearchUrl } from "~/lib/gmailUrlConstructors"
import { openExternalUrl } from "~/lib/ipc/system"
import formatClientDetailsPlainText from "../lib/formatClientDetailsPlainText"
import { Input } from "~/components/atoms/input"


interface ClientDetailsCardProps {
    client: {
        name: string
        email: string
        phone: string
    }
    eventTitle: string
}

export const ClientDetailsCard: React.FC<ClientDetailsCardProps> = ({ client, eventTitle }) => {

    const [detailsOpen, setDetailsOpen] = useState(false)
    const hasClientEmail = Boolean(client.email && client.email !== "-")

    const handleSendEmail = async () => {
        if (!hasClientEmail) {
            toast.error("No client email on file")
            return
        }
        try {
            await openExternalUrl(buildGmailComposeUrl(client.email, `Attn: ${eventTitle}`))
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to open Gmail"
            toast.error(message)
        }
    }

    const handleSearchEmail = async () => {
        if (!hasClientEmail) {
            toast.error("No client email on file")
            return
        }
        try {
            await openExternalUrl(buildGmailSearchUrl(client.email))
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to open Gmail"
            toast.error(message)
        }
    }

    const handleCopyAll = async () => {
        const text = formatClientDetailsPlainText({
            name: client.name,
            email: client.email,
            phone: client.phone,
            eventTitle,
        })

        if (!text) {
            toast.error("Not enough client information available to share.")
            return
        }

        try {
            await navigator.clipboard.writeText(text)
            toast.success("Client details copied to clipboard")
        } catch {
            toast.error("Failed to copy client details")
        }
    }

    return (
        <section className="py-2 px-6 border-b last-of-type:border-none">
          <div className="group">
            <div className="flex items-center justify-between">
              <div className="flex justify-content items-center gap-3 pr-2">
                <Input type="checkbox" className="w-fit size-4" />
                <div className="rounded-full bg-blue-200 text-blue-900 text-xs tracking-tighter font-bold px-2 py-2">CL</div>
              </div>
              <div className="flex justify-between items-center w-full">
                <div className="p-1">
                  <h3 className="text-md font-semibold tracking-wide group-hover:underline cursor-pointer" onClick={() => setDetailsOpen(!detailsOpen)}>{client.name}</h3>
                  <p className="text-xs">Client Title</p>
                </div>
                {/* Button Group */}
                <div className="flex items-center gap-1 mt-1">
                    <Button
                        type="button"
                        variant="ghost"
                        className="size-8 rounded-full"
                        onClick={() => handleSendEmail()}
                        disabled={!hasClientEmail}
                    >
                        <Mail className="size-4" />
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        className="size-8 rounded-full"
                        onClick={() => handleSearchEmail()}
                        disabled={!hasClientEmail}
                    >
                        <Search className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className={
                `overflow-hidden transition-height duration-300 flex justify-between group
                ${detailsOpen ? "h-36 py-3 border-t border-border mt-2" : "h-0 py-0"}`
            }>
            <div className="space-y-3 ">
              <ClientField label="Email" value={client.email} />
              <ClientField label="Phone" value={client.phone} />
            </div>
            <div className="text-white group-hover:text-primary/50">
                <Button type="button" variant="ghost" size="sm" className="rounded-full size-8">
                  <Edit className="size-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    className="size-8 rounded-full"
                    aria-label="Copy client details"
                    onClick={() => void handleCopyAll()}
                    disabled={ !client.name || !eventTitle}
                >
                    <Copy className="size-4" />
              </Button>
            </div>

          </div>

        </section>
    )
}

  interface ClientFieldProps {
    label: string
    value: string
  }

  const ClientField: React.FC<ClientFieldProps> = ({ label, value }) => {

    const handleCopy = () => {
        navigator.clipboard.writeText(value)
        toast.success(value + " copied to clipboard")
    }

    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <div className="flex items-center gap-1">
                <p className="text-sm font-medium">{value}</p>
                <Button
                    type="button"
                    variant="ghost"
                    className="hover:bg-white hover:text-orange-500"
                    onClick={ handleCopy }
                    disabled={!value}
                >
                    <Copy className="size-3.5 pt-0 m-0" />
                </Button>
            </div>
        </div>
    )
  }
