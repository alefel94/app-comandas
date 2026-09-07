export type EstadoMesa = 'libre' | 'ocupada'
export type EstadoPedido = 'abierto' | 'pagado'
export type MetodoPago = 'efectivo' | 'tarjeta'

export interface Mesa {
  id: number
  nombre: string
  estado: EstadoMesa
}

export interface Producto {
  id: number
  nombre: string
  precio: number
  categoria: string
  disponible: boolean
}

export interface ItemPedido {
  id: number
  producto_id: number
  producto: Producto
  cantidad: number
  precio_unitario: number
  notas: string | null
}

export interface Pago {
  id: number
  metodo: MetodoPago
  monto_total: number
  fecha: string
}

export interface Pedido {
  id: number
  mesa_id: number | null
  estado: EstadoPedido
  fecha_apertura: string
  fecha_cierre: string | null
  items: ItemPedido[]
  pago: Pago | null
  total: number
}

export interface ResumenVentas {
  total: number
  efectivo: number
  tarjeta: number
  numero_cuentas: number
}

export interface VentaPorDia {
  fecha: string
  total: number
  efectivo: number
  tarjeta: number
}

export interface EstadisticasMes {
  resumen: ResumenVentas
  por_dia: VentaPorDia[]
}
