import { useMemo, useState } from 'react'
import { BookOpen, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  useActualizarProducto,
  useCrearProducto,
  useEliminarProducto,
  useProductos,
} from '../hooks/useProductos'
import { formatoMoneda } from '../utils/format'
import type { Producto } from '../api/types'

interface FormState {
  nombre: string
  precio: string
  categoria: string
}

const FORM_VACIO: FormState = { nombre: '', precio: '', categoria: '' }

export default function Catalogo() {
  const { data: productos, isLoading } = useProductos()
  const crear = useCrearProducto()
  const actualizar = useActualizarProducto()
  const eliminar = useEliminarProducto()

  const [categoria, setCategoria] = useState<string | null>(null)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<FormState>(FORM_VACIO)
  const [agregandoCategoria, setAgregandoCategoria] = useState(false)
  const [categoriaNueva, setCategoriaNueva] = useState('')

  const categorias = useMemo(() => {
    const set = new Set(productos?.map((p) => p.categoria) ?? [])
    return Array.from(set)
  }, [productos])

  const opcionesCategoria = useMemo(() => {
    if (form.categoria && !categorias.includes(form.categoria)) {
      return [...categorias, form.categoria]
    }
    return categorias
  }, [categorias, form.categoria])

  const productosFiltrados = useMemo(() => {
    if (!productos) return []
    return productos.filter((p) => !categoria || p.categoria === categoria)
  }, [productos, categoria])

  const grupos = useMemo(() => {
    const map = new Map<string, typeof productosFiltrados>()
    for (const p of productosFiltrados) {
      const lista = map.get(p.categoria) ?? []
      lista.push(p)
      map.set(p.categoria, lista)
    }
    return Array.from(map.entries())
  }, [productosFiltrados])

  function abrirCrear() {
    setForm({ ...FORM_VACIO, categoria: categorias[0] ?? '' })
    setAgregandoCategoria(categorias.length === 0)
    setCategoriaNueva('')
    setCreando(true)
  }

  function abrirEditar(producto: Producto) {
    setForm({ nombre: producto.nombre, precio: String(producto.precio), categoria: producto.categoria })
    setAgregandoCategoria(false)
    setCategoriaNueva('')
    setEditando(producto)
  }

  function cerrarModal() {
    setCreando(false)
    setEditando(null)
  }

  function confirmarCategoriaNueva() {
    const nombre = categoriaNueva.trim()
    if (!nombre) return
    setForm((f) => ({ ...f, categoria: nombre }))
    setAgregandoCategoria(false)
    setCategoriaNueva('')
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const precioNum = Number(form.precio)
    if (!form.nombre.trim() || !form.categoria.trim() || Number.isNaN(precioNum) || precioNum <= 0) return

    if (editando) {
      await actualizar.mutateAsync({
        id: editando.id,
        data: {
          nombre: form.nombre.trim(),
          precio: precioNum,
          categoria: form.categoria.trim() || 'General',
        },
      })
    } else {
      await crear.mutateAsync({
        nombre: form.nombre.trim(),
        precio: precioNum,
        categoria: form.categoria.trim() || 'General',
        disponible: true,
      })
    }
    cerrarModal()
  }

  async function eliminarDesdeModal() {
    if (!editando) return
    await eliminar.mutateAsync(editando.id)
    cerrarModal()
  }

  const guardando = crear.isPending || actualizar.isPending
  const modalAbierto = creando || editando !== null

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="px-4 pt-6 pb-3 sticky top-0 bg-cream/95 backdrop-blur z-10 border-b border-carbon-400/10">
        <header className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <p className="font-display text-sm tracking-wide text-chile-600 font-semibold uppercase">
              Comandas
            </p>
            <h1 className="font-display text-3xl font-semibold text-carbon-800">Catálogo</h1>
          </div>
          <button
            onClick={abrirCrear}
            className="flex items-center gap-2 bg-chile-600 hover:bg-chile-700 text-white px-4 py-3 rounded-2xl font-semibold shadow-sm shadow-chile-600/25 active:scale-95 transition cursor-pointer min-h-[44px] shrink-0"
          >
            <Plus size={18} strokeWidth={2.5} />
            Producto
          </button>
        </header>
        <p className="text-carbon-500 text-sm mb-4">Todo lo que vendemos, por categoría.</p>

        <div className="flex flex-wrap gap-2">
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

      <div className="px-4 pt-5">
        {isLoading && (
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-carbon-400/10 rounded-lg animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-28 rounded-2xl bg-carbon-400/10 animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && productosFiltrados.length === 0 && (
          <div className="flex flex-col items-center text-center gap-3 py-16 text-carbon-500">
            <BookOpen size={40} strokeWidth={1.5} className="text-carbon-400" />
            <p className="max-w-xs">Todavía no hay productos en el catálogo. Agrega el primero.</p>
          </div>
        )}

        <div className="space-y-7">
          {grupos.map(([cat, items]) => (
            <section key={cat}>
              <h2 className="text-xs font-bold uppercase tracking-wide text-carbon-400 mb-2.5 px-1">
                {cat}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((producto) => (
                  <div
                    key={producto.id}
                    className={`relative bg-surface border border-carbon-400/15 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between gap-2 min-h-[108px] ${
                      producto.disponible ? '' : 'opacity-60'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-carbon-800 leading-snug pr-2">{producto.nombre}</p>
                      <span className="text-chile-600 font-semibold">{formatoMoneda(producto.precio)}</span>
                    </div>

                    <div className="flex items-center flex-wrap justify-between gap-1">
                      <button
                        role="switch"
                        aria-checked={producto.disponible}
                        onClick={() =>
                          actualizar.mutate({ id: producto.id, data: { disponible: !producto.disponible } })
                        }
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full transition cursor-pointer ${
                          producto.disponible
                            ? 'bg-tomatillo-100 text-tomatillo-700'
                            : 'bg-carbon-400/15 text-carbon-500'
                        }`}
                      >
                        {producto.disponible ? 'Disponible' : 'Agotado'}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => abrirEditar(producto)}
                          aria-label={`Editar ${producto.nombre}`}
                          className="h-8 w-8 flex items-center justify-center rounded-full text-carbon-400 hover:text-carbon-700 hover:bg-carbon-400/10 transition cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => eliminar.mutate(producto.id)}
                          aria-label={`Eliminar ${producto.nombre}`}
                          className="h-8 w-8 flex items-center justify-center rounded-full text-carbon-400 hover:text-chile-600 hover:bg-chile-50 transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {modalAbierto && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-carbon-900/40 backdrop-blur-sm p-4"
          onClick={() => !guardando && cerrarModal()}
        >
          <form
            onSubmit={guardar}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface w-full sm:max-w-sm rounded-3xl p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-carbon-800">
                {editando ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <button
                type="button"
                onClick={cerrarModal}
                aria-label="Cerrar"
                disabled={guardando}
                className="p-2 -mr-2 text-carbon-400 hover:text-carbon-600 cursor-pointer disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-carbon-600 mb-1">
                  Nombre
                </label>
                <input
                  id="nombre"
                  autoFocus
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Taco de pastor"
                  className="w-full border border-carbon-400/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-chile-500 focus:border-chile-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="precio" className="block text-sm font-medium text-carbon-600 mb-1">
                    Precio
                  </label>
                  <input
                    id="precio"
                    value={form.precio}
                    onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
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
                  {!agregandoCategoria ? (
                    <select
                      id="categoria"
                      value={form.categoria}
                      onChange={(e) => {
                        if (e.target.value === '__nueva__') {
                          setAgregandoCategoria(true)
                        } else {
                          setForm((f) => ({ ...f, categoria: e.target.value }))
                        }
                      }}
                      className="w-full border border-carbon-400/30 rounded-xl px-3.5 py-2.5 bg-surface focus:outline-none focus:ring-2 focus:ring-chile-500 focus:border-chile-500"
                    >
                      {!form.categoria && (
                        <option value="" disabled>
                          Elige…
                        </option>
                      )}
                      {opcionesCategoria.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__nueva__">+ Nueva categoría…</option>
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        autoFocus
                        value={categoriaNueva}
                        onChange={(e) => setCategoriaNueva(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            confirmarCategoriaNueva()
                          }
                        }}
                        placeholder="Ej. Postres"
                        className="w-full min-w-0 border border-carbon-400/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-chile-500 focus:border-chile-500"
                      />
                      <button
                        type="button"
                        onClick={confirmarCategoriaNueva}
                        disabled={!categoriaNueva.trim()}
                        aria-label="Agregar categoría"
                        className="shrink-0 w-11 flex items-center justify-center rounded-xl bg-carbon-800 text-white disabled:opacity-40 active:scale-95 transition cursor-pointer"
                      >
                        <Plus size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              {editando && (
                <button
                  type="button"
                  onClick={eliminarDesdeModal}
                  disabled={guardando || eliminar.isPending}
                  aria-label="Eliminar producto"
                  className="px-3.5 rounded-xl font-medium text-chile-600 bg-chile-50 hover:bg-chile-100 active:scale-95 transition cursor-pointer disabled:opacity-40"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="flex-1 py-3 rounded-xl font-medium text-carbon-600 bg-carbon-400/10 active:scale-95 transition cursor-pointer disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!form.nombre.trim() || !form.precio || !form.categoria.trim() || guardando}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-chile-600 hover:bg-chile-700 disabled:opacity-40 active:scale-95 transition cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </form>
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
