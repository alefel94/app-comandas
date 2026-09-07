import { useMemo, useState } from 'react'
import { ClipboardList, Plus, Trash2 } from 'lucide-react'
import {
  useActualizarProducto,
  useCrearProducto,
  useEliminarProducto,
  useProductos,
} from '../hooks/useProductos'
import { formatoMoneda } from '../utils/format'
import type { Producto } from '../api/types'

export default function AdminMenu() {
  const { data: productos, isLoading } = useProductos()
  const crear = useCrearProducto()
  const actualizar = useActualizarProducto()
  const eliminar = useEliminarProducto()

  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [categoria, setCategoria] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)

  const grupos = useMemo(() => {
    const map = new Map<string, Producto[]>()
    for (const p of productos ?? []) {
      const lista = map.get(p.categoria) ?? []
      lista.push(p)
      map.set(p.categoria, lista)
    }
    return Array.from(map.entries())
  }, [productos])

  async function agregarProducto(e: React.FormEvent) {
    e.preventDefault()
    const precioNum = Number(precio)
    if (!nombre.trim() || Number.isNaN(precioNum) || precioNum <= 0) return
    await crear.mutateAsync({
      nombre: nombre.trim(),
      precio: precioNum,
      categoria: categoria.trim() || 'General',
      disponible: true,
    })
    setNombre('')
    setPrecio('')
    setCategoria('')
    setMostrarForm(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10">
      <header className="flex items-center justify-between mb-1">
        <div>
          <p className="font-display text-sm tracking-wide text-chile-600 font-semibold uppercase">
            Administración
          </p>
          <h1 className="font-display text-3xl font-semibold text-carbon-800">Menú</h1>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-2 bg-chile-600 hover:bg-chile-700 text-white px-4 py-3 rounded-2xl font-semibold shadow-sm shadow-chile-600/25 active:scale-95 transition cursor-pointer min-h-[44px]"
        >
          <Plus size={18} strokeWidth={2.5} />
          Producto
        </button>
      </header>

      {mostrarForm && (
        <form
          onSubmit={agregarProducto}
          className="bg-surface border border-carbon-400/15 rounded-2xl p-4 my-5 shadow-sm grid grid-cols-2 gap-3"
        >
          <div className="col-span-2">
            <label htmlFor="nombre" className="block text-sm font-medium text-carbon-600 mb-1">
              Nombre
            </label>
            <input
              id="nombre"
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Taco de pastor"
              className="w-full border border-carbon-400/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-chile-500 focus:border-chile-500"
            />
          </div>
          <div>
            <label htmlFor="precio" className="block text-sm font-medium text-carbon-600 mb-1">
              Precio
            </label>
            <input
              id="precio"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="18"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              className="w-full border border-carbon-400/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-chile-500 focus:border-chile-500"
            />
          </div>
          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-carbon-600 mb-1">
              Categoría
            </label>
            <input
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Tacos"
              className="w-full border border-carbon-400/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-chile-500 focus:border-chile-500"
            />
          </div>
          <div className="col-span-2 flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="flex-1 py-2.5 rounded-xl font-medium text-carbon-600 bg-carbon-400/10 active:scale-95 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre.trim() || !precio}
              className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-chile-600 hover:bg-chile-700 disabled:opacity-40 active:scale-95 transition cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="space-y-2 mt-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-carbon-400/10 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && productos?.length === 0 && (
        <div className="flex flex-col items-center text-center gap-3 py-16 text-carbon-500">
          <ClipboardList size={40} strokeWidth={1.5} className="text-carbon-400" />
          <p className="max-w-xs">Tu menú está vacío. Agrega tu primer producto para empezar a vender.</p>
        </div>
      )}

      <div className="space-y-6 mt-5">
        {grupos.map(([cat, items]) => (
          <div key={cat}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-carbon-400 mb-2 px-1">{cat}</h2>
            <ul className="divide-y divide-carbon-400/10 bg-surface border border-carbon-400/15 rounded-2xl overflow-hidden shadow-sm">
              {items?.map((producto) => (
                <li key={producto.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-carbon-800 truncate">{producto.nombre}</p>
                    <p className="text-sm text-chile-600 font-semibold tabular-nums">
                      {formatoMoneda(producto.precio)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      role="switch"
                      aria-checked={producto.disponible}
                      onClick={() =>
                        actualizar.mutate({ id: producto.id, data: { disponible: !producto.disponible } })
                      }
                      className={`text-xs font-medium px-3 py-2 rounded-full transition cursor-pointer min-h-[36px] ${
                        producto.disponible
                          ? 'bg-tomatillo-100 text-tomatillo-700'
                          : 'bg-carbon-400/10 text-carbon-500'
                      }`}
                    >
                      {producto.disponible ? 'Disponible' : 'Agotado'}
                    </button>
                    <button
                      onClick={() => eliminar.mutate(producto.id)}
                      aria-label={`Eliminar ${producto.nombre}`}
                      className="h-9 w-9 flex items-center justify-center rounded-full text-carbon-400 hover:text-chile-600 hover:bg-chile-50 transition cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
