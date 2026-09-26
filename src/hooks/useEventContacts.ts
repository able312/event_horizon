import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type {
  AssignContactTarget,
  AssignEventContactOptions,
  ContactRoleType,
  EventContactsPanel,
  UpdateContact,
  UpdateEventContact,
} from "~/definitions/contacts"
import { getContactsErrorMessage } from "~/features/contacts/lib/eventContactsPanel"
import * as contactsApi from "~/lib/ipc/contacts"
import * as eventContactsApi from "~/lib/ipc/eventContacts"
import * as vendorCategoriesApi from "~/lib/ipc/vendorCategories"

const CONTACT_SEARCH_LIMIT = 20

export const eventContactsQueryKey = (eventId: string) => ["event-contacts", eventId] as const
const contactsRootKey = ["contacts"] as const

export type AssignEventContactVariables = {
  target: AssignContactTarget
  role: ContactRoleType
  opts?: AssignEventContactOptions
}

export type SaveEventContactVariables = {
  contactId: string
  eventContactId: string
  contact: UpdateContact
  assignment: UpdateEventContact
}

/** Removes one assignment from the cached panel, for optimistic updates. */
function withoutEventContact(panel: EventContactsPanel, eventContactId: string): EventContactsPanel {
  return {
    ...panel,
    groups: panel.groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.eventContactId !== eventContactId),
    })),
  }
}

export function useEventContacts(eventId: string) {
  const queryClient = useQueryClient()
  const queryKey = eventContactsQueryKey(eventId)

  const query = useQuery({
    queryKey,
    enabled: Boolean(eventId),
    queryFn: () => eventContactsApi.getEventContactsPanel(eventId),
  })

  const invalidatePanel = () => {
    void queryClient.invalidateQueries({ queryKey })
  }

  // Assigning/saving can create or change a contact, which changes directory search and by-id results
  const invalidateDirectory = () => {
    void queryClient.invalidateQueries({ queryKey: contactsRootKey })
  }

  /** Errors are left to the caller so the add dialog can react to EmailTaken inline. */
  const assignMutation = useMutation({
    mutationFn: ({ target, role, opts }: AssignEventContactVariables) =>
      eventContactsApi.assignEventContact(eventId, target, role, opts),
    onSettled: () => {
      invalidatePanel()
      invalidateDirectory()
    },
  })

  /** Saves the contact's own details, then the event-specific assignment fields. */
  const saveMutation = useMutation({
    mutationFn: async ({ contactId, eventContactId, contact, assignment }: SaveEventContactVariables) => {
      await contactsApi.updateContact(contactId, contact)
      await eventContactsApi.updateEventContact(eventContactId, assignment)
    },
    onSettled: () => {
      invalidatePanel()
      invalidateDirectory()
    },
  })

  const setPrimaryMutation = useMutation({
    mutationFn: (eventContactId: string) => eventContactsApi.setPrimaryEventContact(eventContactId),
    onError: (err) => {
      toast.error(getContactsErrorMessage(err, "Failed to set primary contact"))
    },
    onSettled: invalidatePanel,
  })

  const removeMutation = useMutation({
    mutationFn: (eventContactId: string) => eventContactsApi.removeEventContact(eventContactId),
    onMutate: async (eventContactId) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<EventContactsPanel>(queryKey)
      if (previous) {
        queryClient.setQueryData<EventContactsPanel>(queryKey, withoutEventContact(previous, eventContactId))
      }
      return { previous }
    },
    onError: (err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      toast.error(getContactsErrorMessage(err, "Failed to remove contact"))
    },
    onSettled: invalidatePanel,
  })

  return {
    ...query,
    assignContactAsync: assignMutation.mutateAsync,
    isAssigning: assignMutation.isPending,
    saveContactAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    setPrimary: setPrimaryMutation.mutate,
    removeContact: removeMutation.mutate,
  }
}

/** Directory search for the add-contact dialog. Keeps the last results visible while typing. */
export function useContactSearch(query: string, enabled: boolean) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: [...contactsRootKey, "search", trimmed],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => contactsApi.searchContacts({ query: trimmed, limit: CONTACT_SEARCH_LIMIT }),
  })
}

export function useContact(contactId: string | null) {
  return useQuery({
    queryKey: [...contactsRootKey, "by-id", contactId],
    enabled: Boolean(contactId),
    queryFn: () => contactsApi.getContactById(contactId!),
  })
}

export function useVendorCategories() {
  return useQuery({
    queryKey: ["vendor-categories"],
    queryFn: () => vendorCategoriesApi.getVendorCategories(),
    staleTime: Infinity,
  })
}
