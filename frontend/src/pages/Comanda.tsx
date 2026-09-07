import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Minus, Plus, Receipt, ShoppingBag, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useActualizarItem, useAgregarItem, useCancelarPedido, useEliminarItem, usePedido } from '../hooks/usePedidos'
import { useMesas } from '../hooks/useMesas'
import { formatoMoneda } from '../utils/format'

export default function Comanda() {
  const { pedidoId } = useParams()
  const id = Number(pedidoId)
  const navigate = useNavigate()

  const { data: pedido, isLoading, isError } = usePedido(id)
  const { data: productos } = useProductos()
  const { data: mesas } = useMesas()
  const agregarItem = useAgregarItem(id)
  const actualizarItem = useActualizarItem(id)
  const eliminarItem = useEliminarItem(id)
  const cancelarPedido = useCancelarPedido(id)

  const [categoria, setCategoria] = useState<string | null>(null)
  const [ticketAbierto, setTicketAbierto] = useState(false)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)

  const categorias = useMemo(() => {
    const set = new Set(productos?.map((p) => p.categoria) ?? [])
    return Array.from(set)
  }, [productos])

  const productosFiltrados = useMemo(() => {
    if (!productos) return []
    return productos.filter((p) => p.disponible && (!categoria || p.categoria === categoria))
  }, [productos, categoria])

  const mesa = mesas?.find((m) => m.id === pedido?.mesa_id)

  if (isError) {
    return (
      <div className="p-6 max-w-md mx-auto text-center pt-24 flex flex-col items-center gap-4">
        <span className="h-16 w-16 rounded-full bg-chile-50 flex items-center justify-center">
          <AlertTriangle size={28} className="text-chile-600" strokeWidth={2} />
        </span>
        <p className="text-carbon-800 text-lg font-semibold">Esta comanda ya no existe</p>
        <p className="text-carbon-500 text-sm -mt-2">
          Puede que ya se haya cancelado o cobrado desde otro dispositivo.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 bg-carbon-800 text-white px-5 py-3 rounded-xl font-medium active:scale-95 transition cursor-pointer min-h-[44px]"
        >
          Volver a Mesas
        </button>
      </div>
    )
  }

  if (isLoading || !pedido) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-3">
        <div className="h-8 w-40 bg-carbon-400/10 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-carbon-400/10 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const cantidadItems = pedido.items.reduce((acc, item) => acc + item.cantidad, 0)

  async function cancelar() {
    await cancelarPedido.mutateAsync()
    navigate('/')
  }

  return (
    <div className="max-w-4xl mx-auto pb-32">
      <div className="px-4 pt-4 pb-3 sticky top-0 bg-cream/95 backdrop-blur z-10 border-b border-carbon-400/10">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-carbon-500 hover:text-carbon-700 text-sm font-medium cursor-pointer -ml-1 p-1 min-h-[44px]"
          >
            <ArrowLeft size={18} />
            Mesas
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-carbon-700 font-medium">
              {mesa ? <UtensilsCrossed size={16} /> : <ShoppingBag size={16} />}
              <span className="font-display text-lg font-semibold">
                {mesa ? mesa.nombre : 'Para llevar'}
              </span>
            </div>
            <button
              onClick={() => setConfirmarCancelar(true)}
              className="text-sm font-medium text-carbon-400 hover:text-chile-600 cursor-pointer px-2 py-1 -mr-2 min-h-[36px]"
            >
              Cancelar
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          <ChipCategoria activo={categoria === null} onClick={() => setCategoria(null)}>
            Todos
          </ChipCategoria>
          {categorias.map((cat) => (
            <ChipCategoria key={cat} activo={categoria === cat} onClick={() => setCategoria(cat)}>
              {cat}
            </ChipCategoria>
          ))}
        </div>
      </div>

      <div className="p-4">
        {productosFiltrados.length === 0 && (
          <p className="text-carbon-400 text-sm py-8 text-center">No hay productos en esta categoría.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {productosFiltrados.map((producto) => (
            <button
              key={producto.id}
              onClick={() => agregarItem.mutate({ productoId: producto.id, cantidad: 1 })}
              className="bg-surface border border-carbon-400/15 rounded-2xl p-3.5 text-left shadow-sm active:scale-95 transition cursor-pointer flex flex-col justify-between min-h-[84px]"
            >
              <p className="font-medium text-carbon-800 leading-snug">{producto.nombre}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-chile-600 font-semibold">{formatoMoneda(producto.precio)}</span>
                <span className="flex items-center justify-center h-7 w-7 rounded-full bg-chile-50 text-chile-600">
                  <Plus size={16} strokeWidth={2.5} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel del ticket, deslizable en móvil */}
      <div
        className={`fixed inset-x-0 bottom-0 z-20 transition-transform duration-300 ${
          ticketAbierto ? 'translate-y-0' : 'translate-y-[calc(100%-88px)]'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-4xl mx-auto bg-surface rounded-t-3xl shadow-[0_-8px_30px_rgba(36,29,25,0.12)] border-t border-carbon-400/10">
          <button
            onClick={() => setTicketAbierto((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 cursor-pointer min-h-[44px]"
          >
            <span className="flex items-center gap-2 font-semibold text-carbon-800">
              <Receipt size={18} className="text-chile-600" />
              Ticket
              {cantidadItems > 0 && (
                <span className="bg-chile-100 text-chile-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {cantidadItems}
                </span>
              )}
            </span>
            <span className="font-display text-xl font-semibold text-carbon-800">
              {formatoMoneda(pedido.total)}
            </span>
          </button>

          <div className="max-h-[45vh] overflow-y-auto px-5">
            {pedido.items.length === 0 && (
              <p className="text-carbon-400 text-sm pb-4">Toca un producto del menú para agregarlo.</p>
            )}
            <ul className="divide-y divide-carbon-400/10">
              {pedido.items.map((item) => (
                <li key={item.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-carbon-800 font-medium truncate">{item.producto.nombre}</p>
                    <p className="text-carbon-500 text-sm">{formatoMoneda(item.precio_unitario)} c/u</p>
                  </div>

                  <div className="flex items-center gap-1 bg-carbon-400/10 rounded-full p-1">
                    <button
                      onClick={() =>
                        item.cantidad > 1
                          ? actualizarItem.mutate({ itemId: item.id, cantidad: item.cantidad - 1 })
                          : eliminarItem.mutate(item.id)
                      }
                      aria-label="Quitar uno"
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-surface text-carbon-600 shadow-sm active:scale-90 transition cursor-pointer"
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <span className="w-6 text-center font-semibold text-carbon-800 tabular-nums">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => actualizarItem.mutate({ itemId: item.id, cantidad: item.cantidad + 1 })}
                      aria-label="Agregar uno"
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-surface text-carbon-600 shadow-sm active:scale-90 transition cursor-pointer"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>

                  <span className="w-16 text-right font-semibold text-carbon-800 tabular-nums">
                    {formatoMoneda(item.cantidad * item.precio_unitario)}
                  </span>

                  <button
                    onClick={() => eliminarItem.mutate(item.id)}
                    aria-label="Eliminar producto"
                    className="h-8 w-8 flex items-center justify-center text-carbon-400 hover:text-chile-600 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 pt-3">
            <button
              onClick={() => navigate(`/cobro/${pedido.id}`)}
              disabled={pedido.items.length === 0}
              className="w-full bg-tomatillo-600 hover:bg-tomatillo-700 disabled:bg-carbon-400/30 text-white font-semibold py-4 rounded-2xl active:scale-95 transition cursor-pointer disabled:cursor-not-allowed"
            >
              Pedir la cuenta · {formatoMoneda(pedido.total)}
            </button>
          </div>
        </div>
      </div>

      {confirmarCancelar && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-carbon-900/40 backdrop-blur-sm p-4"
          onClick={() => !cancelarPedido.isPending && setConfirmarCancelar(false)}
        >
          <div
            className="bg-surface w-full sm:max-w-sm rounded-3xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-xl font-semibold text-carbon-800">
                ¿Cancelar comanda?
              </h2>
              <button
                type="button"
                onClick={() => setConfirmarCancelar(false)}
                aria-label="Cerrar"
                disabled={cancelarPedido.isPending}
                className="p-2 -mr-2 text-carbon-400 hover:text-carbon-600 cursor-pointer disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-carbon-500 text-sm mb-5">
              Se eliminarán los productos agregados
              {mesa ? ` y ${mesa.nombre} quedará libre` : ''}. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmarCancelar(false)}
                disabled={cancelarPedido.isPending}
                className="flex-1 py-3 rounded-xl font-medium text-carbon-600 bg-carbon-400/10 active:scale-95 transition cursor-pointer disabled:opacity-40"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={cancelarPedido.isPending}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-chile-600 hover:bg-chile-700 disabled:opacity-60 active:scale-95 transition cursor-pointer"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChipCategoria({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition cursor-pointer min-h-[36px] ${
        activo ? 'bg-carbon-800 text-white' : 'bg-carbon-400/10 text-carbon-600 hover:bg-carbon-400/20'
      }`}
    >
      {children}
    </button>
  )
}
