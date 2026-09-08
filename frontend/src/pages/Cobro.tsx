import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Banknote, CheckCircle2, CreditCard } from 'lucide-react'
import { usePagarPedido, usePedido } from '../hooks/usePedidos'
import { formatoMoneda } from '../utils/format'
import type { MetodoPago } from '../api/types'

type OpcionPropina = '0' | '10' | '15' | '20' | 'otro'

export default function Cobro() {
  const { pedidoId } = useParams()
  const id = Number(pedidoId)
  const navigate = useNavigate()
  const location = useLocation()

  const desdeCocina = (location.state as { from?: string } | null)?.from === 'cocina'
  const rutaVolver = desdeCocina ? '/cocina' : '/'
  const etiquetaVolver = desdeCocina ? 'Volver a Cocina' : 'Volver a Mesas'

  const { data: pedido, isLoading, isError } = usePedido(id)
  const pagar = usePagarPedido(id)
  const [metodoPagando, setMetodoPagando] = useState<MetodoPago | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [opcionPropina, setOpcionPropina] = useState<OpcionPropina>('0')
  const [propinaPersonalizada, setPropinaPersonalizada] = useState('')

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
          onClick={() => navigate(rutaVolver)}
          className="mt-2 bg-carbon-800 text-white px-5 py-3 rounded-xl font-medium active:scale-95 transition cursor-pointer min-h-[44px]"
        >
          {etiquetaVolver}
        </button>
      </div>
    )
  }

  if (isLoading || !pedido) {
    return (
      <div className="p-6 max-w-md mx-auto pt-10 space-y-3">
        <div className="h-6 w-32 bg-carbon-400/10 rounded-lg animate-pulse" />
        <div className="h-40 bg-carbon-400/10 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (pedido.estado === 'pagado') {
    const propinaPagada = pedido.pago?.propina ?? 0
    const totalPagado = (pedido.pago?.monto_total ?? 0) + propinaPagada
    return (
      <div className="p-4 max-w-md mx-auto text-center pt-24 flex flex-col items-center gap-4">
        <span className="h-16 w-16 rounded-full bg-tomatillo-100 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-tomatillo-600" strokeWidth={2} />
        </span>
        <p className="text-carbon-800 text-lg font-semibold">Esta cuenta ya fue cobrada</p>
        <p className="text-carbon-500 text-sm -mt-2">
          Pagado con {pedido.pago?.metodo === 'efectivo' ? 'efectivo' : 'tarjeta'} ·{' '}
          {formatoMoneda(totalPagado)}
          {propinaPagada > 0 && ` (incluye ${formatoMoneda(propinaPagada)} de propina)`}
        </p>
        <button
          onClick={() => navigate(rutaVolver)}
          className="mt-2 bg-carbon-800 text-white px-5 py-3 rounded-xl font-medium active:scale-95 transition cursor-pointer min-h-[44px]"
        >
          {etiquetaVolver}
        </button>
      </div>
    )
  }

  const propina =
    opcionPropina === 'otro'
      ? Math.max(0, Number(propinaPersonalizada) || 0)
      : Math.round(pedido.total * Number(opcionPropina)) / 100

  const totalConPropina = pedido.total + propina

  async function cobrar(metodo: MetodoPago) {
    setMetodoPagando(metodo)
    setError(null)
    try {
      await pagar.mutateAsync({ metodo, propina })
      navigate(rutaVolver)
    } catch (err) {
      setMetodoPagando(null)
      setError(err instanceof Error ? err.message : 'No se pudo cobrar la cuenta. Intenta de nuevo.')
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto pt-6 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-carbon-500 hover:text-carbon-700 text-sm font-medium mb-4 cursor-pointer -ml-1 p-1 min-h-[44px]"
      >
        <ArrowLeft size={18} />
        {desdeCocina ? 'Volver a Cocina' : 'Regresar a la comanda'}
      </button>

      <h1 className="font-display text-2xl font-semibold text-carbon-800 mb-5">Cobrar cuenta</h1>

      <div className="bg-surface rounded-2xl border border-carbon-400/15 p-4 mb-5 shadow-sm">
        <ul className="divide-y divide-carbon-400/10">
          {pedido.items.map((item) => (
            <li key={item.id} className="py-2.5 flex justify-between text-sm gap-3">
              <span className="text-carbon-700">
                <span className="font-semibold tabular-nums">{item.cantidad}×</span> {item.producto.nombre}
              </span>
              <span className="text-carbon-800 font-medium tabular-nums whitespace-nowrap">
                {formatoMoneda(item.cantidad * item.precio_unitario)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-dashed border-carbon-400/20">
          <span className="text-carbon-500 font-medium">Subtotal</span>
          <span className="font-medium text-carbon-800 tabular-nums">{formatoMoneda(pedido.total)}</span>
        </div>
        {propina > 0 && (
          <div className="flex justify-between items-baseline mt-1.5">
            <span className="text-oro-600 font-medium">Propina</span>
            <span className="font-medium text-oro-600 tabular-nums">{formatoMoneda(propina)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-carbon-400/10">
          <span className="text-carbon-700 font-semibold">Total a cobrar</span>
          <span className="font-display text-3xl font-semibold text-carbon-800 tabular-nums">
            {formatoMoneda(totalConPropina)}
          </span>
        </div>
      </div>

      <p className="text-carbon-600 mb-3 font-medium">Propina</p>
      <div className="grid grid-cols-5 gap-2 mb-5">
        <BotonPropina
          etiqueta="Sin"
          activo={opcionPropina === '0'}
          onClick={() => setOpcionPropina('0')}
        />
        <BotonPropina
          etiqueta="10%"
          activo={opcionPropina === '10'}
          onClick={() => setOpcionPropina('10')}
        />
        <BotonPropina
          etiqueta="15%"
          activo={opcionPropina === '15'}
          onClick={() => setOpcionPropina('15')}
        />
        <BotonPropina
          etiqueta="20%"
          activo={opcionPropina === '20'}
          onClick={() => setOpcionPropina('20')}
        />
        <BotonPropina
          etiqueta="Otro"
          activo={opcionPropina === 'otro'}
          onClick={() => setOpcionPropina('otro')}
        />
      </div>

      {opcionPropina === 'otro' && (
        <div className="mb-5 -mt-2">
          <label htmlFor="propina-personalizada" className="block text-sm font-medium text-carbon-600 mb-1.5">
            Monto de propina
          </label>
          <input
            id="propina-personalizada"
            autoFocus
            value={propinaPersonalizada}
            onChange={(e) => setPropinaPersonalizada(e.target.value)}
            placeholder="0"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            className="w-full border border-carbon-400/30 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-oro-500 focus:border-oro-500"
          />
        </div>
      )}

      {error && (
        <p className="text-chile-700 bg-chile-50 border border-chile-100 rounded-xl px-4 py-3 text-sm mb-4">
          {error}
        </p>
      )}

      <p className="text-carbon-600 mb-3 font-medium">¿Cómo pagó el cliente?</p>
      <div className="grid grid-cols-2 gap-3">
        <BotonPago
          etiqueta="Efectivo"
          icon={Banknote}
          color="tomatillo"
          cargando={metodoPagando === 'efectivo'}
          deshabilitado={pagar.isPending}
          onClick={() => cobrar('efectivo')}
        />
        <BotonPago
          etiqueta="Tarjeta"
          icon={CreditCard}
          color="azul"
          cargando={metodoPagando === 'tarjeta'}
          deshabilitado={pagar.isPending}
          onClick={() => cobrar('tarjeta')}
        />
      </div>
    </div>
  )
}

function BotonPropina({
  etiqueta,
  activo,
  onClick,
}: {
  etiqueta: string
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 rounded-xl text-sm font-semibold transition active:scale-95 cursor-pointer min-h-[44px] ${
        activo
          ? 'bg-oro-500 text-white shadow-sm shadow-oro-500/30'
          : 'bg-carbon-400/10 text-carbon-600 hover:bg-carbon-400/20'
      }`}
    >
      {etiqueta}
    </button>
  )
}

function BotonPago({
  etiqueta,
  icon: Icon,
  color,
  cargando,
  deshabilitado,
  onClick,
}: {
  etiqueta: string
  icon: typeof Banknote
  color: 'tomatillo' | 'azul'
  cargando: boolean
  deshabilitado: boolean
  onClick: () => void
}) {
  const estilos =
    color === 'tomatillo'
      ? 'bg-tomatillo-600 hover:bg-tomatillo-700 shadow-tomatillo-600/25'
      : 'bg-azul-600 hover:bg-azul-700 shadow-azul-600/25'

  return (
    <button
      onClick={onClick}
      disabled={deshabilitado}
      className={`flex flex-col items-center justify-center gap-2 text-white font-semibold py-7 rounded-2xl shadow-lg active:scale-95 transition text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${estilos}`}
    >
      {cargando ? (
        <span className="h-7 w-7 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      ) : (
        <Icon size={28} strokeWidth={2} />
      )}
      {etiqueta}
    </button>
  )
}
