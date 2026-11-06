import { DialogOverlay } from './ui/DialogOverlay';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { api, errorText, getAllPages, getData } from '../shared/api';
import type { AdminCategory, HomeBlock, HomeBlockType, JarDef, ParamDef } from '../shared/models';
import { PageError } from './Shared';

type Row = Record<string, unknown>;

const MAX_BLOCKS = 8;
const MAX_JARS = 8;
/** T1/T2 cũng là tham số kiểu % nhưng là ngưỡng cảnh báo, không phải phần chia thu nhập: không dùng làm hũ (backend cũng từ chối). */
const THRESHOLD_KEYS = ['t1_pct', 't2_pct'];
const jarShareParams = (params: ParamDef[]) => params.filter(param => param.type === 'percent' && !THRESHOLD_KEYS.includes(param.key));
const DISPLAY_LABEL = { list: 'Danh sách', allocation: 'Chia phần trăm thu nhập' } as const;

function isParamDef(value: unknown): value is ParamDef {
  const item = value as Partial<ParamDef> | null;
  return !!item && typeof item.key === 'string' && typeof item.type === 'string' && typeof item.default === 'number';
}
const asParams = (value: unknown): ParamDef[] => (Array.isArray(value) ? value.filter(isParamDef) : []);
const asBlocks = (value: unknown): HomeBlock[] =>
  Array.isArray(value) ? value.filter((item): item is HomeBlock => !!item && typeof (item as HomeBlock).type === 'string') : [];

function formatParam(def: ParamDef, value: number): string {
  switch (def.type) {
    case 'percent': return `${value}%`;
    case 'minutes': return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    case 'cents': return `${value.toLocaleString('vi-VN')} ₫`;
    default: return String(value);
  }
}

/** Chỉ giữ trường có nghĩa, đúng hình dạng mà backend kiểm. */
function clean(blocks: HomeBlock[]): HomeBlock[] {
  return blocks.map(block => ({
    type: block.type,
    ...(block.title?.trim() ? { title: block.title.trim() } : {}),
    ...(block.keys?.length ? { keys: block.keys } : {}),
    ...(block.display ? { display: block.display } : {}),
    ...(block.jars ? { jars: block.jars.map(jar => ({ key: jar.key, ...(jar.label?.trim() ? { label: jar.label.trim() } : {}), categories: jar.categories })) } : {}),
  }));
}

/** Quy tắc của khối "hũ" (cùng backend): mỗi hũ một tham số kiểu %, một tham số và một danh mục chỉ thuộc một hũ, tổng tỷ lệ mặc định không quá 100%. */
function jarProblems(label: string, jars: JarDef[], params: ParamDef[]): string[] {
  const problems: string[] = [];
  if (jars.length < 1 || jars.length > MAX_JARS) problems.push(`${label}: cần từ 1 đến ${MAX_JARS} hũ.`);
  const keys = new Set<string>();
  const slugs = new Set<string>();
  let total = 0;
  jars.forEach((jar, index) => {
    const param = params.find(item => item.key === jar.key);
    if (!param || param.type !== 'percent') problems.push(`${label}, hũ ${index + 1}: phải gắn với một tham số kiểu %.`);
    else if (THRESHOLD_KEYS.includes(param.key)) problems.push(`${label}, hũ ${index + 1}: ngưỡng cảnh báo (T1/T2) không dùng làm phần chia của hũ.`);
    else if (keys.has(jar.key)) problems.push(`${label}, hũ ${index + 1}: tham số "${param.label}" đã dùng cho hũ khác.`);
    else total += param.default;
    keys.add(jar.key);
    for (const slug of jar.categories) {
      if (slugs.has(slug)) problems.push(`${label}, hũ ${index + 1}: danh mục "${slug}" đã thuộc hũ khác.`);
      slugs.add(slug);
    }
  });
  if (total > 100) problems.push(`${label}: tổng tỷ lệ mặc định các hũ là ${total}%, vượt 100%.`);
  return problems;
}

