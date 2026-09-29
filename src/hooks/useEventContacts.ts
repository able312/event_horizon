import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type {
  AssignContactTarget,
  AssignEventContactOptions,
  ContactRoleType,
  EventContactsPanel,
  NewContact,
  UpdateContact,
  UpdateEventContact,
} from "~/definitions/contacts"
import {
  getContactsErrorMessage,
  selectPrimaryClient,
  selectPrintableContactGroups,
} from "~/features/contacts/lib/eventContactsPanel"
import * as contactRolesApi from "~/lib/ipc/contactRoles"
import * as contactsApi from "~/lib/ipc/contacts"
import * as eventContactsApi from "~/lib/ipc/eventContacts"
import * as vendorCategoriesApi from "~/lib/ipc/vendorCategories"

const CONTACT_SEARCH_LIMIT = 20

const eventContactsRootKey = ["event-contacts"] as const
export const eventContactsQueryKey = (eventId: string) => [...eventContactsRootKey, eventId] as const
/** Batched primary clients for list views; any contact change on any event can affect them. */
export const PRIMARY_CLIENTS_QUERY_KEY_PREFIX = [...eventContactsRootKey, "primary-clients"] as const
const contactsRootKey = ["contacts"] as const

/** Invalidates the whole event-contacts cache: every event's panel plus the primary-clients batch. */
function invalidateAllEventContacts(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: eventContactsRootKey })
}

/** Invalidates the directory: search results, by-id lookups, standing roles, and event history. */
function invalidateContactsDirectory(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: contactsRootKey })
}

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
    void queryClient.invalidateQueries({ queryKey: PRIMARY_CLIENTS_QUERY_KEY_PREFIX })
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

/** The event's primary client. Shares the panel's cache, so it updates as soon as contacts are edited. */
export function usePrimaryClient(eventId: string | undefined) {
  return useQuery({
    queryKey: eventContactsQueryKey(eventId ?? ""),
    enabled: Boolean(eventId),
    queryFn: () => eventContactsApi.getEventContactsPanel(eventId!),
    select: selectPrimaryClient,
  })
}

/** Every client, coordinator and vendor with contact details, grouped by role, for printed documents. */
export function usePrintableContactGroups(eventId: string | undefined) {
  return useQuery({
    queryKey: eventContactsQueryKey(eventId ?? ""),
    enabled: Boolean(eventId),
    queryFn: () => eventContactsApi.getEventContactsPanel(eventId!),
    select: selectPrintableContactGroups,
  })
}

/** Primary client per event id, fetched in one call so list views avoid a request per event. */
export function usePrimaryClients(eventIds: string[]) {
  const ids = [...new Set(eventIds)].sort()
  return useQuery({
    queryKey: [...PRIMARY_CLIENTS_QUERY_KEY_PREFIX, ids],
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
    queryFn: () => eventContactsApi.getPrimaryClients(ids),
  })
}

export type ContactSearchFilters = {
  role?: ContactRoleType
  includeArchived?: boolean
  limit?: number
}

/** Directory search, used by both the add-contact dialog and the Contacts page. Keeps the last results visible while typing. */
export function useContactSearch(query: string, enabled: boolean, filters?: ContactSearchFilters) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: [
      ...contactsRootKey,
      "search",
      trimmed,
      filters?.role ?? null,
      filters?.includeArchived ?? false,
      filters?.limit ?? CONTACT_SEARCH_LIMIT,
    ],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () =>
      contactsApi.searchContacts({
        query: trimmed,
        limit: filters?.limit ?? CONTACT_SEARCH_LIMIT,
        role: filters?.role,
        includeArchived: filters?.includeArchived,
      }),
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

// ============================================================================
// Contacts directory (create/edit/archive/delete, standing roles, event history)
// ============================================================================

/** Errors are left to the caller so the create/edit form can react to EmailTaken inline. */
export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewContact) => contactsApi.createContact(input),
    onSettled: () => invalidateContactsDirectory(queryClient),
  })
}

export type UpdateContactVariables = { id: string; patch: UpdateContact }

/** Errors are left to the caller so the edit form can react to EmailTaken inline. */
export function useUpdateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: UpdateContactVariables) => contactsApi.updateContact(id, patch),
    onSettled: () => {
      invalidateContactsDirectory(queryClient)
      invalidateAllEventContacts(queryClient)
    },
  })
}

export function useArchiveContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contactsApi.archiveContact(id),
    onError: (err) => toast.error(getContactsErrorMessage(err, "Failed to archive contact")),
    onSettled: () => {
      invalidateContactsDirectory(queryClient)
      invalidateAllEventContacts(queryClient)
    },
  })
}

export function useRestoreContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contactsApi.restoreContact(id),
    onError: (err) => toast.error(getContactsErrorMessage(err, "Failed to restore contact")),
    onSettled: () => {
      invalidateContactsDirectory(queryClient)
      invalidateAllEventContacts(queryClient)
    },
  })
}

/** Errors are left to the caller so the page can distinguish ContactInUse from other failures. */
export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contactsApi.deleteContact(id),
    onSettled: () => {
      invalidateContactsDirectory(queryClient)
      invalidateAllEventContacts(queryClient)
    },
  })
}

export function useContactRoles(contactId: string | null) {
  return useQuery({
    queryKey: [...contactsRootKey, "roles", contactId],
    enabled: Boolean(contactId),
    queryFn: () => contactRolesApi.getContactRoles(contactId!),
  })
}

export type EnsureContactRoleVariables = { contactId: string; role: ContactRoleType; vendorCategoryId?: string | null }

export function useEnsureContactRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ contactId, role, vendorCategoryId }: EnsureContactRoleVariables) =>
      contactRolesApi.ensureContactRole(contactId, role, vendorCategoryId),
    onError: (err) => toast.error(getContactsErrorMessage(err, "Failed to add role")),
    onSettled: () => invalidateContactsDirectory(queryClient),
  })
}

export type RemoveContactRoleVariables = { contactId: string; role: ContactRoleType; vendorCategoryId?: string | null }

export function useRemoveContactRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ contactId, role, vendorCategoryId }: RemoveContactRoleVariables) =>
      contactRolesApi.removeContactRole(contactId, role, vendorCategoryId),
    onError: (err) => toast.error(getContactsErrorMessage(err, "Failed to remove role")),
    onSettled: () => invalidateContactsDirectory(queryClient),
  })
}

export function useContactEventHistory(contactId: string | null) {
  return useQuery({
    queryKey: [...contactsRootKey, "history", contactId],
    enabled: Boolean(contactId),
    queryFn: () => eventContactsApi.getContactEventHistory(contactId!),
  })
}
