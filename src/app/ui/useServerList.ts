import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorText, getEnvelope } from '../../shared/api';

type Params = Record<string, unknown>;
type Options = { params?: Params; limit?: number; searchParam?: string; debounceMs?: number; enabled?: boolean };

/** Hai dạng phản hồi danh sách của hệ thống: backend .NET (`data` là mảng, `meta.total`) và ai-service/ops tickets (`data` là `{items,total}`). */
function unpack<T>(data: unknown, total?: number): { rows: T[]; total: number } {
  if (Array.isArray(data)) return { rows: data as T[], total: total ?? data.length };
  const page = data as { items?: T[]; total?: number } | null;
  const rows = page?.items ?? [];
  return { rows, total: page?.total ?? total ?? rows.length };
}

/** Ô tìm kiếm có trì hoãn: `search` đổi theo từng phím, `query` (giá trị gửi lên API) chỉ đổi sau `debounceMs`; xóa trắng thì áp dụng ngay. */
function useDebouncedSearch(debounceMs: number) {
  const [search, setSearchText] = useState(''), [query, setQuery] = useState('');
  useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(() => setQuery(search.trim()), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);
  const setSearch = useCallback((value: string) => {
    setSearchText(value);
    if (!value.trim()) setQuery('');
  }, []);
  return { search, query, setSearch };
}

/**
 * Danh sách do SERVER cắt trang (offset/limit) và tìm kiếm: đổi từ khóa, bộ lọc hay trang thì gọi lại API, không tải hết rồi lọc ở trình duyệt.
 * Đổi từ khóa/bộ lọc thì về trang đầu; kết quả của request cũ đến muộn bị bỏ để không ghi đè kết quả mới.
 */
export function useServerList<T>(path: string, { params = {}, limit = 20, searchParam = 'search', debounceMs = 400, enabled = true }: Options = {}) {
  const { search, query, setSearch } = useDebouncedSearch(debounceMs);
  const [state, setState] = useState({ scope: '', offset: 0 });
  const [data, setData] = useState<{ rows: T[]; total: number }>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(enabled), [error, setError] = useState(''), [tick, setTick] = useState(0);

  const scope = JSON.stringify([path, params, query, limit]);
  const offset = state.scope === scope ? state.offset : 0;   // đổi từ khóa/bộ lọc → về trang đầu mà không cần effect

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    queueMicrotask(async () => {
      if (!current) return;
      setLoading(true);
      try {
        const envelope = await getEnvelope<unknown>(path, { ...params, [searchParam]: query || undefined, limit, offset });
        if (!current) return;
        const page = unpack<T>(envelope.data, envelope.meta?.total);
        if (page.rows.length === 0 && page.total > 0 && offset > 0) {   // xóa hết dòng của trang cuối → lùi về trang cuối còn dữ liệu
          setState({ scope, offset: Math.floor((page.total - 1) / limit) * limit });
          return;
        }
        setData(page);
        setError('');
      } catch (e) {
        if (current) setError(errorText(e));
      } finally {
        if (current) setLoading(false);
      }
    });
    return () => { current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `params` đã nằm trong `scope` (JSON), tránh gọi lại mỗi lần render vì object mới
  }, [path, scope, offset, limit, searchParam, tick, enabled]);

  const setOffset = useCallback((value: number) => setState({ scope, offset: Math.max(0, value) }), [scope]);
  const reload = useCallback(() => setTick(n => n + 1), []);

  return { rows: data.rows, total: data.total, offset, limit, loading, error, search, setSearch, setOffset, reload };
}

/** Như `useServerList` nhưng cho API phân trang bằng cursor (bảng lớn: người dùng, nhật ký): chỉ có "trang trước/sau", không có tổng. */
export function useCursorList<T>(path: string, { params = {}, limit = 20, searchParam = 'search', debounceMs = 400 }: Omit<Options, 'enabled'> = {}) {
  const { search, query, setSearch } = useDebouncedSearch(debounceMs);
  const [state, setState] = useState<{ scope: string; stack: (string | null)[] }>({ scope: '', stack: [null] });
  const [data, setData] = useState<{ rows: T[]; next: string | null }>({ rows: [], next: null });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [tick, setTick] = useState(0);

  const scope = JSON.stringify([path, params, query, limit]);
  const stack = useMemo(() => (state.scope === scope ? state.stack : [null]), [state, scope]);   // đổi từ khóa/bộ lọc → về trang đầu
  const cursor = stack.at(-1) ?? null;

  useEffect(() => {
    let current = true;
    queueMicrotask(async () => {
      if (!current) return;
      setLoading(true);
      try {
        const envelope = await getEnvelope<T[]>(path, { ...params, [searchParam]: query || undefined, cursor: cursor ?? undefined, limit });
        if (!current) return;
        setData({ rows: envelope.data, next: envelope.meta?.cursor ?? null });
        setError('');
      } catch (e) {
        if (current) setError(errorText(e));
      } finally {
        if (current) setLoading(false);
      }
    });
    return () => { current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `params` đã nằm trong `scope` (JSON)
  }, [path, scope, cursor, limit, searchParam, tick]);

  const next = useCallback(() => data.next && setState({ scope, stack: [...stack, data.next] }), [data.next, scope, stack]);
  const back = useCallback(() => setState({ scope, stack: stack.slice(0, -1) }), [scope, stack]);
  const reload = useCallback(() => setTick(n => n + 1), []);

  return { rows: data.rows, hasBack: stack.length > 1, hasNext: Boolean(data.next), loading, error, search, setSearch, next, back, reload };
}