/** Cùng quy tắc với backend (FinanceCatalogValidation.HomeLayout) để báo lỗi ngay; backend vẫn là nơi quyết định. */
function findProblems(blocks: HomeBlock[], params: ParamDef[], types: HomeBlockType[]): string[] {
  const problems: string[] = [];
  if (blocks.length < 1) problems.push('Cần ít nhất 1 khối.');
  if (blocks.length > MAX_BLOCKS) problems.push(`Tối đa ${MAX_BLOCKS} khối.`);
  const seen = new Set<string>();
  blocks.forEach((block, index) => {
    const label = `Khối ${index + 1}`;
    const info = types.find(item => item.type === block.type);
    if (!info) { problems.push(`${label}: loại "${block.type}" app không còn vẽ được.`); return; }
    if (!info.repeatable && seen.has(block.type)) problems.push(`${label}: "${info.name}" chỉ được xuất hiện một lần.`);
    seen.add(block.type);
    if (block.keys?.some(key => !params.some(param => param.key === key))) problems.push(`${label}: có tham số không còn tồn tại.`);
    if (info.acceptsJars) problems.push(...jarProblems(label, block.jars ?? [], params));
    if (block.display === 'allocation') {
      const targets = block.keys?.length ? block.keys : params.map(param => param.key);
      const percent = targets.filter(key => params.find(param => param.key === key)?.type === 'percent');
      if (percent.length === 0 || (block.keys?.length && percent.length !== targets.length)) {
        problems.push(`${label}: dạng chia phần trăm chỉ dùng cho tham số kiểu %, và phải có ít nhất một tham số như vậy.`);
      }
    }
  });
  return problems;
}

/**
 * Chỉnh bố cục trang chủ của MỘT cách quản lý: chọn khối nào, thứ tự nào, khối tham số hiện tham số nào và vẽ dạng nào.
 * Lưu bằng PATCH nên tăng phiên bản của cách quản lý và ghi audit; app người dùng đọc bố cục này mỗi lần mở trang chủ.
 */
