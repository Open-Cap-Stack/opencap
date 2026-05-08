'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useState } from 'react';
import { AuthProvider } from '@/lib/AuthContext';
import { GAPageTracker } from '@/components/GAPageTracker';

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30000 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={null}>
          <GAPageTracker />
        </Suspense>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
