import { Banknote, CreditCard, HandCoins, Receipt, TrendingUp } from 'lucide-react'
import { useEstadisticasDia, useEstadisticasMes } from '../hooks/useEstadisticas'
import { formatoMoneda } from '../utils/format'
import type { VentaPorDia } from '../api/types'

export default function Estadisticas() {
  const { data: dia, isLoading: cargandoDia } = useEstadisticasDia()
  const { data: mes, isLoading: cargandoMes } = useEstadisticasMes()

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-10">
      <header className="mb-6">
        <p className="font-display text-sm tracking-wide text-chile-600 font-semibold uppercase">
          Cuadre de caja
        </p>
        <h1 className="font-display text-3xl font-semibold text-carbon-800">Ventas</h1>
      </header>

      <section className="mb-8">
        <h2 className="font-semibold text-carbon-600 mb-3">Hoy</h2>
        {cargandoDia || !dia ? (
          <TarjetasSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Tarjeta etiqueta="Total del día" valor={formatoMoneda(dia.total)} icon={TrendingUp} destacado />
            <Tarjeta etiqueta="Efectivo" valor={formatoMoneda(dia.efectivo)} icon={Banknote} color="tomatillo" />
            <Tarjeta etiqueta="Tarjeta" valor={formatoMoneda(dia.tarjeta)} icon={CreditCard} color="azul" />
            <Tarjeta etiqueta="Propinas" valor={formatoMoneda(dia.propinas)} icon={HandCoins} color="oro" />
            <Tarjeta etiqueta="Cuentas cobradas" valor={String(dia.numero_cuentas)} icon={Receipt} />
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-carbon-600 mb-3">Este mes</h2>
        {cargandoMes || !mes ? (
          <TarjetasSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              <Tarjeta etiqueta="Total del mes" valor={formatoMoneda(mes.resumen.total)} icon={TrendingUp} destacado />
              <Tarjeta etiqueta="Efectivo" valor={formatoMoneda(mes.resumen.efectivo)} icon={Banknote} color="tomatillo" />
              <Tarjeta etiqueta="Tarjeta" valor={formatoMoneda(mes.resumen.tarjeta)} icon={CreditCard} color="azul" />
              <Tarjeta etiqueta="Propinas" valor={formatoMoneda(mes.resumen.propinas)} icon={HandCoins} color="oro" />
              <Tarjeta etiqueta="Cuentas cobradas" valor={String(mes.resumen.numero_cuentas)} icon={Receipt} />
            </div>

            {mes.por_dia.length > 0 && <GraficoVentas dias={mes.por_dia} />}

            <div className="bg-surface border border-carbon-400/15 rounded-2xl overflow-hidden mt-5 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-carbon-400/5 text-carbon-500 text-left">
                    <tr>
                      <th className="p-3 font-medium">Fecha</th>
                      <th className="p-3 font-medium text-right">Efectivo</th>
                      <th className="p-3 font-medium text-right">Tarjeta</th>
                      <th className="p-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-carbon-400/10">
                    {mes.por_dia.map((fila) => (
                      <tr key={fila.fecha}>
                        <td className="p-3 text-carbon-700">{fila.fecha}</td>
                        <td className="p-3 text-right tabular-nums text-carbon-600">{formatoMoneda(fila.efectivo)}</td>
                        <td className="p-3 text-right tabular-nums text-carbon-600">{formatoMoneda(fila.tarjeta)}</td>
                        <td className="p-3 text-right tabular-nums font-semibold text-carbon-800">
                          {formatoMoneda(fila.total)}
                        </td>
                      </tr>
                    ))}
                    {mes.por_dia.length === 0 && (
                      <tr>
                        <td className="p-4 text-carbon-400" colSpan={4}>
                          Sin ventas registradas este mes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function GraficoVentas({ dias }: { dias: VentaPorDia[] }) {
  const max = Math.max(...dias.map((d) => d.total), 1)

  return (
    <div className="bg-surface border border-carbon-400/15 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-4 text-xs text-carbon-500 mb-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-tomatillo-500" /> Efectivo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-azul-500" /> Tarjeta
        </span>
      </div>
      <div
        className="flex items-end gap-1.5 h-36 overflow-x-auto"
        role="img"
        aria-label={`Ventas diarias del mes, máximo ${formatoMoneda(max)}`}
      >
        {dias.map((d) => {
          const dia = d.fecha.slice(-2)
          const alturaEfectivo = (d.efectivo / max) * 100
          const alturaTarjeta = (d.tarjeta / max) * 100
          return (
            <div key={d.fecha} className="flex flex-col items-center gap-1 flex-1 min-w-[18px] group">
              <div className="flex items-end gap-0.5 h-28 w-full justify-center">
                <div
                  className="w-2 rounded-t-sm bg-tomatillo-500 transition-all"
                  style={{ height: `${Math.max(alturaEfectivo, d.efectivo > 0 ? 4 : 0)}%` }}
                  title={`Efectivo ${formatoMoneda(d.efectivo)}`}
                />
                <div
                  className="w-2 rounded-t-sm bg-azul-500 transition-all"
                  style={{ height: `${Math.max(alturaTarjeta, d.tarjeta > 0 ? 4 : 0)}%` }}
                  title={`Tarjeta ${formatoMoneda(d.tarjeta)}`}
                />
              </div>
              <span className="text-[10px] text-carbon-400 tabular-nums">{dia}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TarjetasSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-carbon-400/10 animate-pulse" />
      ))}
    </div>
  )
}

function Tarjeta({
  etiqueta,
  valor,
  icon: Icon,
  color,
  destacado,
}: {
  etiqueta: string
  valor: string
  icon: typeof TrendingUp
  color?: 'tomatillo' | 'azul' | 'oro'
  destacado?: boolean
}) {
  const colorClases =
    color === 'tomatillo'
      ? 'text-tomatillo-600 bg-tomatillo-50'
      : color === 'azul'
        ? 'text-azul-600 bg-azul-50'
        : color === 'oro'
          ? 'text-oro-600 bg-oro-400/15'
          : 'text-chile-600 bg-chile-50'

  return (
    <div className="bg-surface border border-carbon-400/15 rounded-2xl p-3.5 shadow-sm">
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg mb-2 ${colorClases}`}>
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <p className="text-xs text-carbon-500 mb-0.5">{etiqueta}</p>
      <p className={`font-display font-semibold tabular-nums ${destacado ? 'text-xl' : 'text-lg'} text-carbon-800`}>
        {valor}
      </p>
    </div>
  )
}
