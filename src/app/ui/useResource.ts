import { useQuery } from '@tanstack/react-query';
import { errorText, getEnvelope } from '../../shared/api';

/** The API response stays visible during a failed refresh; callers label it as stale. */
export function useResource<T>(path: string, params: Record<string, unknown> = {}, enabled = true) {
  const query = useQuery({ queryKey: [path, params], queryFn: ({ signal }) => getEnvelope<T>(path, params, signal), enabled });
  return {
    data: query.data?.data, meta: query.data?.meta, loading: query.isPending && enabled,
    refreshing: query.isFetching, error: query.error ? errorText(query.error) : '',
    updatedAt: query.dataUpdatedAt, reload: () => { void query.refetch(); },
  };
}
