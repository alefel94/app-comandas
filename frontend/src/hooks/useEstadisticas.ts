import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useEstadisticasDia() {
  return useQuery({ queryKey: ['estadisticas', 'dia'], queryFn: api.estadisticas.dia })
}

export function useEstadisticasMes() {
  return useQuery({ queryKey: ['estadisticas', 'mes'], queryFn: api.estadisticas.mes })
}
