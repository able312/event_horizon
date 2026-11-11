import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { BeverageItemType, BeverageTemplate, BeverageTemplateFields } from "~/definitions/database"
import * as beverageTemplatesApi from "~/lib/data/beverageTemplates"
import { beverageTemplateQueries } from "~/lib/data/queries"

const EMPTY_TEMPLATES: BeverageTemplate[] = []

type TemplateCache = BeverageTemplate[] | undefined

/** The venue's saved beverages (Settings → Beverage Menu), kept live, with optimistic edits. */
export function useBeverageTemplates() {
  const queryClient = useQueryClient()
  const listQuery = beverageTemplateQueries.list()
  const queryKey = listQuery.queryKey
  const query = useQuery(listQuery)

  /** Applies an optimistic change and returns the snapshot to roll back to. */
  const applyOptimistic = async (change: (old: BeverageTemplate[]) => BeverageTemplate[]) => {
    await queryClient.cancelQueries({ queryKey })
    const previous = queryClient.getQueryData<BeverageTemplate[]>(queryKey)
    queryClient.setQueryData<BeverageTemplate[]>(queryKey, (old) => change(old ?? []))
    return { previous }
  }

  const rollback = (context: { previous: TemplateCache } | undefined, message: string, err: Error) => {
    if (context) queryClient.setQueryData(queryKey, context.previous)
    toast.error(message)
    console.error(`${message}:`, err)
  }

  const addMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: BeverageItemType }) =>
      beverageTemplatesApi.createBeverageTemplate({ id, name: "", type }),
    onMutate: ({ id, type }) => applyOptimistic((old) => [
      ...old,
      { id, name: "", type, unitPriceCents: null, pricingBasis: "each", notes: null, createdAt: new Date().toISOString() },
    ]),
    onSuccess: (created, { id }) => {
      queryClient.setQueryData<BeverageTemplate[]>(queryKey, (old) =>
        (old ?? []).map((template) => (template.id === id ? created : template)))
    },
    onError: (err, _variables, context) => rollback(context, "Failed to add beverage", err),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BeverageTemplateFields> }) =>
      beverageTemplatesApi.updateBeverageTemplate(id, updates),
    onMutate: ({ id, updates }) => applyOptimistic((old) =>
      old.map((template) => (template.id === id ? { ...template, ...updates } : template))),
    onError: (err, _variables, context) => rollback(context, "Failed to save beverage", err),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => beverageTemplatesApi.deleteBeverageTemplate(id),
    onMutate: (id) => applyOptimistic((old) => old.filter((template) => template.id !== id)),
    onError: (err, _id, context) => rollback(context, "Failed to delete beverage", err),
  })

  return {
    ...query,
    templates: query.data ?? EMPTY_TEMPLATES,
    addTemplate: addMutation.mutate,
    updateTemplate: updateMutation.mutate,
    removeTemplate: removeMutation.mutate,
  }
}
