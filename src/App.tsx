import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '@/lib/contexts/language-context';
import { ThemeProvider } from '@/lib/contexts/theme-context';
import { DisplayProvider } from '@/lib/contexts/display-context';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { WebSocketProvider } from '@/lib/contexts/websocket-context';
import { UnreadMessagesProvider } from '@/lib/contexts/unread-messages-context';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <DisplayProvider>
            <AuthProvider>
              <WebSocketProvider>
                <UnreadMessagesProvider>
                  <RouterProvider router={router} />
                </UnreadMessagesProvider>
              </WebSocketProvider>
            </AuthProvider>
          </DisplayProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