export function HomeLayoutEditor({ method, onClose, onSaved }: { method: Row; onClose: () => void; onSaved: () => void }) {
  const params = useMemo(() => asParams(method.paramDefs), [method]);
  const original = useMemo(() => clean(asBlocks(method.homeLayout)), [method]);
  const [blocks, setBlocks] = useState<HomeBlock[]>(original);
  const [types, setTypes] = useState<HomeBlockType[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [toAdd, setToAdd] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    getData<HomeBlockType[]>('/admin/finance-methods/home-blocks')
      .then(list => { if (live) setTypes(list); })
      .catch(e => { if (live) setError(errorText(e)); });
    // Danh mục hệ thống để gán vào hũ. "Cho vay / Mượn" không tính vào chi tiêu nên không đưa vào lựa chọn.
    getAllPages<AdminCategory>('/admin/categories', { includeInactive: true })
      .then(list => { if (live) setCategories(list.filter(category => category.slug !== 'loan')); })
      .catch(e => { if (live) setError(errorText(e)); });
    return () => { live = false; };
  }, []);

  const problems = findProblems(blocks, params, types);
  const dirty = JSON.stringify(clean(blocks)) !== JSON.stringify(original);
  const typeOf = (type: string) => types.find(item => item.type === type);
  const available = types.filter(item => item.repeatable || !blocks.some(block => block.type === item.type));

  const update = (index: number, patch: Partial<HomeBlock>) => setBlocks(list => list.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  const remove = (index: number) => setBlocks(list => list.filter((_, i) => i !== index));
  const move = (index: number, step: -1 | 1) => setBlocks(list => {
    const target = index + step;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const toggleKey = (index: number, key: string) => {
    const current = blocks[index].keys ?? [];
    const keys = current.includes(key) ? current.filter(item => item !== key) : [...current, key];
    update(index, { keys: keys.length ? keys : undefined });
  };
  const add = () => {
    const info = typeOf(toAdd || available[0]?.type || '');
    if (!info || blocks.length >= MAX_BLOCKS) return;
    // Khối hũ bắt đầu với một hũ gắn vào tham số % đầu tiên để không rơi vào trạng thái "chưa có hũ nào" (bị chặn khi lưu).
    const firstPercent = jarShareParams(params)[0];
    setBlocks(list => [...list, info.acceptsJars ? { type: info.type, jars: firstPercent ? [{ key: firstPercent.key, categories: [] }] : [] } : { type: info.type }]);
    setToAdd('');
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (problems.length) return;
    setBusy(true);
    try {
      await api.patch(`/admin/finance-methods/${String(method.id)}`, { homeLayout: clean(blocks) });
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogOverlay onClose={onClose} guardChanges dirty={dirty} busy={busy}>
      <form className="fm-modal fm-modal--wide" role="dialog" aria-modal="true" aria-label={`Bố cục trang chủ ${String(method.name)}`} onSubmit={save}>
        <div className="fm-modal-head">
          <h2>Trang chủ · {String(method.name)}</h2>
          <button type="button" className="btn" onClick={onClose} data-dialog-close>Đóng</button>
        </div>

        <div className="fm-layout-body">
          <div className="fm-layout-editor">
            <p className="fm-hint">
              Người dùng đang dùng cách này thấy các khối dưới đây theo đúng thứ tự, ở trang chủ app. Thêm hoặc bớt khối không cần phát hành lại app.
              Số liệu từng khối (tiền khả dụng, mục tiêu, tham số của người dùng) luôn lấy từ dữ liệu thật của họ.
            </p>
            <PageError message={error} />

            <ol className="fm-block-list">
              {blocks.map((block, index) => {
                const info = typeOf(block.type);
                return (
                  <li className="fm-block" key={`${block.type}-${index}`}>
                    <div className="fm-block-head">
                      <div>
                        <strong>{index + 1}. {info?.name ?? block.type}</strong>
                        <small>{info?.description ?? 'Loại khối này app không còn vẽ được; hãy xóa.'}</small>
                      </div>
                      <span className="fm-actions">
                        <button type="button" className="btn btn--small" aria-label={`Đưa khối ${index + 1} lên`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
                        <button type="button" className="btn btn--small" aria-label={`Đưa khối ${index + 1} xuống`} disabled={index === blocks.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
                        <button type="button" className="btn btn--small" aria-label={`Xóa khối ${index + 1}`} onClick={() => remove(index)}><Trash2 size={14} /></button>
                      </span>
                    </div>

                    <label className="fm-field">
                      Tiêu đề (để trống = dùng tiêu đề mặc định của app)
                      <input value={block.title ?? ''} maxLength={60} onChange={e => update(index, { title: e.target.value || undefined })} />
                    </label>

                    {info?.acceptsKeys && (
                      <fieldset className="fm-field fm-keys">
                        <legend>Tham số hiển thị (không chọn = hiện tất cả)</legend>
                        {params.length === 0 && <small>Cách quản lý này chưa có tham số nào.</small>}
                        {params.map(param => (
                          <label className="fm-inline" key={param.key}>
                            <input type="checkbox" checked={block.keys?.includes(param.key) ?? false} onChange={() => toggleKey(index, param.key)} />
                            {param.label} <small>({param.type === 'percent' ? '%' : param.type})</small>
                          </label>
                        ))}
                      </fieldset>
                    )}

                    {info?.acceptsJars && <JarsEditor jars={block.jars ?? []} params={params} categories={categories} onChange={jars => update(index, { jars })} />}

                    {info?.acceptsDisplay && (
                      <label className="fm-field">
                        Cách vẽ
                        <select value={block.display ?? 'list'} onChange={e => update(index, { display: e.target.value === 'list' ? undefined : (e.target.value as 'allocation') })}>
                          {(Object.keys(DISPLAY_LABEL) as (keyof typeof DISPLAY_LABEL)[]).map(key => <option key={key} value={key}>{DISPLAY_LABEL[key]}</option>)}
                        </select>
                      </label>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="fm-toolbar">
              <label className="fm-filter">
                Thêm khối
                <select value={toAdd} onChange={e => setToAdd(e.target.value)} disabled={!available.length}>
                  {!toAdd && <option value="">{available.length ? 'Chọn loại khối...' : 'Đã dùng hết các loại khối'}</option>}
                  {available.map(item => <option key={item.type} value={item.type}>{item.name}</option>)}
                </select>
              </label>
              <button type="button" className="btn" disabled={!toAdd || blocks.length >= MAX_BLOCKS} onClick={add}><Plus size={14} /> Thêm</button>
              <button type="button" className="btn btn--ghost" disabled={!dirty} onClick={() => setBlocks(original)}><RotateCcw size={14} /> Bỏ thay đổi</button>
            </div>

            {problems.length > 0 && (
              <ul className="error-box" role="alert">
                {problems.map(problem => <li key={problem}>{problem}</li>)}
              </ul>
            )}
          </div>

          <aside className="fm-layout-preview" aria-label="Xem trước cấu trúc trang chủ">
            <h3>Xem trước cấu trúc</h3>
            <p className="fm-hint">Tham số và bước bắt đầu là dữ liệu thật của cách này; các khối còn lại chỉ minh họa vị trí.</p>
            <div className="fm-phone">
              <div className="fm-phone-head"><strong>{String(method.name)}</strong></div>
              <div className="fm-phone-body">
                {blocks.length === 0 && <small>Chưa có khối nào.</small>}
                {blocks.map((block, index) => <PreviewBlock key={`${block.type}-${index}`} block={block} info={typeOf(block.type)} params={params} steps={method.starterSteps} />)}
              </div>
            </div>
          </aside>
        </div>

        <div className="fm-modal-foot">
          <button type="button" className="btn" onClick={onClose} data-dialog-close>Hủy</button>
          <button className="btn btn--primary" disabled={busy || !dirty || problems.length > 0 || types.length === 0}>{busy ? 'Đang lưu...' : 'Lưu bố cục'}</button>
        </div>
      </form>
    </DialogOverlay>
  );
}

/**
 * Các hũ của khối "hũ": mỗi hũ là một tham số kiểu % của cách quản lý (phần chia thu nhập) cộng các danh mục thuộc hũ.
 * Một danh mục chỉ thuộc một hũ (nếu không chi tiêu bị tính hai lần) nên danh mục đã thuộc hũ khác bị khóa ở đây.
 */
function JarsEditor({ jars, params, categories, onChange }: { jars: JarDef[]; params: ParamDef[]; categories: AdminCategory[]; onChange: (jars: JarDef[]) => void }) {
  const percentParams = jarShareParams(params);
  const usedKeys = new Set(jars.map(jar => jar.key));
  const free = percentParams.filter(param => !usedKeys.has(param.key));
  const total = jars.reduce((sum, jar) => sum + (percentParams.find(param => param.key === jar.key)?.default ?? 0), 0);
  const updateJar = (index: number, patch: Partial<JarDef>) => onChange(jars.map((jar, i) => (i === index ? { ...jar, ...patch } : jar)));
  const toggleCategory = (index: number, slug: string) => {
    const current = jars[index].categories;
    updateJar(index, { categories: current.includes(slug) ? current.filter(item => item !== slug) : [...current, slug] });
  };

  return (
    <div className="fm-jars">
      {percentParams.length === 0 && <small className="fm-error-text">Cách quản lý này chưa có tham số kiểu % nào để chia thành hũ. Thêm tham số kiểu percent ở phần chỉnh phương pháp trước.</small>}
      {jars.map((jar, index) => {
        const takenElsewhere = new Set(jars.flatMap((other, i) => (i === index ? [] : other.categories)));
        return (
          <fieldset className="fm-jar" key={`${jar.key}-${index}`}>
            <legend>Hũ {index + 1}</legend>
            <label className="fm-field">
              Phần chia thu nhập (tham số kiểu %)
              <select value={jar.key} onChange={e => updateJar(index, { key: e.target.value })}>
                {percentParams.filter(param => param.key === jar.key || !usedKeys.has(param.key)).map(param => (
                  <option key={param.key} value={param.key}>{param.label} (mặc định {param.default}%)</option>
                ))}
              </select>
            </label>
            <label className="fm-field">
              Tên hũ (để trống = dùng nhãn của tham số)
              <input value={jar.label ?? ''} maxLength={40} onChange={e => updateJar(index, { label: e.target.value || undefined })} />
            </label>
            <fieldset className="fm-keys">
              <legend>Danh mục thuộc hũ ({jar.categories.length})</legend>
              {categories.length === 0 && <small>Đang tải danh mục...</small>}
              {categories.map(category => {
                const checked = jar.categories.includes(category.slug);
                const taken = takenElsewhere.has(category.slug);
                return (
                  <label className="fm-inline" key={category.slug}>
                    <input type="checkbox" checked={checked} disabled={taken && !checked} onChange={() => toggleCategory(index, category.slug)} />
                    {category.name}
                    {taken && !checked && <small>(đã thuộc hũ khác)</small>}
                    {!category.isActive && <small>(đã tắt)</small>}
                  </label>
                );
              })}
            </fieldset>
            <button type="button" className="btn btn--small" onClick={() => onChange(jars.filter((_, i) => i !== index))}><Trash2 size={14} /> Xóa hũ</button>
          </fieldset>
        );
      })}
      <div className="fm-toolbar">
        <button type="button" className="btn" disabled={free.length === 0 || jars.length >= MAX_JARS} onClick={() => onChange([...jars, { key: free[0].key, categories: [] }])}><Plus size={14} /> Thêm hũ</button>
        <small className={total > 100 ? 'fm-error-text' : ''}>Tổng tỷ lệ mặc định: {total}%{total > 100 ? ' (vượt 100%)' : ''}</small>
      </div>
      <small>Chi tiêu của danh mục chưa gán vào hũ nào sẽ hiện riêng là "Ngoài các hũ". Khoản vay/mượn không tính vào chi tiêu nên không có trong danh sách.</small>
    </div>
  );
}

function PreviewBlock({ block, info, params, steps }: { block: HomeBlock; info?: HomeBlockType; params: ParamDef[]; steps: unknown }) {
  const title = block.title?.trim() || info?.name || block.type;
  const shown = block.keys?.length ? block.keys.map(key => params.find(param => param.key === key)).filter((param): param is ParamDef => !!param) : params;

  let body;
  if (block.type === 'params') {
    const rows = block.display === 'allocation' ? shown.filter(param => param.type === 'percent') : shown;
    body = rows.length === 0 ? <small>Chưa có tham số để hiện.</small> : rows.map(param => (
      <div className="fm-prev-row" key={param.key}>
        <span>{param.label}</span><strong>{formatParam(param, param.default)}</strong>
        {block.display === 'allocation' && <span className="fm-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, param.default))}%` }} /></span>}
      </div>
    ));
  } else if (block.type === 'jars') {
    const rows = block.jars ?? [];
    body = rows.length === 0 ? <small>Chưa có hũ nào.</small> : rows.map(jar => {
      const param = params.find(item => item.key === jar.key);
      return (
        <div className="fm-prev-row" key={jar.key}>
          <span>{jar.label?.trim() || param?.label || jar.key}</span><strong>{param ? formatParam(param, param.default) : '—'}</strong>
          <span className="fm-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, param?.default ?? 0))}%` }} /></span>
          <small>{jar.categories.length} danh mục</small>
        </div>
      );
    });
  } else if (block.type === 'starter_steps') {
    const list = Array.isArray(steps) ? steps.map(String) : [];
    body = list.map((step, index) => <div className="fm-prev-row" key={index}><span>{index + 1}. {step}</span></div>);
  } else {
    body = <span className="fm-prev-skeleton" aria-hidden="true" />;
  }
  return <section className="fm-prev-block"><h4>{title}</h4>{body}</section>;
}
