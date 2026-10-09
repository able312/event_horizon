import { useParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Payment, UpdatePayment } from "~/definitions/database"
import * as paymentApi from "~/lib/data/payments"
import { paymentQueries } from "~/lib/data/queries"

function sortPayments(payments: Payment[]): Payment[] {
  return [...payments].sort((a, b) => {
    const dateCompare = (b.date ?? "").localeCompare(a.date ?? "")
    if (dateCompare !== 0) return dateCompare

    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  })
}

export function usePaymentsSection() {
  const { id: eventId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const paymentsQuery = paymentQueries.byEvent(eventId ?? "")
  const queryKey = paymentsQuery.queryKey

  const query = useQuery({
    ...paymentsQuery,
    select: sortPayments,
  })

  const createMutation = useMutation({
    mutationFn: () => paymentApi.createPayment(eventId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previousPayments = queryClient.getQueryData<Payment[]>(queryKey)

      const now = new Date().toISOString()
      const optimisticPayment = {
        id: `temp_${Date.now()}`,
        eventId: eventId!,
        amountCents: 0,
        date: now,
        recieptNumber: "",
        notes: "",
        createdAt: now,
      } as Payment

      queryClient.setQueryData<Payment[]>(queryKey, (old = []) =>
        sortPayments([...old, optimisticPayment])
      )

      return { previousPayments }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousPayments) {
        queryClient.setQueryData(queryKey, context.previousPayments)
      }
      toast.error("Failed to create payment")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdatePayment }) =>
      paymentApi.updatePayment(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousPayments = queryClient.getQueryData<Payment[]>(queryKey)

      queryClient.setQueryData<Payment[]>(queryKey, (old = []) =>
        sortPayments(old.map((p) => (p.id === id ? { ...p, ...updates } : p)))
      )

      return { previousPayments }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousPayments) {
        queryClient.setQueryData(queryKey, context.previousPayments)
      }
      toast.error("Failed to update payment")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentApi.deletePayment(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previousPayments = queryClient.getQueryData<Payment[]>(queryKey)

      queryClient.setQueryData<Payment[]>(queryKey, (old = []) =>
        sortPayments(old.filter((p) => p.id !== id))
      )

      return { previousPayments }
    },
    onError: (_err, _id, context) => {
      if (context?.previousPayments) {
        queryClient.setQueryData(queryKey, context.previousPayments)
      }
      toast.error("Failed to delete payment")
    },
  })

  return {
    ...query,
    createPayment: createMutation.mutate,
    createPaymentAsync: createMutation.mutateAsync,
    updatePayment: updateMutation.mutate,
    updatePaymentAsync: updateMutation.mutateAsync,
    deletePayment: deleteMutation.mutate,
    deletePaymentAsync: deleteMutation.mutateAsync,
  }
}
