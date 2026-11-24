import { DialogOverlay } from './ui/DialogOverlay';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, errorText, getAllPages } from '../shared/api';
import type { AdminCategory, AllocationGroup, ParamDef } from '../shared/models';
import { PageError } from './Shared';

type Row = Record<string, unknown>;

const MAX_GROUPS = 8;
/** T1/T2 là ngưỡng cảnh báo, không phải phần chia thu nhập. */
const THRESHOLD_KEYS = ['t1_pct', 't2_pct'];
const KIND_LABEL = { spend: 'Nhóm chi (có trần theo %)', save: 'Để dành (không chứa danh mục)' } as const;

const asParams = (value: unknown): ParamDef[] =>
  Array.isArray(value) ? value.filter((p): p is ParamDef => !!p && typeof (p as ParamDef).key === 'string' && typeof (p as ParamDef).type === 'string') : [];
const asGroups = (value: unknown): AllocationGroup[] =>
  Array.isArray(value) ? value.filter((g): g is AllocationGroup => !!g && typeof (g as AllocationGroup).kind === 'string').map(g => ({ ...g, categories: g.categories ?? [] })) : [];

/** Quy tắc giống backend (FinanceCatalogValidation.Allocation) để báo sớm trước khi lưu; backend vẫn kiểm lại. */
function problemsOf(groups: AllocationGroup[], percentKeys: Set<string>): string[] {
  const problems: string[] = [];
  if (groups.length > MAX_GROUPS) problems.push(`Tối đa ${MAX_GROUPS} nhóm.`);
  if (groups.filter(g => g.kind === 'spend' && !g.key).length > 1) problems.push('Chỉ được một nhóm chi "phần còn lại" (không gắn tham số %).');
  const seen = new Set<string>();
  groups.forEach((group, index) => {
    const at = `Nhóm ${index + 1}`;
    if (!group.label.trim() || group.label.trim().length > 40) problems.push(`${at}: tên từ 1 đến 40 ký tự.`);
    if (group.key && !percentKeys.has(group.key)) problems.push(`${at}: tham số % không còn tồn tại.`);
    if (group.kind === 'save' && !group.key) problems.push(`${at}: nhóm để dành phải gắn một tham số %.`);
    for (const slug of group.categories) {
      if (seen.has(slug)) problems.push(`${at}: danh mục "${slug}" đã thuộc nhóm khác.`);
      seen.add(slug);
    }
  });
  return problems;
}

/**
 * Bảng phân bổ của kế hoạch tháng: nhóm % thu nhập → danh mục chi. Ứng dụng dùng nó để đặt hạn mức từng danh mục sau khảo sát
 * (vượt trần nhóm thì co phần chi linh hoạt, phần dư vào để dành). Danh mục không thuộc nhóm nào thì không bị giới hạn.
 */
