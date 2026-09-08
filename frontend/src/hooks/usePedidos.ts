import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { ItemPedidoInput } from '../api/types'

export function usePedidosAbiertos() {
  return useQuery({ queryKey: ['pedidos', 'abierto'], queryFn: () => api.pedidos.listar('abierto') })
}

export function usePedido(id: number | null) {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: () => api.pedidos.obtener(id as number),
    enabled: id !== null,
    retry: false,
  })
}

export function useCrearPedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      mesaId,
      items,
      cliente,
    }: {
      mesaId: number | null
      items?: ItemPedidoInput[]
      cliente?: string
    }) => api.pedidos.crear(mesaId, items, cliente),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

export function useAgregarItem(pedidoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productoId, cantidad, notas }: { productoId: number; cantidad: number; notas?: string }) =>
      api.pedidos.agregarItem(pedidoId, productoId, cantidad, notas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

export function useAgregarItemsLote(pedidoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: ItemPedidoInput[]) => api.pedidos.agregarItemsLote(pedidoId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

export function useActualizarItem(pedidoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, cantidad }: { itemId: number; cantidad: number }) =>
      api.pedidos.actualizarItem(pedidoId, itemId, { cantidad }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

export function useEliminarItem(pedidoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: number) => api.pedidos.eliminarItem(pedidoId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

export function useCancelarPedido(pedidoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.pedidos.cancelar(pedidoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

export function useMarcarServido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (pedidoId: number) => api.pedidos.marcarServido(pedidoId),
    onSuccess: (_data, pedidoId) => {
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

export function usePagarPedido(pedidoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ metodo, propina }: { metodo: 'efectivo' | 'tarjeta'; propina?: number }) =>
      api.pedidos.pagar(pedidoId, metodo, propina),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['estadisticas'] })
    },
  })
}
