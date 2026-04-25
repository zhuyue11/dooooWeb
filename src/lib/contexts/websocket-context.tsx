import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CONFIG, STORAGE_KEYS } from '../config';
import { useAuth } from './auth-context';

export interface WsEvent {
  type: string;
  data?: any;
  timestamp?: number;
}

type WsSubscriber = (event: WsEvent) => void;

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (callback: WsSubscriber) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  subscribe: () => () => {},
});

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const subscribersRef = useRef<Set<WsSubscriber>>(new Set());

  const subscribe = useCallback((callback: WsSubscriber) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    function dispatchCacheInvalidation(event: WsEvent) {
      switch (event.type) {
        case 'task_created':
        case 'task_updated':
        case 'task_deleted':
        case 'task_assigned':
          queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-recurring-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-assigned-group-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-task-instances'] });
          queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['todo-assigned-group-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-week'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-upcoming'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-assigned-group-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-past'] });
          queryClient.invalidateQueries({ queryKey: ['group-calendar-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['group-calendar-recurring-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['group-todo'] });
          if (event.data?.taskId) {
            queryClient.invalidateQueries({ queryKey: ['task', event.data.taskId] });
          }
          break;

        case 'task_participation_updated':
        case 'task_participants_invited':
          queryClient.invalidateQueries({ queryKey: ['completion-stats'] });
          queryClient.invalidateQueries({ queryKey: ['participation-status'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-assigned-group-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['todo-assigned-group-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-assigned-group-tasks'] });
          break;

        case 'notification':
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-count'] });
          break;

        // Chat events (group_message, message_edited, message_deleted)
        // are handled by the useGroupChat hook via subscribe — not here.
      }
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

      ws.onmessage = (rawEvent) => {
        try {
          const event: WsEvent = JSON.parse(rawEvent.data);
          subscribersRef.current.forEach((cb) => cb(event));
          dispatchCacheInvalidation(event);
        } catch {
          // Ignore non-JSON messages (pings, etc.)
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
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
  }, [isAuthenticated, queryClient]);

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}

/**
 * Subscribe to WebSocket events. The callback is called for every incoming
 * WS message. Filter by `event.type` inside your callback.
 * Automatically unsubscribes on unmount.
 */
export function useWebSocketSubscription(
  callback: WsSubscriber,
  deps: React.DependencyList,
) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe(callback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, ...deps]);
}
