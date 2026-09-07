import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WS_URL } from '../api/client'

interface EventoServidor {
  tipo: 'mesas_actualizadas' | 'pedido_actualizado'
  pedido_id?: number
}

export function useWebSocket() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let socket: WebSocket
    let reconnectTimer: ReturnType<typeof setTimeout>

    function connect() {
      socket = new WebSocket(WS_URL)

      socket.onmessage = (event) => {
        try {
          const data: EventoServidor = JSON.parse(event.data)
          if (data.tipo === 'mesas_actualizadas') {
            queryClient.invalidateQueries({ queryKey: ['mesas'] })
          } else if (data.tipo === 'pedido_actualizado') {
            queryClient.invalidateQueries({ queryKey: ['pedidos'] })
            if (data.pedido_id) {
              queryClient.invalidateQueries({ queryKey: ['pedido', data.pedido_id] })
            }
          }
        } catch {
          // ignorar mensajes no válidos
        }
      }

      socket.onclose = () => {
        reconnectTimer = setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [queryClient])
}
