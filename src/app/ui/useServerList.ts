import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lastOffset, nonNegativeInt, unpackPage } from '../../shared/listState';
import { useResource } from './useResource';

type Params = Record<string, unknown>;
type Options = { params?: Params; limit?: number; searchParam?: string; debounceMs?: number; enabled?: boolean };

function useListLocation(path: string, params: Params, debounceMs: number) {
  const [url, setUrl] = useSearchParams();
  const prefix = `${path.split('/').filter(Boolean).at(-1)}.`;
  const searchKey = `${prefix}search`, pageKey = `${prefix}offset`, cursorKey = `${prefix}cursor`;
  const committed = url.get(searchKey) || '';
  const [search, setText] = useState(committed);
  const paramScope = JSON.stringify(params);
  const previous = useRef(paramScope);
  const write = useCallback((key: string, value: string, reset = false) => {
    setUrl(current => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value); else next.delete(key);
      if (reset) { next.delete(pageKey); next.delete(cursorKey); }
      return next;
    }, { replace: true });
  }, [setUrl, pageKey, cursorKey]);
  useEffect(() => { queueMicrotask(() => setText(committed)); }, [committed]);
  useEffect(() => {
    if (search.trim() === committed) return;
    const timer = setTimeout(() => write(searchKey, search.trim(), true), search.trim() ? debounceMs : 0);
    return () => clearTimeout(timer);
  }, [search, committed, debounceMs, write, searchKey]);
  useEffect(() => {
    if (previous.current !== paramScope) { previous.current = paramScope; write(pageKey, '', true); }
  }, [paramScope, write, pageKey]);
  return { url, write, search, setSearch: setText, query: committed, pageKey, cursorKey };
}

/** Server pagination, shareable URL, request cancellation and a shared query cache. */
export function useServerList<T>(path: string, { params = {}, limit = 20, searchParam = 'search', debounceMs = 400, enabled = true }: Options = {}) {
  const location = useListLocation(path, params, debounceMs);
  const offset = nonNegativeInt(location.url.get(location.pageKey));
  const resource = useResource<unknown>(path, { ...params, [searchParam]: location.query || undefined, limit, offset }, enabled);
  const page = unpackPage<T>(resource.data, resource.meta?.total);
  const {write,pageKey}=location;
  const setOffset = useCallback((value: number) => write(pageKey, String(Math.max(0, value))), [write,pageKey]);
  useEffect(() => {
    if (!resource.loading && !resource.error && page.rows.length === 0 && page.total > 0 && offset > 0) setOffset(lastOffset(page.total, limit));
  }, [resource.loading, resource.error, page.rows.length, page.total, offset, limit, setOffset]);
  return { ...resource, ...page, offset, limit, search: location.search, setSearch: location.setSearch, setOffset };
}

/** Cursor itself is shareable; the in-session stack provides Previous without inventing offsets. */
export function useCursorList<T>(path: string, { params = {}, limit = 20, searchParam = 'search', debounceMs = 400 }: Omit<Options, 'enabled'> = {}) {
  const location = useListLocation(path, params, debounceMs);
  const cursor = location.url.get(location.cursorKey) || null;
  const [stack, setStack] = useState<(string | null)[]>([]);
  const scope = JSON.stringify([path, params, location.query]);
  const previousScope = useRef(scope);
  useEffect(() => { if (previousScope.current !== scope) { previousScope.current = scope; queueMicrotask(() => setStack([])); } }, [scope]);
  const resource = useResource<T[]>(path, { ...params, [searchParam]: location.query || undefined, limit, cursor: cursor || undefined });
  const nextCursor = resource.meta?.cursor || null;
  function next() { if (nextCursor) { setStack(s => [...s, cursor]); location.write(location.cursorKey, nextCursor); } }
  function back() { location.write(location.cursorKey, stack.at(-1) || ''); setStack(s => s.slice(0, -1)); }
  return { ...resource, rows: resource.data || [], hasBack: Boolean(cursor), hasNext: Boolean(nextCursor), search: location.search, setSearch: location.setSearch, next, back };
}
