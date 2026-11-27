import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Flag, HeartPulse, Image as ImageIcon, Inbox, ShieldCheck, Trash2, UserCheck, type LucideIcon } from 'lucide-react';
import { api, errorText, getData, getEnvelope } from '../../shared/api';
import { unpackPage } from '../../shared/listState';

/** Khớp DTO backend `OpsNotificationDto` (docs/ops-api.md, mục "Thông báo cho đội vận hành"). */
export type OpsNotification = {
  id: string; type: string; title: string; body: string; relatedEntityType: string | null; relatedEntityId: string | null; createdAt: string; readAt: string | null;
};

const PAGE = 20;
const POLL_MS = 30_000;
const LIST_KEY = '/ops/notifications';
const COUNT_KEY = '/ops/notifications/unread-count';

const TYPE_ICON: Record<string, LucideIcon> = {
  ticket_new: Inbox, ticket_assigned: UserCheck, ticket_escalated: Inbox,
  approval_pending: ShieldCheck, approval_decided: ShieldCheck,
  incident_opened: HeartPulse, community_report: Flag, community_image_pending: ImageIcon, data_deletion_requested: Trash2,
};

/** Mục liên quan -> trang trên web. Chỉ đường dẫn, không mang dữ liệu; trang đích tự kiểm quyền như bình thường. */
function notificationRoute(item: Pick<OpsNotification, 'relatedEntityType' | 'relatedEntityId'>): string | null {
  switch (item.relatedEntityType) {
    case 'SupportTicket': return item.relatedEntityId ? `/ops/tickets/${item.relatedEntityId}` : '/ops/tickets';
    case 'OpsApproval': return '/ops/approvals';
    case 'OpsIncident': return '/ops/monitoring';
    case 'CommunityPost':
    case 'CommunityComment': return '/ops/community';
    case 'DataDeletionRequest': return '/data-deletion';
    default: return null;
  }
}

function timeAgo(iso: string, now = Date.now()): string {
  if (Number.isNaN(new Date(iso).getTime())) return '';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

function useDebounced(value: string, ms = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(timer); }, [value, ms]);
  return debounced;
}

/** Chuông trên thanh đầu trang: số chưa đọc, danh sách phân trang và tìm kiếm ở server, đánh dấu đã đọc, bấm để tới mục liên quan. */
/** `go` là hàm chuyển trang của khung ứng dụng: nó hỏi các trang đang sửa dở trước khi đi, nên chuông không tự navigate. */
export function NotificationBell({ go }: { go: (to: string) => void }) {
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [text, setText] = useState('');
  const search = useDebounced(text.trim());
  const root = useRef<HTMLDivElement>(null);
  const client = useQueryClient();

  const count = useQuery({ queryKey: [COUNT_KEY], queryFn: ({ signal }) => getData<{ unread: number }>(COUNT_KEY, undefined, signal), refetchInterval: POLL_MS });
  const unread = count.data?.unread ?? 0;

  const list = useInfiniteQuery({
    queryKey: [LIST_KEY, { unreadOnly, search }],
    enabled: open,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => getEnvelope<unknown>(LIST_KEY, { unreadOnly: unreadOnly || undefined, search: search || undefined, limit: PAGE, offset: pageParam }, signal),
    getNextPageParam: (last, pages) => {
      // unpackPage nhận cả dạng mới (data là mảng, total ở meta) lẫn dạng `{ items, total }` của bản backend cũ.
      const loaded = pages.reduce((sum, page) => sum + unpackPage<OpsNotification>(page.data, page.meta?.total).rows.length, 0);
      return loaded < unpackPage<OpsNotification>(last.data, last.meta?.total).total ? loaded : undefined;
    },
    refetchInterval: open ? POLL_MS : false,
  });
  const items = list.data?.pages.flatMap(page => unpackPage<OpsNotification>(page.data, page.meta?.total).rows) ?? [];

  const refresh = () => { void client.invalidateQueries({ queryKey: [LIST_KEY] }); void client.invalidateQueries({ queryKey: [COUNT_KEY] }); };
  const markRead = useMutation({ mutationFn: (id: string) => api.post(`${LIST_KEY}/${id}/read`), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => api.post(`${LIST_KEY}/read-all`), onSuccess: refresh });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    // Cùng việc với nút khiên cũ: mở chuông là lấy lại quyền hiện hành, nên đổi vai trò xong khỏi phải đăng nhập lại để thấy menu mới.
    if (next) void client.invalidateQueries({ queryKey: ['/ops/me'] });
  }

  function openItem(item: OpsNotification) {
    if (!item.readAt) markRead.mutate(item.id);
    const to = notificationRoute(item);
    if (!to) return;
    setOpen(false);
    go(to);
  }

  const label = unread > 0 ? `Thông báo, ${unread} chưa đọc` : 'Thông báo';
  return <div className="notif" ref={root}>
    <button className="topbar__icon-btn notif__button" aria-label={label} title="Thông báo" aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
      <Bell size={18} />
      {unread > 0 && <span className="notif__badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <div className="notif__panel" role="dialog" aria-label="Thông báo">
      <div className="notif__head">
        <strong>Thông báo</strong>
        <button className="notif__action" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck size={14} /> Đã đọc hết</button>
      </div>
      <div className="notif__tools">
        <div className="notif__tabs" role="tablist" aria-label="Lọc thông báo">
          <button role="tab" aria-selected={!unreadOnly} className={!unreadOnly ? 'is-active' : ''} onClick={() => setUnreadOnly(false)}>Tất cả</button>
          <button role="tab" aria-selected={unreadOnly} className={unreadOnly ? 'is-active' : ''} onClick={() => setUnreadOnly(true)}>Chưa đọc{unread > 0 ? ` (${unread})` : ''}</button>
        </div>
        <input type="search" aria-label="Tìm thông báo" placeholder="Tìm thông báo…" value={text} onChange={event => setText(event.target.value)} autoComplete="off" />
      </div>
      <ul className="notif__list">
        {items.map(item => {
          const Icon = TYPE_ICON[item.type] ?? Bell;
          return <li key={item.id}>
            <button className={`notif__item ${item.readAt ? '' : 'notif__item--unread'}`} onClick={() => openItem(item)}>
              <span className="notif__icon" aria-hidden="true"><Icon size={16} /></span>
              <span className="notif__text"><strong>{item.title}</strong><span>{item.body}</span><small>{timeAgo(item.createdAt)}</small></span>
              {!item.readAt && <span className="notif__dot" aria-label="Chưa đọc" />}
            </button>
          </li>;
        })}
      </ul>
      {list.isPending && <p className="notif__empty">Đang tải…</p>}
      {list.error && <p className="notif__empty" role="alert">{errorText(list.error)} <button className="notif__action" onClick={() => void list.refetch()}>Thử lại</button></p>}
      {!list.isPending && !list.error && items.length === 0 && <p className="notif__empty">{search ? 'Không có thông báo phù hợp.' : unreadOnly ? 'Bạn đã đọc hết thông báo.' : 'Chưa có thông báo nào.'}</p>}
      {list.hasNextPage && <button className="notif__action notif__more" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>{list.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}</button>}
    </div>}
  </div>;
}
