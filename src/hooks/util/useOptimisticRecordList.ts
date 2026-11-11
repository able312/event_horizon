import { useMutation, useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from "@tanstack/react-query"
import { toast } from "sonner"

type ListRecord = { id: string }

type RecordListMessages = {
  add: string
  save: string
  remove: string
}

export type OptimisticRecordListOptions<
  TRecord extends ListRecord,
  TCreate extends { id: string },
  TUpdates,
  TKey extends QueryKey,
> = {
  /** A live list query (queries.ts). */
  listQuery: UseQueryOptions<TRecord[], Error, TRecord[], TKey> & { queryKey: TKey }
  create: (input: TCreate) => Promise<TRecord>
  /** The row shown while `create` is in flight, under the same client ID. */
  optimisticRecord: (input: TCreate) => TRecord
  update: (id: string, updates: TUpdates) => Promise<TRecord>
  remove: (id: string) => Promise<unknown>
  /** Toast copy when a save fails and the change is rolled back. */
  errorMessages: RecordListMessages
}

const EMPTY: never[] = []

/**
 * A live list of records (saved menu items, categories) whose adds, edits and deletes
 * show at once and roll back with a toast if the save fails. Callers pass a client ID
 * on create (crypto.randomUUID), so the row keeps its key once the server ID arrives.
 */
export function useOptimisticRecordList<
  TRecord extends ListRecord,
  TCreate extends { id: string },
  TUpdates extends object,
  TKey extends QueryKey,
>(options: OptimisticRecordListOptions<TRecord, TCreate, TUpdates, TKey>) {
  const { listQuery, create, optimisticRecord, update, remove, errorMessages } = options
  const queryClient = useQueryClient()
  const queryKey: QueryKey = listQuery.queryKey
  const query = useQuery(listQuery)

  /** Applies an optimistic change and returns the snapshot to roll back to. */
  const applyOptimistic = async (change: (old: TRecord[]) => TRecord[]) => {
    await queryClient.cancelQueries({ queryKey })
    const previous = queryClient.getQueryData<TRecord[]>(queryKey)
    queryClient.setQueryData<TRecord[]>(queryKey, (old) => change(old ?? []))
    return { previous }
  }

  const rollback = (context: { previous: TRecord[] | undefined } | undefined, message: string, err: Error) => {
    if (context) queryClient.setQueryData(queryKey, context.previous)
    toast.error(message)
    console.error(`${message}:`, err)
  }

  const addMutation = useMutation({
    mutationFn: create,
    onMutate: (input: TCreate) => applyOptimistic((old) => [...old, optimisticRecord(input)]),
    onSuccess: (created, { id }) => {
      queryClient.setQueryData<TRecord[]>(queryKey, (old) =>
        (old ?? []).map((record) => (record.id === id ? created : record)))
    },
    onError: (err, _input, context) => rollback(context, errorMessages.add, err),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TUpdates }) => update(id, updates),
    onMutate: ({ id, updates }) => applyOptimistic((old) =>
      old.map((record) => (record.id === id ? { ...record, ...updates } : record))),
    onError: (err, _variables, context) => rollback(context, errorMessages.save, err),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove(id),
    onMutate: (id) => applyOptimistic((old) => old.filter((record) => record.id !== id)),
    onError: (err, _id, context) => rollback(context, errorMessages.remove, err),
  })

  return {
    ...query,
    records: query.data ?? (EMPTY as TRecord[]),
    add: addMutation.mutate,
    update: updateMutation.mutate,
    remove: removeMutation.mutate,
  }
}
