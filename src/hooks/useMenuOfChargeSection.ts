import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ChargeCategory, MenuOfChargeItem, UpdateMenuOfChargeItem } from "~/definitions/database"
import * as menuOfChargeItemApi from "~/lib/data/menuOfChargeItems"
import { menuOfChargeItemQueries } from "~/lib/data/queries"

function sortMenuItems(items: MenuOfChargeItem[]): MenuOfChargeItem[] {
  return [...items].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
}

export function useMenuOfChargeItemsSection() {
  const { id: eventId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const menuItemsQuery = menuOfChargeItemQueries.byEvent(eventId ?? "")
  const queryKey = menuItemsQuery.queryKey

  const query = useQuery({
    ...menuItemsQuery,
    select: sortMenuItems,
  })

  const createMutation = useMutation({
    mutationFn: (category: ChargeCategory | null = null) => menuOfChargeItemApi.createMenuOfChargeItem(eventId!, category),
    onMutate: async (category) => {
      await queryClient.cancelQueries({ queryKey })
      const previousMenuOfChargeItems = queryClient.getQueryData<MenuOfChargeItem[]>(queryKey)

      const now = new Date().toISOString()
      const optimisticMenuOfChargeItem = {
        id: `tempId_${Date.now()}`,
        includes: "",
        name: "",
        createdAt: now,
        eventId: eventId!,
        quantity: 0,
        category: category ?? null,
        unitPriceCents: 0,
      } as MenuOfChargeItem

      queryClient.setQueryData<MenuOfChargeItem[]>(queryKey, (old = []) =>
        sortMenuItems([...old, optimisticMenuOfChargeItem])
      )

      return { previousMenuOfChargeItems }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMenuOfChargeItems) {
        queryClient.setQueryData(queryKey, context.previousMenuOfChargeItems)
      }
      toast.error("Failed to create menuOfChargeItem")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateMenuOfChargeItem }) =>
      menuOfChargeItemApi.updateMenuOfChargeItem(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousMenuOfChargeItems = queryClient.getQueryData<MenuOfChargeItem[]>(queryKey)

      queryClient.setQueryData<MenuOfChargeItem[]>(queryKey, (old = []) =>
        sortMenuItems(old.map((p) => (p.id === id ? { ...p, ...updates } : p)))
      )

      return { previousMenuOfChargeItems }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMenuOfChargeItems) {
        queryClient.setQueryData(queryKey, context.previousMenuOfChargeItems)
      }
      toast.error("Failed to update menuOfChargeItem")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => menuOfChargeItemApi.deleteMenuOfChargeItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previousMenuOfChargeItems = queryClient.getQueryData<MenuOfChargeItem[]>(queryKey)

      queryClient.setQueryData<MenuOfChargeItem[]>(queryKey, (old = []) =>
        sortMenuItems(old.filter((p) => p.id !== id))
      )

      return { previousMenuOfChargeItems }
    },
    onError: (_err, _id, context) => {
      if (context?.previousMenuOfChargeItems) {
        queryClient.setQueryData(queryKey, context.previousMenuOfChargeItems)
      }
      toast.error("Failed to delete menuOfChargeItem")
    },
  })

  return {
    ...query,
    createMenuOfChargeItem: createMutation.mutate,
    createMenuOfChargeItemAsync: createMutation.mutateAsync,
    updateMenuOfChargeItem: updateMutation.mutate,
    updateMenuOfChargeItemAsync: updateMutation.mutateAsync,
    deleteMenuOfChargeItem: deleteMutation.mutate,
    deleteMenuOfChargeItemAsync: deleteMutation.mutateAsync,
  }
}