export function AllocationEditor({ method, onClose, onSaved }: { method: Row; onClose: () => void; onSaved: () => void }) {
  const params = useMemo(() => asParams(method.paramDefs).filter(p => p.type === 'percent' && !THRESHOLD_KEYS.includes(p.key)), [method]);
  const percentKeys = useMemo(() => new Set(params.map(p => p.key)), [params]);
  const original = useMemo(() => asGroups(method.allocation), [method]);
  const [groups, setGroups] = useState<AllocationGroup[]>(original);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    // Danh mục đang bật, cộng danh mục đã tắt nhưng đang nằm trong bảng đã lưu (hiện để admin bỏ tick được; backend chỉ từ chối THÊM danh mục đã tắt).
    // "Cho vay / Mượn" và "Thu nhập" không phải khoản chi.
    const stored = new Set(original.flatMap(g => g.categories));
    getAllPages<AdminCategory>('/admin/categories', { includeInactive: true })
      .then(list => { if (live) setCategories(list.filter(c => c.slug !== 'loan' && c.slug !== 'income' && (c.isActive || stored.has(c.slug)))); })
      .catch(e => { if (live) setError(errorText(e)); });
    return () => { live = false; };
  }, [original]);

  const problems = problemsOf(groups, percentKeys);
  const dirty = JSON.stringify(groups) !== JSON.stringify(original);
  const update = (index: number, patch: Partial<AllocationGroup>) => setGroups(list => list.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  const toggleCategory = (index: number, slug: string) => {
    const current = groups[index].categories;
    update(index, { categories: current.includes(slug) ? current.filter(s => s !== slug) : [...current, slug] });
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (problems.length) return;
    setBusy(true);
    try {
      const allocation = groups.map(g => ({ key: g.key || null, label: g.label.trim(), kind: g.kind, categories: g.kind === 'save' ? [] : g.categories }));
      await api.patch(`/admin/finance-methods/${String(method.id)}`, { allocation });
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogOverlay onClose={onClose} guardChanges dirty={dirty} busy={busy}>
      <form className="fm-modal fm-modal--wide" role="dialog" aria-modal="true" aria-label={`Phân bổ kế hoạch tháng ${String(method.name)}`} onSubmit={save}>
        <div className="fm-modal-head">
          <h2>Phân bổ kế hoạch tháng · {String(method.name)}</h2>
          <button type="button" className="btn" onClick={onClose} data-dialog-close>Đóng</button>
        </div>
        <div className="fm-form">
          <p className="fm-hint">
            Sau khảo sát, ứng dụng đặt hạn mức từng danh mục theo bảng này: chi khai báo trong nhóm vượt trần (thu nhập × %) thì co phần chi linh hoạt cho vừa,
            phần dư cuối tháng so với mức để dành. Tỷ lệ % lấy từ tham số của chính cách này (người dùng có thể đã chỉnh).
          </p>
          <PageError message={error} />
          {problems.length > 0 && <ul className="fm-error-text">{problems.map(p => <li key={p}>{p}</li>)}</ul>}
          {groups.map((group, index) => {
            const takenElsewhere = new Set(groups.flatMap((other, i) => (i === index ? [] : other.categories)));
            return (
              <fieldset className="fm-jar" key={index}>
                <legend>Nhóm {index + 1}</legend>
                <label className="fm-field">
                  Tên nhóm
                  <input required maxLength={40} value={group.label} onChange={e => update(index, { label: e.target.value })} />
                </label>
                <label className="fm-field">
                  Loại
                  <select value={group.kind} onChange={e => update(index, { kind: e.target.value as AllocationGroup['kind'] })}>
                    {(Object.keys(KIND_LABEL) as AllocationGroup['kind'][]).map(kind => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
                  </select>
                </label>
                <label className="fm-field">
                  Tỷ lệ thu nhập (tham số kiểu %)
                  <select value={group.key ?? ''} onChange={e => update(index, { key: e.target.value || null })}>
                    {group.kind === 'spend' && <option value="">Phần còn lại (không giới hạn)</option>}
                    {group.kind === 'save' && !group.key && <option value="">Chọn tham số…</option>}
                    {params.map(p => <option key={p.key} value={p.key}>{p.label} (mặc định {p.default}%)</option>)}
                  </select>
                </label>
                {group.kind === 'spend' && (
                  <fieldset className="fm-keys">
                    <legend>Danh mục thuộc nhóm ({group.categories.length})</legend>
                    {categories.length === 0 && <small>Đang tải danh mục...</small>}
                    {categories.map(category => {
                      const checked = group.categories.includes(category.slug);
                      const taken = takenElsewhere.has(category.slug);
                      return (
                        <label className="fm-inline" key={category.slug}>
                          <input type="checkbox" checked={checked} disabled={(taken || !category.isActive) && !checked} onChange={() => toggleCategory(index, category.slug)} />
                          {category.name}
                          {taken && !checked && <small>(đã thuộc nhóm khác)</small>}
                          {!category.isActive && <small>(đã tắt — chỉ bỏ ra được)</small>}
                        </label>
                      );
                    })}
                  </fieldset>
                )}
                <button type="button" className="btn btn--small" onClick={() => setGroups(list => list.filter((_, i) => i !== index))}><Trash2 size={14} /> Xóa nhóm</button>
              </fieldset>
            );
          })}
          <div className="fm-toolbar">
            <button type="button" className="btn" disabled={groups.length >= MAX_GROUPS} onClick={() => setGroups(list => [...list, { key: null, label: 'Nhóm mới', kind: 'spend', categories: [] }])}>
              <Plus size={14} /> Thêm nhóm
            </button>
            {params.length === 0 && <small>Cách này chưa có tham số kiểu % nào: chỉ dùng được nhóm "phần còn lại".</small>}
          </div>
        </div>
        <div className="fm-modal-foot">
          <button type="button" className="btn" onClick={onClose} data-dialog-close>Hủy</button>
          <button className="btn btn--primary" disabled={busy || !dirty || problems.length > 0}>{busy ? 'Đang lưu...' : 'Lưu phân bổ'}</button>
        </div>
      </form>
    </DialogOverlay>
  );
}
