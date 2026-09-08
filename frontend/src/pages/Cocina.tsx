import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle2, ChefHat, Clock, Receipt, ShoppingBag, UtensilsCrossed, Volume2 } from 'lucide-react'
import { useMarcarServido, usePedidosAbiertos } from '../hooks/usePedidos'
import { useMesas } from '../hooks/useMesas'
import type { Pedido } from '../api/types'

function cantidadTotal(pedido: Pedido) {
  return pedido.items.reduce((acc, item) => acc + item.cantidad, 0)
}

function segundosDesde(fechaIso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(fechaIso).getTime()) / 1000))
}

function formatoTranscurrido(segundos: number) {
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  const segs = segundos % 60
  if (horas > 0) return `${horas}h ${String(minutos).padStart(2, '0')}m`
  return `${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
}

function estilosUrgencia(segundos: number) {
  const minutos = segundos / 60
  if (minutos >= 20) return 'bg-chile-50 text-chile-600'
  if (minutos >= 10) return 'bg-oro-400/15 text-oro-700'
  return 'bg-carbon-400/10 text-carbon-500'
}

function pedidoPendiente(pedido: Pedido) {
  return pedido.items.some((item) => item.cantidad > item.cantidad_servida)
}

export default function Cocina() {
  const navigate = useNavigate()
  const { data: pedidos, isLoading } = usePedidosAbiertos()
  const { data: mesas } = useMesas()
  const marcarServido = useMarcarServido()

  const [toast, setToast] = useState<string | null>(null)
  const [destacado, setDestacado] = useState<number | null>(null)
  const [sonidoActivo, setSonidoActivo] = useState(false)
  const [marcandoId, setMarcandoId] = useState<number | null>(null)
  const [, forzarRefresco] = useState(0)

  const prevRef = useRef<Map<number, number> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const destacadoTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Refresca el reloj de cada tarjeta cada segundo, sin depender de nuevos datos.
  useEffect(() => {
    const interval = setInterval(() => forzarRefresco((n) => n + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function activarSonido() {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      } else if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
      setSonidoActivo(true)
    }
    document.addEventListener('pointerdown', activarSonido, { once: true })
    return () => document.removeEventListener('pointerdown', activarSonido)
  }, [])

  function reproducirBeep() {
    const ctx = audioCtxRef.current
    if (!ctx) return
    ;[0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      const inicio = ctx.currentTime + delay
      gain.gain.setValueAtTime(0.0001, inicio)
      gain.gain.exponentialRampToValueAtTime(0.35, inicio + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.16)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(inicio)
      osc.stop(inicio + 0.16)
    })
  }

  function notificar(mensaje: string, pedidoId: number) {
    reproducirBeep()
    setToast(mensaje)
    setDestacado(pedidoId)
    clearTimeout(toastTimerRef.current)
    clearTimeout(destacadoTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 4000)
    destacadoTimerRef.current = setTimeout(() => setDestacado(null), 4000)
  }

  useEffect(() => {
    if (!pedidos) return
    const anterior = prevRef.current

    if (anterior) {
      for (const pedido of pedidos) {
        const cantidadAntes = anterior.get(pedido.id)
        const cantidadAhora = cantidadTotal(pedido)
        if (cantidadAntes === undefined) {
          notificar(`Nuevo pedido — ${nombreMesa(pedido)}`, pedido.id)
        } else if (cantidadAhora > cantidadAntes) {
          notificar(`Se agregó un producto — ${nombreMesa(pedido)}`, pedido.id)
        }
      }
    }

    prevRef.current = new Map(pedidos.map((p) => [p.id, cantidadTotal(p)]))
  }, [pedidos])

  async function servir(pedidoId: number) {
    setMarcandoId(pedidoId)
    try {
      await marcarServido.mutateAsync(pedidoId)
    } finally {
      setMarcandoId(null)
    }
  }

  function nombreMesa(pedido: Pedido) {
    if (!pedido.mesa_id) return pedido.cliente || 'Para llevar'
    return mesas?.find((m) => m.id === pedido.mesa_id)?.nombre ?? 'Mesa'
  }

  const pedidosOrdenados = [...(pedidos ?? [])].sort(
    (a, b) => new Date(a.fecha_apertura).getTime() - new Date(b.fecha_apertura).getTime(),
  )

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">
      <header className="mb-1">
        <p className="font-display text-sm tracking-wide text-chile-600 font-semibold uppercase">
          Comandas
        </p>
        <h1 className="font-display text-3xl font-semibold text-carbon-800 flex items-center gap-2">
          <ChefHat size={28} className="text-chile-600" />
          Cocina
        </h1>
      </header>
      <p className="text-carbon-500 text-sm mb-2">
        Mesas ocupadas y pedidos para llevar, en el orden en que llegaron.
      </p>

      {!sonidoActivo && (
        <p className="flex items-center gap-1.5 text-xs text-oro-600 bg-oro-400/10 border border-oro-400/30 rounded-xl px-3 py-2 mb-4">
          <Volume2 size={14} />
          Toca la pantalla una vez para activar el sonido de notificaciones.
        </p>
      )}

      {toast && (
        <div className="fixed top-4 inset-x-4 z-40 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-carbon-800 text-white px-4 py-3 rounded-2xl shadow-lg font-medium text-sm animate-pulse">
            <Bell size={16} className="text-oro-400" />
            {toast}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-carbon-400/10 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && pedidosOrdenados.length === 0 && (
        <div className="flex flex-col items-center text-center gap-3 py-16 text-carbon-500">
          <ChefHat size={40} strokeWidth={1.5} className="text-carbon-400" />
          <p className="max-w-xs">No hay pedidos abiertos por ahora.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {pedidosOrdenados.map((pedido) => (
          <div
            key={pedido.id}
            className={`bg-surface border rounded-2xl p-4 shadow-sm transition ${
              destacado === pedido.id
                ? 'border-oro-500 ring-2 ring-oro-400/60'
                : 'border-carbon-400/15'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex items-center gap-1.5 font-display font-semibold text-lg text-carbon-800">
                {pedido.mesa_id ? (
                  <UtensilsCrossed size={17} className="text-chile-600" />
                ) : (
                  <ShoppingBag size={17} className="text-oro-600" />
                )}
                {nombreMesa(pedido)}
              </span>
              {pedidoPendiente(pedido) ? (
                <span
                  className={`flex items-center gap-1 text-xs font-semibold tabular-nums px-2 py-1 rounded-full ${estilosUrgencia(
                    segundosDesde(pedido.reloj_desde),
                  )}`}
                >
                  <Clock size={12} />
                  {formatoTranscurrido(segundosDesde(pedido.reloj_desde))}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-tomatillo-700 bg-tomatillo-100 px-2 py-1 rounded-full">
                  <CheckCircle2 size={12} />
                  Servido
                </span>
              )}
            </div>

            {pedido.items.length === 0 ? (
              <p className="text-carbon-400 text-sm">Sin productos todavía.</p>
            ) : pedido.ultimo_servido_en === null ? (
              // Nunca se ha marcado como servido: todo el pedido es "nuevo", no hace
              // falta separar nada todavía.
              <ul className="space-y-1.5">
                {pedido.items.map((item) => (
                  <li key={item.id} className="flex items-baseline gap-2 text-sm">
                    <span className="font-semibold text-chile-600 tabular-nums shrink-0">
                      {item.cantidad}×
                    </span>
                    <span className="text-carbon-800">
                      {item.producto.nombre}
                      {item.notas && <span className="text-carbon-500 italic"> — {item.notas}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                {pedido.items.some((item) => item.cantidad_servida > 0) && (
                  <ul className="space-y-1.5">
                    {pedido.items
                      .filter((item) => item.cantidad_servida > 0)
                      .map((item) => (
                        <li key={item.id} className="flex items-baseline gap-2 text-sm">
                          <span className="font-semibold text-chile-600 tabular-nums shrink-0">
                            {item.cantidad_servida}×
                          </span>
                          <span className="text-carbon-800">
                            {item.producto.nombre}
                            {item.notas && <span className="text-carbon-500 italic"> — {item.notas}</span>}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}

                {pedidoPendiente(pedido) && (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wide text-oro-600 pt-3 pb-1.5">
                      Nuevo pedido
                    </p>
                    <ul className="space-y-1.5">
                      {pedido.items
                        .filter((item) => item.cantidad > item.cantidad_servida)
                        .map((item) => (
                          <li
                            key={item.id}
                            className="flex items-baseline gap-2 text-sm bg-oro-400/10 rounded-lg px-2 py-1 -mx-2"
                          >
                            <span className="font-semibold text-oro-700 tabular-nums shrink-0">
                              {item.cantidad - item.cantidad_servida}×
                            </span>
                            <span className="text-carbon-800">
                              {item.producto.nombre}
                              {item.notas && <span className="text-carbon-500 italic"> — {item.notas}</span>}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </>
            )}

            <div className="mt-3 space-y-2">
              {pedidoPendiente(pedido) && (
                <button
                  type="button"
                  onClick={() => servir(pedido.id)}
                  disabled={marcandoId === pedido.id}
                  className="w-full flex items-center justify-center gap-2 bg-azul-600 hover:bg-azul-700 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl active:scale-95 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={15} strokeWidth={2.2} />
                  Servido
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/cobro/${pedido.id}`, { state: { from: 'cocina' } })}
                disabled={pedido.items.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-tomatillo-600 hover:bg-tomatillo-700 disabled:bg-carbon-400/20 disabled:text-carbon-400 text-white font-semibold text-sm py-2.5 rounded-xl active:scale-95 transition cursor-pointer disabled:cursor-not-allowed"
              >
                <Receipt size={15} strokeWidth={2.2} />
                Cobrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
