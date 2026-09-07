import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ClipboardPlus, Plus, ShoppingBag, Users, UtensilsCrossed, X } from 'lucide-react'
import { useCrearMesa, useMesas } from '../hooks/useMesas'
import { useCrearPedido, usePedidosAbiertos } from '../hooks/usePedidos'
import type { Mesa } from '../api/types'

export default function Mesas() {
  const { data: mesas, isLoading } = useMesas()
  const { data: pedidosAbiertos } = usePedidosAbiertos()
  const crearPedido = useCrearPedido()
  const crearMesa = useCrearMesa()
  const navigate = useNavigate()
  const [nuevaMesa, setNuevaMesa] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null)
  const [creandoComanda, setCreandoComanda] = useState(false)
  const [errorComanda, setErrorComanda] = useState<string | null>(null)

  function abrirMesa(mesa: Mesa) {
    if (mesa.estado === 'libre') {
      setErrorComanda(null)
      setMesaSeleccionada(mesa)
    } else {
      const pedido = pedidosAbiertos?.find((p) => p.mesa_id === mesa.id)
      if (pedido) navigate(`/comanda/${pedido.id}`)
    }
  }

  async function crearComanda() {
    if (!mesaSeleccionada || creandoComanda) return
    setCreandoComanda(true)
    setErrorComanda(null)
    try {
      const pedido = await crearPedido.mutateAsync(mesaSeleccionada.id)
      navigate(`/comanda/${pedido.id}`)
    } catch (err) {
      setErrorComanda(
        err instanceof Error ? err.message : 'No se pudo crear la comanda. Intenta de nuevo.',
      )
    } finally {
      setCreandoComanda(false)
    }
  }

  async function pedidoParaLlevar() {
    const pedido = await crearPedido.mutateAsync(null)
    navigate(`/comanda/${pedido.id}`)
  }

  async function agregarMesa(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevaMesa.trim()) return
    await crearMesa.mutateAsync(nuevaMesa.trim())
    setNuevaMesa('')
    setMostrarForm(false)
  }

  const libres = mesas?.filter((m) => m.estado === 'libre').length ?? 0
  const ocupadas = mesas?.filter((m) => m.estado === 'ocupada').length ?? 0

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-8">
      <header className="flex items-start justify-between mb-1">
        <div>
          <p className="font-display text-sm tracking-wide text-chile-600 font-semibold uppercase">
            Comandas
          </p>
          <h1 className="font-display text-3xl font-semibold text-carbon-800">Mesas</h1>
        </div>
        <button
          onClick={pedidoParaLlevar}
          className="flex items-center gap-2 bg-oro-500 hover:bg-oro-600 text-white pl-3.5 pr-4 py-3 rounded-2xl font-semibold shadow-sm shadow-oro-500/30 active:scale-95 transition cursor-pointer min-h-[44px]"
        >
          <ShoppingBag size={18} strokeWidth={2.4} />
          Para llevar
        </button>
      </header>

      <div className="flex gap-3 text-sm text-carbon-500 mb-6">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-tomatillo-500" />
          {libres} libres
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-chile-500" />
          {ocupadas} ocupadas
        </span>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-3xl bg-carbon-400/10 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && mesas?.length === 0 && !mostrarForm && (
        <div className="flex flex-col items-center text-center gap-3 py-16 text-carbon-500">
          <UtensilsCrossed size={40} strokeWidth={1.5} className="text-carbon-400" />
          <p className="max-w-xs">
            Aún no tienes mesas registradas. Agrega tu primera mesa para empezar a tomar pedidos.
          </p>
          <button
            onClick={() => setMostrarForm(true)}
            className="mt-1 bg-chile-600 hover:bg-chile-700 text-white px-5 py-2.5 rounded-xl font-medium active:scale-95 transition cursor-pointer"
          >
            Agregar mesa
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {mesas?.map((mesa) => {
          const libre = mesa.estado === 'libre'
          return (
            <button
              key={mesa.id}
              onClick={() => abrirMesa(mesa)}
              className={`group relative aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 text-white shadow-sm active:scale-95 transition cursor-pointer ${
                libre
                  ? 'bg-tomatillo-500 hover:bg-tomatillo-600 shadow-tomatillo-500/25'
                  : 'bg-chile-500 hover:bg-chile-600 shadow-chile-500/25'
              }`}
            >
              {libre ? (
                <CheckCircle2 size={26} strokeWidth={2} className="opacity-90" />
              ) : (
                <Users size={26} strokeWidth={2} className="opacity-90" />
              )}
              <span className="font-display font-semibold text-lg leading-none">{mesa.nombre}</span>
              <span className="text-xs font-medium opacity-90 bg-black/10 px-2 py-0.5 rounded-full">
                {libre ? 'Libre' : 'Ocupada'}
              </span>
            </button>
          )
        })}

        <button
          onClick={() => setMostrarForm(true)}
          className="aspect-square rounded-3xl border-2 border-dashed border-carbon-400/40 text-carbon-400 hover:text-chile-600 hover:border-chile-400 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
        >
          <Plus size={26} strokeWidth={2} />
          <span className="text-xs font-medium">Nueva mesa</span>
        </button>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-carbon-900/40 backdrop-blur-sm p-4">
          <form
            onSubmit={agregarMesa}
            className="bg-surface w-full sm:max-w-sm rounded-3xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-carbon-800">Nueva mesa</h2>
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                aria-label="Cerrar"
                className="p-2 -mr-2 text-carbon-400 hover:text-carbon-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <label htmlFor="nombre-mesa" className="block text-sm font-medium text-carbon-600 mb-1.5">
              Nombre o número
            </label>
            <input
              id="nombre-mesa"
              autoFocus
              value={nuevaMesa}
              onChange={(e) => setNuevaMesa(e.target.value)}
              placeholder="Ej. Mesa 5"
              className="w-full border border-carbon-400/30 rounded-xl px-4 py-3 mb-4 text-base focus:outline-none focus:ring-2 focus:ring-chile-500 focus:border-chile-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="flex-1 py-3 rounded-xl font-medium text-carbon-600 bg-carbon-400/10 active:scale-95 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!nuevaMesa.trim()}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-chile-600 hover:bg-chile-700 disabled:opacity-40 active:scale-95 transition cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {mesaSeleccionada && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-carbon-900/40 backdrop-blur-sm p-4"
          onClick={() => !creandoComanda && setMesaSeleccionada(null)}
        >
          <div
            className="bg-surface w-full sm:max-w-sm rounded-3xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-xl font-semibold text-carbon-800">
                {mesaSeleccionada.nombre}
              </h2>
              <button
                type="button"
                onClick={() => setMesaSeleccionada(null)}
                aria-label="Cerrar"
                disabled={creandoComanda}
                className="p-2 -mr-2 text-carbon-400 hover:text-carbon-600 cursor-pointer disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-carbon-500 text-sm mb-3">
              Esta mesa está libre. Al crear la comanda quedará marcada como ocupada.
            </p>
            {errorComanda && (
              <p className="text-chile-700 bg-chile-50 border border-chile-100 rounded-xl px-3 py-2 text-sm mb-3">
                {errorComanda}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMesaSeleccionada(null)}
                disabled={creandoComanda}
                className="flex-1 py-3 rounded-xl font-medium text-carbon-600 bg-carbon-400/10 active:scale-95 transition cursor-pointer disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={crearComanda}
                disabled={creandoComanda}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-tomatillo-600 hover:bg-tomatillo-700 disabled:opacity-60 active:scale-95 transition cursor-pointer"
              >
                {creandoComanda ? (
                  <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <ClipboardPlus size={18} strokeWidth={2.2} />
                )}
                Crear comanda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
