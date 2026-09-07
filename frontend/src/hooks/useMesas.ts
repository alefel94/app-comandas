import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export function useMesas() {
  return useQuery({ queryKey: ['mesas'], queryFn: api.mesas.listar })
}

export function useCrearMesa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => api.mesas.crear(nombre),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mesas'] }),
  })
}

export function useEliminarMesa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.mesas.eliminar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mesas'] }),
  })
}
