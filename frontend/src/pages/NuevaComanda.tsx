import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardPlus,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useCrearPedido } from '../hooks/usePedidos'
import { useMesas } from '../hooks/useMesas'
import { formatoMoneda } from '../utils/format'

interface LineaCarrito {
  productoId: number
  nombre: string
  precio: number
  cantidad: number
  plato: number
}

function claveLinea(productoId: number, plato: number) {
  return `${productoId}-${plato}`
}

export default function NuevaComanda() {
  const { mesaId } = useParams()
  const idMesa = mesaId ? Number(mesaId) : null
  const navigate = useNavigate()
  const location = useLocation()

  const { data: mesas, isLoading: cargandoMesas } = useMesas()
  const { data: productos } = useProductos()
  const crearPedido = useCrearPedido()

  const [categoria, setCategoria] = useState<string | null>(null)
  const [cliente] = useState(() => (location.state as { cliente?: string } | null)?.cliente ?? '')
  const [carrito, setCarrito] = useState<Map<string, LineaCarrito>>(new Map())
  const [platoActivo, setPlatoActivo] = useState(1)
  const [ticketAbierto, setTicketAbierto] = useState(false)
  const [confirmarDescartar, setConfirmarDescartar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mesa = idMesa ? mesas?.find((m) => m.id === idMesa) : null

  const categorias = useMemo(() => {
    const set = new Set(productos?.map((p) => p.categoria) ?? [])
    return Array.from(set)
  }, [productos])

  const productosFiltrados = useMemo(() => {
    if (!productos) return []
    return productos.filter((p) => p.disponible && (!categoria || p.categoria === categoria))
  }, [productos, categoria])

  const gruposProductos = useMemo(() => {
    const map = new Map<string, typeof productosFiltrados>()
    for (const p of productosFiltrados) {
      const lista = map.get(p.categoria) ?? []
      lista.push(p)
      map.set(p.categoria, lista)
    }
    return Array.from(map.entries())
  }, [productosFiltrados])

  const lineas = Array.from(carrito.values())
  const cantidadItems = lineas.reduce((acc, l) => acc + l.cantidad, 0)
  const total = lineas.reduce((acc, l) => acc + l.cantidad * l.precio, 0)

  const platos = useMemo(() => {
    const set = new Set(lineas.map((l) => l.plato))
    set.add(platoActivo)
    return Array.from(set).sort((a, b) => a - b)
  }, [lineas, platoActivo])

  const lineasPorPlato = useMemo(() => {
    const map = new Map<number, LineaCarrito[]>()
    for (const l of lineas) {
      const lista = map.get(l.plato) ?? []
      lista.push(l)
      map.set(l.plato, lista)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [lineas])

  function agregarAlCarrito(producto: { id: number; nombre: string; precio: number }) {
    setCarrito((prev) => {
      const nuevo = new Map(prev)
      const clave = claveLinea(producto.id, platoActivo)
      const existente = nuevo.get(clave)
      if (existente) {
        nuevo.set(clave, { ...existente, cantidad: existente.cantidad + 1 })
      } else {
        nuevo.set(clave, {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: 1,
          plato: platoActivo,
        })
      }
      return nuevo
    })
  }

  function cambiarCantidad(productoId: number, plato: number, delta: number) {
    setCarrito((prev) => {
      const nuevo = new Map(prev)
      const clave = claveLinea(productoId, plato)
      const linea = nuevo.get(clave)
      if (!linea) return prev
      const cantidad = linea.cantidad + delta
      if (cantidad <= 0) {
        nuevo.delete(clave)
      } else {
        nuevo.set(clave, { ...linea, cantidad })
      }
      return nuevo
    })
  }

  function quitarLinea(productoId: number, plato: number) {
    setCarrito((prev) => {
      const nuevo = new Map(prev)
      nuevo.delete(claveLinea(productoId, plato))
      return nuevo
    })
  }

  function agregarPlato() {
    const siguiente = Math.max(0, ...platos) + 1
    setPlatoActivo(siguiente)
  }

  function salir() {
    if (carrito.size > 0) {
      setConfirmarDescartar(true)
    } else {
      navigate('/')
    }
  }

  async function crearPedidoYEnviar() {
    if (lineas.length === 0 || crearPedido.isPending) return
    setError(null)
    try {
      const pedido = await crearPedido.mutateAsync({
        mesaId: idMesa,
        items: lineas.map((l) => ({ producto_id: l.productoId, cantidad: l.cantidad, plato: l.plato })),
        cliente: idMesa ? undefined : cliente.trim() || undefined,
      })
      navigate(idMesa ? '/' : `/comanda/${pedido.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el pedido. Intenta de nuevo.')
    }
  }

  if (idMesa && !cargandoMesas && !mesa) {
    return (
      <div className="p-6 max-w-md mx-auto text-center pt-24 flex flex-col items-center gap-4">
        <span className="h-16 w-16 rounded-full bg-chile-50 flex items-center justify-center">
          <AlertTriangle size={28} className="text-chile-600" strokeWidth={2} />
        </span>
        <p className="text-carbon-800 text-lg font-semibold">Esta mesa ya no existe</p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 bg-carbon-800 text-white px-5 py-3 rounded-xl font-medium active:scale-95 transition cursor-pointer min-h-[44px]"
        >
          Volver a Mesas
        </button>
      </div>
    )
  }

  if (idMesa && mesa && mesa.estado === 'ocupada') {
    return (
      <div className="p-6 max-w-md mx-auto text-center pt-24 flex flex-col items-center gap-4">
        <span className="h-16 w-16 rounded-full bg-chile-50 flex items-center justify-center">
          <AlertTriangle size={28} className="text-chile-600" strokeWidth={2} />
        </span>
        <p className="text-carbon-800 text-lg font-semibold">{mesa.nombre} ya está ocupada</p>
        <p className="text-carbon-500 text-sm -mt-2">Puede que alguien más ya haya tomado esta mesa.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 bg-carbon-800 text-white px-5 py-3 rounded-xl font-medium active:scale-95 transition cursor-pointer min-h-[44px]"
        >
          Volver a Mesas
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-32">
      <div className="px-4 pt-4 pb-3 sticky top-0 bg-cream/95 backdrop-blur z-10 border-b border-carbon-400/10">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={salir}
            className="flex items-center gap-1.5 text-carbon-500 hover:text-carbon-700 text-sm font-medium cursor-pointer -ml-1 p-1 min-h-[44px]"
          >
            <ArrowLeft size={18} />
            Mesas
          </button>
          <div className="flex items-center gap-1.5 text-carbon-700 font-medium">
            {mesa ? <UtensilsCrossed size={16} /> : <ShoppingBag size={16} />}
            <span className="font-display text-lg font-semibold">
              {mesa ? mesa.nombre : cliente || 'Para llevar'}
            </span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 mb-2">
          <ChipCategoria activo={categoria === null} onClick={() => setCategoria(null)}>
            Todos
          </ChipCategoria>
          {categorias.map((cat) => (
            <ChipCategoria key={cat} activo={categoria === cat} onClick={() => setCategoria(cat)}>
              {cat}
            </ChipCategoria>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          <span className="text-xs font-semibold text-carbon-400 uppercase tracking-wide shrink-0">
            Agregando a
          </span>
          {platos.map((n) => (
            <ChipPlato key={n} activo={platoActivo === n} onClick={() => setPlatoActivo(n)}>
              Plato {n}
            </ChipPlato>
          ))}
          <button
            type="button"
            onClick={agregarPlato}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border border-dashed border-carbon-400/40 text-carbon-400 hover:text-chile-600 hover:border-chile-400 transition cursor-pointer shrink-0"
          >
            <Plus size={12} strokeWidth={2.5} />
            Plato
          </button>
        </div>
      </div>

      <div className="p-4">
        {productosFiltrados.length === 0 && (
          <p className="text-carbon-400 text-sm py-8 text-center">No hay productos en esta categoría.</p>
        )}
        <div className="space-y-6">
          {gruposProductos.map(([cat, items]) => (
            <section key={cat}>
              <h2 className="text-xs font-bold uppercase tracking-wide text-carbon-400 mb-2.5 px-1">
                {cat}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((producto) => (
                  <button
                    key={producto.id}
                    onClick={() => agregarAlCarrito(producto)}
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
            </section>
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
              {formatoMoneda(total)}
            </span>
          </button>

          <div className="max-h-[45vh] overflow-y-auto px-5">
            {lineas.length === 0 && (
              <p className="text-carbon-400 text-sm pb-4">Toca un producto del menú para agregarlo.</p>
            )}
            {lineasPorPlato.map(([plato, lineasDelPlato], i) => (
              <div key={plato} className={i > 0 ? 'pt-3' : ''}>
                <p className="text-xs font-bold uppercase tracking-wide text-carbon-400 pb-1.5">
                  Plato {plato}
                </p>
                <ul className="space-y-1.5">
                  {lineasDelPlato.map((linea) => (
                    <li
                      key={claveLinea(linea.productoId, linea.plato)}
                      className="rounded-xl bg-carbon-400/5 pl-3 pr-2 py-2 flex items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-carbon-800 truncate">{linea.nombre}</p>
                        <p className="text-xs text-carbon-500 tabular-nums">{formatoMoneda(linea.precio)} c/u</p>
                      </div>

                      <div className="flex items-center gap-0.5 bg-carbon-400/10 rounded-full p-0.5 shrink-0">
                        <button
                          onClick={() => cambiarCantidad(linea.productoId, linea.plato, -1)}
                          aria-label="Quitar uno"
                          className="h-6 w-6 flex items-center justify-center rounded-full bg-surface text-carbon-600 shadow-sm active:scale-90 transition cursor-pointer"
                        >
                          <Minus size={12} strokeWidth={2.5} />
                        </button>
                        <span className="w-4 text-center text-sm font-semibold text-carbon-800 tabular-nums">
                          {linea.cantidad}
                        </span>
                        <button
                          onClick={() => cambiarCantidad(linea.productoId, linea.plato, 1)}
                          aria-label="Agregar uno"
                          className="h-6 w-6 flex items-center justify-center rounded-full bg-surface text-carbon-600 shadow-sm active:scale-90 transition cursor-pointer"
                        >
                          <Plus size={12} strokeWidth={2.5} />
                        </button>
                      </div>

                      <span className="w-14 text-right text-sm font-semibold text-carbon-800 tabular-nums shrink-0">
                        {formatoMoneda(linea.cantidad * linea.precio)}
                      </span>

                      <button
                        onClick={() => quitarLinea(linea.productoId, linea.plato)}
                        aria-label="Eliminar producto"
                        className="h-7 w-7 flex items-center justify-center text-carbon-400 hover:text-chile-600 cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="p-4 pt-3">
            {error && (
              <p className="text-chile-700 bg-chile-50 border border-chile-100 rounded-xl px-3 py-2 text-sm mb-3">
                {error}
              </p>
            )}
            <button
              onClick={crearPedidoYEnviar}
              disabled={lineas.length === 0 || crearPedido.isPending}
              className="w-full flex items-center justify-center gap-2 bg-tomatillo-600 hover:bg-tomatillo-700 disabled:bg-carbon-400/30 text-white font-semibold py-4 rounded-2xl active:scale-95 transition cursor-pointer disabled:cursor-not-allowed"
            >
              {crearPedido.isPending ? (
                <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <ClipboardPlus size={19} strokeWidth={2.2} />
              )}
              Crear pedido · {formatoMoneda(total)}
            </button>
          </div>
        </div>
      </div>

      {confirmarDescartar && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-carbon-900/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmarDescartar(false)}
        >
          <div
            className="bg-surface w-full sm:max-w-sm rounded-3xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-xl font-semibold text-carbon-800">¿Descartar pedido?</h2>
              <button
                type="button"
                onClick={() => setConfirmarDescartar(false)}
                aria-label="Cerrar"
                className="p-2 -mr-2 text-carbon-400 hover:text-carbon-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-carbon-500 text-sm mb-5">
              Todavía no se ha creado el pedido, así que nada se envió a cocina. Se perderán los
              productos que llevas seleccionados.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmarDescartar(false)}
                className="flex-1 py-3 rounded-xl font-medium text-carbon-600 bg-carbon-400/10 active:scale-95 transition cursor-pointer"
              >
                Seguir editando
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-chile-600 hover:bg-chile-700 active:scale-95 transition cursor-pointer"
              >
                Descartar
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

function ChipPlato({
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
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
        activo ? 'bg-oro-500 text-white' : 'bg-oro-400/10 text-oro-700 hover:bg-oro-400/20'
      }`}
    >
      {children}
    </button>
  )
}
