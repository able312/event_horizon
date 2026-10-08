import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import * as contactRolesApi from "~/lib/data/contactRoles"
import * as contactsApi from "~/lib/data/contacts"
import * as eventContactsApi from "~/lib/data/eventContacts"
import {
  contactKeys,
  contactQueries,
  eventContactKeys,
  eventContactQueries,
  vendorCategoryQueries,
} from "~/lib/data/queries"

const CONTACT_SEARCH_LIMIT = 20

/** Invalidates the whole event-contacts cache: every event's panel plus the primary-clients batch. */
function invalidateAllEventContacts(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: eventContactKeys.all() })
}

/** Invalidates the directory: search results, by-id lookups, standing roles, and event history. */
function invalidateContactsDirectory(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: contactKeys.all() })
}

export type AssignEventContactVariables = {
  target: AssignContactTarget
  role: ContactRoleType
  opts?: AssignEventContactOptions
}

export type SaveEventContactVariables = {
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
  const queryKey = eventContactKeys.panel(eventId)

  const query = useQuery({
    ...eventContactQueries.panel(eventId),
    enabled: Boolean(eventId),
  })

  const invalidatePanel = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({ queryKey: eventContactKeys.primaryClients() })
  }

  // Assigning/saving can create or change a contact, which changes directory search and by-id results
  const invalidateDirectory = () => {
    void queryClient.invalidateQueries({ queryKey: contactKeys.all() })
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

  /** Saves the contact's own details and the event-specific assignment fields together: both or neither. */
  const saveMutation = useMutation({
    mutationFn: ({ eventContactId, contact, assignment }: SaveEventContactVariables) =>
      eventContactsApi.updateEventContactWithContact(eventContactId, contact, assignment),
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
    ...eventContactQueries.panel(eventId ?? ""),
    enabled: Boolean(eventId),
    select: selectPrimaryClient,
  })
}

/** Every client, coordinator and vendor with contact details, grouped by role, for printed documents. */
export function usePrintableContactGroups(eventId: string | undefined) {
  return useQuery({
    ...eventContactQueries.panel(eventId ?? ""),
    enabled: Boolean(eventId),
    select: selectPrintableContactGroups,
  })
}

/** Primary client per event id, fetched in one call so list views avoid a request per event. */
export function usePrimaryClients(eventIds: string[]) {
  const ids = [...new Set(eventIds)].sort()
  return useQuery({
    ...eventContactQueries.primaryClients(ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  })
}

export type ContactSearchFilters = {
  role?: ContactRoleType
  includeArchived?: boolean
  limit?: number
}

/** Directory search, used by both the add-contact dialog and the Contacts page. Keeps the last results visible while typing. */
export function useContactSearch(query: string, enabled: boolean, filters?: ContactSearchFilters) {
  return useQuery({
    ...contactQueries.search({
      query: query.trim(),
      role: filters?.role ?? null,
      includeArchived: filters?.includeArchived ?? false,
      limit: filters?.limit ?? CONTACT_SEARCH_LIMIT,
    }),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export type ContactDirectoryFilters = {
  role?: ContactRoleType
  includeArchived?: boolean
  pageSize: number
}

/** Contacts page list: loads one page at a time and appends the next on request, so no contact is out of reach. */
export function useContactDirectory(query: string, filters: ContactDirectoryFilters) {
  return useInfiniteQuery({
    ...contactQueries.directory({
      query: query.trim(),
      role: filters.role ?? null,
      includeArchived: filters.includeArchived ?? false,
      limit: filters.pageSize,
    }),
    placeholderData: keepPreviousData,
  })
}

export function useContact(contactId: string | null) {
  return useQuery({
    ...contactQueries.byId(contactId ?? ""),
    enabled: Boolean(contactId),
  })
}

export function useVendorCategories() {
  return useQuery({
    ...vendorCategoryQueries.all(),
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
    ...contactQueries.roles(contactId ?? ""),
    enabled: Boolean(contactId),
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
    ...contactQueries.history(contactId ?? ""),
    enabled: Boolean(contactId),
  })
}
