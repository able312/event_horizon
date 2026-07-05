import { useState } from "react"
import { Button } from "~/components/atoms/button"
import { Copy, ChevronDown, Send, Search, Edit } from "lucide-react"


interface ClientDetailsCardProps {
    client: {
        name: string
        email: string
        phone: string
    }
}

export const ClientDetailsCard: React.FC<ClientDetailsCardProps> = ({client}) => {

    const [detailsOpen, setDetailsOpen] = useState(false)

    return (
        <section className="rounded-md border border-border bg-background p-2 shadow-sm group">
            <div className="">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-wide rounded-lg p-1 px-2 group-hover:bg-stone-200 cursor-pointer" onClick={() => setDetailsOpen(!detailsOpen)}>{client.name}</h3>    
                    {/* Button Group */}
                    <div className="flex items-center gap-1 mt-1">
                        <Button type="button" variant="outline" className="size-8 rounded-full">
                            <Send className="size-4" />
                        </Button>

                        <Button type="button" variant="outline" className="size-8 rounded-full">
                            <Search className="size-4" />
                        </Button>

                        <Button type="button" variant="outline" className="size-8 rounded-full">
                            <Copy className="size-4" />
                        </Button>
                    </div>
                  
                </div>
               

            </div>
        
            <div className={
                `space-y-3 overflow-hidden transition-all duration-300
                ${detailsOpen ? "h-36 py-3" : "h-0 py-0"}`
            }>
                <ClientField label="Email" value="jordan.macdonald@example.com" />
                <ClientField label="Phone" value="(902) 555-0142" />
                <Button type="button" variant="outline" size="sm" className="mt-1">
                    Edit <Edit className="size-4" />
                </Button>
            </div>
                
        </section>
    )
}
  
  interface ClientFieldProps {
    label: string
    value: string
  }
  
  const ClientField: React.FC<ClientFieldProps> = ({ label, value }) => (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )