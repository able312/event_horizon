import { useState } from "react"
import { Button } from "~/components/atoms/button"
import { Copy, Send, Search, Edit } from "lucide-react"
import { toast } from "sonner"
import { buildGmailComposeUrl, buildGmailSearchUrl } from "~/lib/gmailUrlConstructors"
import { openExternalUrl } from "~/lib/ipc/system"


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

    return (
        <section className="rounded-md border border-border bg-background p-2 shadow-sm">
            <div className="group">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold tracking-wide rounded-lg p-1 px-2 group-hover:bg-stone-100 cursor-pointer" onClick={() => setDetailsOpen(!detailsOpen)}>{client.name}</h3>    
                    {/* Button Group */}
                    <div className="flex items-center gap-1 mt-1">
                        <Button 
                            type="button"
                            variant="outline"
                            className="size-8 rounded-full"
                            onClick={() => handleSendEmail()}
                            disabled={!hasClientEmail}
                        >
                            <Send className="size-4" />
                        </Button>

                        <Button 
                            type="button"
                            variant="outline"
                            className="size-8 rounded-full"
                            onClick={() => handleSearchEmail()}
                            disabled={!hasClientEmail}
                        >
                            <Search className="size-4" />
                        </Button>

                        <Button type="button" variant="outline" className="size-8 rounded-full" disabled>
                            <Copy className="size-4" />
                        </Button>
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
                <Button type="button" variant="ghost" size="sm" className="text-white group-hover:text-primary/50 rounded-full">
                    <Edit className="size-4" />
                </Button>
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
