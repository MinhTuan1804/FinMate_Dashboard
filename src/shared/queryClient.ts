import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const queryClient = new QueryClient({ defaultOptions: { queries: {
  staleTime: 15_000, refetchOnWindowFocus: false,
  retry: (count, error) => count < 1 && (!axios.isAxiosError(error) || !error.response || error.response.status >= 500),
} } });
