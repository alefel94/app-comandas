import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Pencil, Plus, ShoppingBag, Users, UtensilsCrossed, X } from 'lucide-react'
import { useActualizarMesa, useCrearMesa, useMesas } from '../hooks/useMesas'
import { usePedidosAbiertos } from '../hooks/usePedidos'
import { formatoMoneda } from '../utils/format'
import type { Mesa } from '../api/types'

export default function Mesas() {
  const { data: mesas, isLoading } = useMesas()
  const { data: pedidosAbiertos } = usePedidosAbiertos()
  const crearMesa = useCrearMesa()
  const actualizarMesa = useActualizarMesa()
  const navigate = useNavigate()
  const [nuevaMesa, setNuevaMesa] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mesaEditando, setMesaEditando] = useState<Mesa | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [errorEditar, setErrorEditar] = useState<string | null>(null)
  const [mesaParaAbrir, setMesaParaAbrir] = useState<Mesa | null>(null)
  const [nombrePedidoMesa, setNombrePedidoMesa] = useState('')
  const [errorAbrirMesa, setErrorAbrirMesa] = useState<string | null>(null)
  const [mostrarLlevar, setMostrarLlevar] = useState(false)
  const [nombrePedidoLlevar, setNombrePedidoLlevar] = useState('')

  function abrirMesa(mesa: Mesa) {
    if (mesa.estado === 'libre') {
      setMesaParaAbrir(mesa)
      setNombrePedidoMesa('')
      setErrorAbrirMesa(null)
    } else {
      const pedido = pedidosAbiertos?.find((p) => p.mesa_id === mesa.id)
      if (pedido) navigate(`/comanda/${pedido.id}`)
    }
  }

  async function confirmarAbrirMesa(e: React.FormEvent) {
    e.preventDefault()
    if (!mesaParaAbrir || actualizarMesa.isPending) return
    const nombre = nombrePedidoMesa.trim()
    setErrorAbrirMesa(null)
    if (nombre && nombre !== mesaParaAbrir.nombre) {
      try {
        await actualizarMesa.mutateAsync({ id: mesaParaAbrir.id, nombre })
      } catch (err) {
        setErrorAbrirMesa(err instanceof Error ? err.message : 'No se pudo guardar el nombre.')
        return
      }
    }
    const id = mesaParaAbrir.id
    setMesaParaAbrir(null)
    navigate(`/nueva-comanda/mesa/${id}`)
  }

  function abrirModalLlevar() {
    setNombrePedidoLlevar('')
    setMostrarLlevar(true)
  }

  function confirmarLlevar(e: React.FormEvent) {
    e.preventDefault()
    setMostrarLlevar(false)
    navigate('/nueva-comanda/llevar', { state: { cliente: nombrePedidoLlevar.trim() || undefined } })
  }

  async function agregarMesa(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevaMesa.trim()) return
    await crearMesa.mutateAsync(nuevaMesa.trim())
    setNuevaMesa('')
    setMostrarForm(false)
  }

  function abrirEditar(mesa: Mesa) {
    setMesaEditando(mesa)
    setNombreEditado(mesa.nombre)
    setErrorEditar(null)
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!mesaEditando || !nombreEditado.trim() || actualizarMesa.isPending) return
    setErrorEditar(null)
    try {
      await actualizarMesa.mutateAsync({ id: mesaEditando.id, nombre: nombreEditado.trim() })
      setMesaEditando(null)
    } catch (err) {
      setErrorEditar(err instanceof Error ? err.message : 'No se pudo guardar el nombre. Intenta de nuevo.')
    }
  }

  const libres = mesas?.filter((m) => m.estado === 'libre').length ?? 0
  const ocupadas = mesas?.filter((m) => m.estado === 'ocupada').length ?? 0
  const pedidosLlevar = pedidosAbiertos?.filter((p) => p.mesa_id === null) ?? []

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
          onClick={abrirModalLlevar}
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
            <div
              key={mesa.id}
              onClick={() => abrirMesa(mesa)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') abrirMesa(mesa)
              }}
              className={`group relative aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 text-white shadow-sm active:scale-95 transition cursor-pointer ${
                libre
                  ? 'bg-tomatillo-500 hover:bg-tomatillo-600 shadow-tomatillo-500/25'
                  : 'bg-chile-500 hover:bg-chile-600 shadow-chile-500/25'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  abrirEditar(mesa)
                }}
                aria-label={`Editar ${mesa.nombre}`}
                className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/25 transition cursor-pointer"
              >
                <Pencil size={13} />
              </button>
              {libre ? (
                <CheckCircle2 size={26} strokeWidth={2} className="opacity-90" />
              ) : (
                <Users size={26} strokeWidth={2} className="opacity-90" />
              )}
              <span className="font-display font-semibold text-lg leading-none">{mesa.nombre}</span>
              <span className="text-xs font-medium opacity-90 bg-black/10 px-2 py-0.5 rounded-full">
                {libre ? 'Libre' : 'Ocupada'}
              </span>
            </div>
          )
        })}

        {mesas && mesas.length > 0 && (
          <button
            onClick={() => setMostrarForm(true)}
            className="aspect-square rounded-3xl border-2 border-dashed border-carbon-400/40 text-carbon-400 hover:text-chile-600 hover:border-chile-400 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Plus size={26} strokeWidth={2} />
            <span className="text-xs font-medium">Nueva mesa</span>
          </button>
        )}
      </div>

      {pedidosLlevar.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wide text-carbon-400 mb-2.5 px-1">
            Para llevar
          </h2>
          <div className="space-y-2">
            {pedidosLlevar.map((pedido) => (
              <button
                key={pedido.id}
                onClick={() => navigate(`/comanda/${pedido.id}`)}
                className="w-full flex items-center justify-between gap-3 bg-surface border border-carbon-400/15 rounded-2xl p-3.5 shadow-sm active:scale-95 transition cursor-pointer text-left"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="h-9 w-9 flex items-center justify-center rounded-full bg-oro-400/15 text-oro-600 shrink-0">
                    <ShoppingBag size={16} />
                  </span>
                  <span className="min-w-0">
                    <p className="font-medium text-carbon-800 truncate">{pedido.cliente || 'Para llevar'}</p>
                    <p className="text-xs text-carbon-500">
                      {pedido.items.reduce((acc, item) => acc + item.cantidad, 0)} producto(s)
                    </p>
                  </span>
                </span>
                <span className="font-display font-semibold text-carbon-800 shrink-0">
                  {formatoMoneda(pedido.total)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {mesaEditando && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-carbon-900/40 backdrop-blur-sm p-4"
          onClick={() => !actualizarMesa.isPending && setMesaEditando(null)}
        >
          <form
            onSubmit={guardarEdicion}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface w-full sm:max-w-sm rounded-3xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-carbon-800">Editar mesa</h2>
              <button
                type="button"
                onClick={() => setMesaEditando(null)}
                aria-label="Cerrar"
                disabled={actualizarMesa.isPending}
                className="p-2 -mr-2 text-carbon-400 hover:text-carbon-600 cursor-pointer disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>
            <label htmlFor="nombre-mesa-editar" className="block text-sm font-medium text-carbon-600 mb-1.5">
              Nombre o número
            </label>
            <input
              id="nombre-mesa-editar"
              autoFocus
              value={nombreEditado}
              onChange={(e) => setNombreEditado(e.target.value)}
              placeholder="Ej. Mesa 5"
              className="w-full border border-carbon-400/30 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-chile-500 focus:border-chile-500"
            />
            {errorEditar && (
              <p className="text-chile-700 bg-chile-50 border border-chile-100 rounded-xl px-3 py-2 text-sm mt-3">
                {errorEditar}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setMesaEditando(null)}
                disabled={actualizarMesa.isPending}
                className="flex-1 py-3 rounded-xl font-medium text-carbon-600 bg-carbon-400/10 active:scale-95 transition cursor-pointer disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!nombreEditado.trim() || actualizarMesa.isPending}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-chile-600 hover:bg-chile-700 disabled:opacity-40 active:scale-95 transition cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {mesaParaAbrir && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-carbon-900/40 backdrop-blur-sm p-4"
          onClick={() => !actualizarMesa.isPending && setMesaParaAbrir(null)}
        >
          <form
            onSubmit={confirmarAbrirMesa}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface w-full sm:max-w-sm rounded-3xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-carbon-800">
                {mesaParaAbrir.nombre}
              </h2>
              <button
                type="button"
                onClick={() => setMesaParaAbrir(null)}
                aria-label="Cerrar"
                disabled={actualizarMesa.isPending}
                className="p-2 -mr-2 text-carbon-400 hover:text-carbon-600 cursor-pointer disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>
            <label htmlFor="nombre-cliente-mesa" className="block text-sm font-medium text-carbon-600 mb-1.5">
              Nombre del cliente (opcional)
            </label>
            <input
              id="nombre-cliente-mesa"
              autoFocus
              value={nombrePedidoMesa}
              onChange={(e) => setNombrePedidoMesa(e.target.value)}
              placeholder="Ej. Familia Gómez"
              className="w-full border border-carbon-400/30 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-chile-500 focus:border-chile-500"
            />
            {errorAbrirMesa && (
              <p className="text-chile-700 bg-chile-50 border border-chile-100 rounded-xl px-3 py-2 text-sm mt-3">
                {errorAbrirMesa}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setMesaParaAbrir(null)}
                disabled={actualizarMesa.isPending}
                className="flex-1 py-3 rounded-xl font-medium text-carbon-600 bg-carbon-400/10 active:scale-95 transition cursor-pointer disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actualizarMesa.isPending}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-tomatillo-600 hover:bg-tomatillo-700 disabled:opacity-40 active:scale-95 transition cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarLlevar && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-carbon-900/40 backdrop-blur-sm p-4"
          onClick={() => setMostrarLlevar(false)}
        >
          <form
            onSubmit={confirmarLlevar}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface w-full sm:max-w-sm rounded-3xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-carbon-800">Para llevar</h2>
              <button
                type="button"
                onClick={() => setMostrarLlevar(false)}
                aria-label="Cerrar"
                className="p-2 -mr-2 text-carbon-400 hover:text-carbon-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <label htmlFor="nombre-cliente-llevar" className="block text-sm font-medium text-carbon-600 mb-1.5">
              Nombre para identificar el pedido (opcional)
            </label>
            <input
              id="nombre-cliente-llevar"
              autoFocus
              value={nombrePedidoLlevar}
              onChange={(e) => setNombrePedidoLlevar(e.target.value)}
              placeholder="Ej. Sofía"
              className="w-full border border-carbon-400/30 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-oro-500 focus:border-oro-500"
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setMostrarLlevar(false)}
                className="flex-1 py-3 rounded-xl font-medium text-carbon-600 bg-carbon-400/10 active:scale-95 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-oro-500 hover:bg-oro-600 active:scale-95 transition cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
