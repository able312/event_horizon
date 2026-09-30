import type { NewContact } from "../../definitions/contacts.js"
import type { Event, NewEvent } from "../../definitions/database.js"
import type { DbExecutor } from "../db/factory.js"
import { db } from "../db/index.js"
import { createContactsRepository } from "../db/repository/contacts.js"
import { createEventContactsRepository } from "../db/repository/eventContacts.js"
import { createEventsRepository } from "../db/repository/events.js"

export function createEventCreationService(database: DbExecutor) {
  return {
    /**
     * Creates the event and, when a client is given, assigns them as its primary client
     * in the same transaction, so a failed assignment never leaves a client-less event behind.
     * A client whose email matches an active contact is linked to that contact instead of duplicating it.
     */
    create: (newEvent: NewEvent, client?: NewContact | null): Event => {
      return database.transaction((tx) => {
        const event = createEventsRepository(tx).insert(newEvent)
        if (!client) return event

        const existing = client.email ? createContactsRepository(tx).findByEmail(client.email) : null
        const target = existing ? { contactId: existing.id } : { newContact: client }
        createEventContactsRepository(tx).assign(event.id, target, "client", { isPrimary: true })

        return event
      })
    },
  }
}

const eventCreationService = createEventCreationService(db)

export default eventCreationService
