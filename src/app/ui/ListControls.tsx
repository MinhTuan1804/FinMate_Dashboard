import type { ReactNode } from 'react';

/** Ô tìm kiếm trong thanh lọc. Gõ vào là gọi lại API (qua `useServerList`), không lọc tại chỗ. */
export const SearchField = ({ value, onChange, placeholder = 'Gõ để tìm…', label = 'Tìm kiếm' }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string }) =>
  <label>{label}<input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete="off"/></label>;

/** "x–y / tổng" và nút trang cho API trả `total` (offset/limit). Một trang thì chỉ hiện tổng. */
export function OffsetPager({ offset, limit, total, onChange, children }: { offset: number; limit: number; total: number; onChange: (offset: number) => void; children?: ReactNode }) {
  if (total === 0) return null;
  const from = offset + 1, to = Math.min(offset + limit, total);
  return <div className="fm-pagination"><span>{from}–{to} / {total}</span>{children}
    {total > limit && <>
      <button className="btn btn--small" disabled={offset <= 0} onClick={() => onChange(Math.max(0, offset - limit))}>Trang trước</button>
      <button className="btn btn--small" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>Trang sau</button></>}
  </div>;
}
