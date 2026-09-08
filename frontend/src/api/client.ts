import type {
  EstadisticasMes,
  ItemPedido,
  ItemPedidoInput,
  Mesa,
  Pedido,
  Producto,
  ResumenVentas,
} from './types'

// En producción, el frontend y el backend viven en dominios distintos
// (ej. Vercel + Railway), así que la URL del backend se fija por variable
// de entorno en el build. En desarrollo, sin esa variable, se asume que
// el backend corre en el mismo host en el puerto 8000 — así funciona tanto
// en localhost como cuando otros dispositivos entran por la IP de la red
// local (ej. http://192.168.1.50:5180).
const envApiUrl = import.meta.env.VITE_API_URL as string | undefined

export const API_URL = envApiUrl ?? `${window.location.protocol}//${window.location.hostname}:8000`
export const WS_URL = envApiUrl
  ? `${envApiUrl.replace(/^http/, 'ws')}/ws`
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8000/ws`

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail ?? 'Error de red')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  mesas: {
    listar: () => request<Mesa[]>('/mesas'),
    crear: (nombre: string) =>
      request<Mesa>('/mesas', { method: 'POST', body: JSON.stringify({ nombre }) }),
    actualizar: (id: number, nombre: string) =>
      request<Mesa>(`/mesas/${id}`, { method: 'PUT', body: JSON.stringify({ nombre }) }),
    eliminar: (id: number) => request<void>(`/mesas/${id}`, { method: 'DELETE' }),
  },
  productos: {
    listar: () => request<Producto[]>('/productos'),
    crear: (data: Omit<Producto, 'id'>) =>
      request<Producto>('/productos', { method: 'POST', body: JSON.stringify(data) }),
    actualizar: (id: number, data: Partial<Omit<Producto, 'id'>>) =>
      request<Producto>(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    eliminar: (id: number) => request<void>(`/productos/${id}`, { method: 'DELETE' }),
  },
  pedidos: {
    listar: (estado?: 'abierto' | 'pagado') =>
      request<Pedido[]>(`/pedidos${estado ? `?estado=${estado}` : ''}`),
    obtener: (id: number) => request<Pedido>(`/pedidos/${id}`),
    crear: (mesa_id: number | null, items: ItemPedidoInput[] = [], cliente?: string) =>
      request<Pedido>('/pedidos', { method: 'POST', body: JSON.stringify({ mesa_id, items, cliente }) }),
    agregarItem: (pedidoId: number, producto_id: number, cantidad: number, notas?: string) =>
      request<Pedido>(`/pedidos/${pedidoId}/items`, {
        method: 'POST',
        body: JSON.stringify({ producto_id, cantidad, notas }),
      }),
    agregarItemsLote: (pedidoId: number, items: ItemPedidoInput[]) =>
      request<Pedido>(`/pedidos/${pedidoId}/items/lote`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    actualizarItem: (pedidoId: number, itemId: number, data: Partial<Pick<ItemPedido, 'cantidad' | 'notas'>>) =>
      request<Pedido>(`/pedidos/${pedidoId}/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    eliminarItem: (pedidoId: number, itemId: number) =>
      request<Pedido>(`/pedidos/${pedidoId}/items/${itemId}`, { method: 'DELETE' }),
    cancelar: (pedidoId: number) => request<void>(`/pedidos/${pedidoId}`, { method: 'DELETE' }),
    marcarServido: (pedidoId: number) =>
      request<Pedido>(`/pedidos/${pedidoId}/servir`, { method: 'POST' }),
    pagar: (pedidoId: number, metodo: 'efectivo' | 'tarjeta', propina: number = 0) =>
      request<Pedido>(`/pedidos/${pedidoId}/pagar`, {
        method: 'POST',
        body: JSON.stringify({ metodo, propina }),
      }),
  },
  estadisticas: {
    dia: () => request<ResumenVentas>('/estadisticas/dia'),
    mes: () => request<EstadisticasMes>('/estadisticas/mes'),
  },
}
