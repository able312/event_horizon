/**
 * EventClientsList Component
 * 
 * Displays a list of clients associated with an event.
 * Each client can be expanded to show contact details (email, phone).
 * 
 * Features:
 * - Header showing client count
 * - Expandable client items showing contact info when clicked
 * - Primary contact indicator
 * 
 * Location: src/components/event-detail/EventClientsList.tsx
 */

import React, { useState } from "react"
import { Users, ChevronDown } from "lucide-react"
import { useEvent } from "~/hooks/useEvent"

interface Client {
  name: string
  email: string
  phone: string
  isPrimary: boolean
}

const EventClientsList = () => {
  // Track which client is currently expanded to show details

  const { data } = useEvent()

  const clients = [{
    name: data?.clientName ?? "",
    email: data?.clientEmail ?? "",
    phone: data?.clientPhone ?? "",
    isPrimary: true
  }]

  const [expandedClient, setExpandedClient] = useState<number | null>(null)

  return (
    /**
     * Clients List Container
     * - Border and rounded corners for card styling
     * - Header with title
     * - Scrollable list of clients below
     */
    <div className="border rounded-lg overflow-hidden">
      {/* Header Section */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-50">
        <h3 className="font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Clients ({clients.length})
        </h3>
      </div>

      {/* Client List - Vertical dividers between items */}
      <div className="divide-y">
        {clients.map((client, index) => (
          <ClientListItem
            key={index}
            client={client}
            isExpanded={expandedClient === index}
            onToggle={() => setExpandedClient(expandedClient === index ? null : index)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual Client Item Component
 * - Displays client name and primary indicator
 * - Click to expand/collapse contact details
 */
interface ClientListItemProps {
  client: Client
  isExpanded: boolean
  onToggle: () => void
}

const ClientListItem: React.FC<ClientListItemProps> = ({ 
  client, 
  isExpanded, 
  onToggle 
}) => {
  return (
    <div>
      {/* Client row - clickable to expand/collapse */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors"
      >
        {/* Client avatar and name */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
            <Users className="h-4 w-4 text-stone-500" />
          </div>
          <div className="text-left">
            <p className="font-medium">{client.name}</p>
            {client.isPrimary && (
              <span className="text-xs text-primary">Primary Contact</span>
            )}
          </div>
        </div>

        {/* Expand/collapse chevron icon */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {/* Expanded content - contact details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 bg-stone-50">
          <div className="grid grid-cols-2 gap-2 ml-10">
            {/* Email */}
            <div className="flex items-center gap-2">
              <svg className="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href={`mailto:${client.email}`} className="text-xs text-primary hover:underline">
                {client.email}
              </a>
            </div>
            {/* Phone */}
            <div className="flex items-center gap-2">
              <svg className="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href={`tel:${client.phone}`} className="text-xs text-primary hover:underline">
                {client.phone}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventClientsList
