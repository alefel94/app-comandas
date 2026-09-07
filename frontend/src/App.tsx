import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ClipboardList, LayoutGrid, LineChart } from 'lucide-react'
import Mesas from './pages/Mesas'
import Comanda from './pages/Comanda'
import Cobro from './pages/Cobro'
import Estadisticas from './pages/Estadisticas'
import AdminMenu from './pages/AdminMenu'
import { useWebSocket } from './hooks/useWebSocket'

function App() {
  useWebSocket()
  const location = useLocation()
  const ocultarNav = location.pathname.startsWith('/comanda') || location.pathname.startsWith('/cobro')

  return (
    <div className="min-h-dvh bg-cream flex flex-col">
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Mesas />} />
          <Route path="/comanda/:pedidoId" element={<Comanda />} />
          <Route path="/cobro/:pedidoId" element={<Cobro />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/menu" element={<AdminMenu />} />
        </Routes>
      </main>

      {!ocultarNav && (
        <nav
          className="sticky bottom-0 bg-surface/95 backdrop-blur border-t border-carbon-400/15 flex justify-around"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <NavTab to="/" label="Mesas" icon={LayoutGrid} />
          <NavTab to="/menu" label="Menú" icon={ClipboardList} />
          <NavTab to="/estadisticas" label="Ventas" icon={LineChart} />
        </nav>
      )}
    </div>
  )
}

function NavTab({
  to,
  label,
  icon: Icon,
}: {
  to: string
  label: string
  icon: typeof LayoutGrid
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 min-w-[64px] px-4 py-2.5 text-xs font-medium transition-colors ${
          isActive ? 'text-chile-600' : 'text-carbon-500'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
          <span>{label}</span>
          <span
            className={`mt-0.5 h-1 w-1 rounded-full transition-opacity ${
              isActive ? 'bg-chile-600 opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}
    </NavLink>
  )
}

export default App
