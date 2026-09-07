import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado en la app:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center bg-cream">
          <p className="font-display text-xl font-semibold text-carbon-800">Algo salió mal</p>
          <p className="text-carbon-500 max-w-xs">
            Ocurrió un error inesperado. Si la página se quedó en blanco, recárgala para volver a
            cargar la versión más reciente de la app.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-chile-600 hover:bg-chile-700 text-white px-5 py-3 rounded-xl font-medium active:scale-95 transition cursor-pointer min-h-[44px]"
          >
            <RefreshCw size={18} />
            Recargar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
