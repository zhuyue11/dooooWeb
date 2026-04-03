import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CONFIG, STORAGE_KEYS } from '../config';
import { useAuth } from './auth-context';

interface WebSocketContextType {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ isConnected: false });

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isAuthenticated) {
      // Disconnect when logged out
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    function connect() {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return;

      const ws = new WebSocket(`${CONFIG.WS_BASE_URL}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Reconnect with exponential backoff
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current);
          reconnectAttempts.current++;
          reconnectTimeout.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [isAuthenticated]);

  return (
    <WebSocketContext.Provider value={{ isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
