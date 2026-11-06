import { useState } from 'react';
import { CatalogPage } from './CorePages';
import { HomeLayoutEditor } from './HomeLayoutEditor';
import { PromptsPanel } from './PromptsPanel';
import { PageHeader } from './Shared';

/** Phương pháp tài chính: danh mục (bảng chung) cộng bố cục trang chủ từng cách và chỉ dẫn AI khi gợi ý. */
export function FinanceMethodsPage() {
  const [tab, setTab] = useState<'methods' | 'prompts'>('methods');
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState('');

  return (
    <>
      <PageHeader title="Phương pháp tài chính" description="Nội dung, điều kiện gợi ý, trang chủ của từng cách và chỉ dẫn cho AI." />
      <div className="fm-tabs">
        <button className={tab === 'methods' ? 'active' : ''} onClick={() => { setNotice(''); setTab('methods'); }}>Phương pháp</button>
        <button className={tab === 'prompts' ? 'active' : ''} onClick={() => { setNotice(''); setTab('prompts'); }}>Chỉ dẫn AI</button>
      </div>
      {notice && <div className="fm-success" role="status">{notice}</div>}
      {tab === 'methods' ? (
        <CatalogPage
          key={reload}
          kind="finance-methods"
          embedded
          rowActions={row => <button className="btn btn--small" onClick={() => { setNotice(''); setEditing(row); }}>Trang chủ</button>}
        />
      ) : <PromptsPanel />}
      {editing && (
        <HomeLayoutEditor
          method={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setReload(n => n + 1); setNotice(`Đã lưu bố cục trang chủ của "${String(editing.name)}". App áp dụng ở lần mở trang chủ kế tiếp.`); }}
        />
      )}
    </>
  );
}
