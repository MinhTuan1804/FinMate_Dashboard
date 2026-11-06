import { SuccessNotice } from './Shared';
import { DialogOverlay } from './ui/DialogOverlay';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { OffsetPager, SearchField } from './ui/ListControls';
import { useServerList } from './ui/useServerList';
import { api, errorText, getAllPages, getData } from '../shared/api';
import { ConfirmDialog, ConfirmReasonDialog, EmptyState, LoadingRows, PageError } from './Shared';

type Fmt={id:string;provider_key:string;package_name:string;version:number;status:'draft'|'active'|'archived';priority:number;patterns?:number;samples?:number};
type Pattern={id:string;pattern_name:string;regex:string;transaction_type:string|null;priority:number;sample_text:string|null;is_active:boolean};
type Sample={id:string;sample_text:string;expected_fields:Record<string,unknown>};
type Detail=Fmt&{patterns:Pattern[];samples:Sample[]};
type TryResult={matched:boolean;pattern_name:string|null;fields:Record<string,unknown>|null;broken_patterns:string[]};
type Check={ready:boolean;problems:string[]};
type Provider={providerKey:string;packageName:string;displayName:string};
type Confirm={kind:'activate'|'archive'|'clone'}|{kind:'delete';title:string;run:()=>Promise<void>};

const STATUS:Record<string,[string,string]>={active:['Đang chạy','good'],draft:['Bản nháp','warn'],archived:['Đã lưu trữ','']};
const base='/admin/provider-formats';

export function FormatsPanel(){
  const list=useServerList<Fmt>(base,{searchParam:'q'});   // tìm theo gói/nhà cung cấp + phân trang do ai-service; đổi từ khóa/trang thì gọi lại
  const items=list.rows,loading=list.loading&&items.length===0,loadList=list.reload;
  const [selected,setSelected]=useState(''),[detail,setDetail]=useState<Detail|null>(null);
  const [text,setText]=useState(''),[tried,setTried]=useState<TryResult|null>(null),[check,setCheck]=useState<Check|null>(null);
  const [confirm,setConfirm]=useState<Confirm|null>(null),[pattern,setPattern]=useState<Partial<Pattern>|null>(null),[create,setCreate]=useState<{provider_key:string;package_name:string}|null>(null),[providers,setProviders]=useState<Provider[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');

  const loadDetail=useCallback(async(id:string)=>{if(!id){setDetail(null);return}try{setDetail(await getData<Detail>(`${base}/${id}`));setTried(null);setCheck(null);setError('')}catch(e){setError(errorText(e))}},[]);
  useEffect(()=>{queueMicrotask(()=>void loadDetail(selected))},[selected,loadDetail]);

  async function run(job:()=>Promise<void>,done?:string){setBusy(true);try{await job();if(done)setNotice(done);setError('')}catch(e){setError(errorText(e))}finally{setBusy(false)}}
  const refresh=async()=>{await loadList();await loadDetail(selected)};
  const post=async<T,>(path:string,body:unknown)=>(await api.post(`${base}${path}`,body)).data.data as T;

  const openCreate=()=>{setCreate({provider_key:'',package_name:''});if(!providers.length)void getAllPages<Provider>('/admin/provider-configs').then(setProviders).catch(()=>{})};
  const submitCreate=(event:FormEvent)=>{event.preventDefault();if(!create)return;void run(async()=>{const made=await post<Fmt>('',create);setCreate(null);await loadList();setSelected(made.id)},'Đã tạo bản nháp trống. Thêm pattern và mẫu kiểm tra rồi kích hoạt.')};
  const submitPattern=(event:FormEvent)=>{event.preventDefault();if(!pattern||!detail)return;const body={pattern_name:pattern.pattern_name,regex:pattern.regex,transaction_type:pattern.transaction_type||null,priority:Number(pattern.priority??100),sample_text:pattern.sample_text||null,is_active:pattern.is_active??true};
    void run(async()=>{if(pattern.id)await api.patch(`${base}/${detail.id}/patterns/${pattern.id}`,body);else await post(`/${detail.id}/patterns`,body);setPattern(null);await refresh()},'Đã lưu pattern')};
  const runTry=(event:FormEvent)=>{event.preventDefault();if(!detail)return;void run(async()=>setTried(await post<TryResult>(`/${detail.id}/try`,{text})))};
  const runCheck=()=>{if(detail)void run(async()=>setCheck((await api.get(`${base}/${detail.id}/check`)).data.data as Check))};
  const saveSample=()=>{if(detail&&tried?.fields)void run(async()=>{await post(`/${detail.id}/samples`,{sample_text:text,expected_fields:tried.fields});await refresh()},'Đã lưu làm mẫu kiểm tra')};
  const reasoned=async(reason:string)=>{if(!detail||!confirm||confirm.kind==='delete')return;const kind=confirm.kind;
    await run(async()=>{if(kind==='clone'){const made=await post<Fmt>('/clone',{package_name:detail.package_name,reason});setConfirm(null);await loadList();setSelected(made.id)}else{await post(`/${detail.id}/${kind}`,{reason});setConfirm(null);await refresh()}},kind==='activate'?'Đã kích hoạt; AI Service nạp lại trong khoảng 60 giây':kind==='archive'?'Đã lưu trữ':'Đã tạo bản nháp từ bản mới nhất')};
  const ask=(title:string,job:()=>Promise<void>)=>setConfirm({kind:'delete',title,run:async()=>{await run(async()=>{await job();await refresh()},'Đã xóa');setConfirm(null)}});

  const draft=detail?.status==='draft';
  const field=(key:keyof Pattern,label:string,type='text')=><label key={key}>{label}<input type={type} value={String(pattern?.[key]??'')} onChange={e=>setPattern({...pattern,[key]:e.target.value})} required={key==='pattern_name'}/></label>;
  return <section>
    <PageError message={error||list.error} retry={()=>void refresh()}/><SuccessNotice message={notice}/>
    <div className="fm-grid fm-grid--sidebar">
      <div className="fm-card"><div className="fm-toolbar"><h3>Định dạng</h3><button className="btn btn--small btn--primary" onClick={openCreate}>Thêm mới</button></div>
        <div className="fm-toolbar fm-filter-bar"><SearchField value={list.search} onChange={list.setSearch} placeholder="Gói hoặc nhà cung cấp"/></div>
        {loading?<LoadingRows/>:items.length?items.map(item=><button key={item.id} className={`fm-list-row fm-list-button ${selected===item.id?'fm-selected':''}`} onClick={()=>setSelected(item.id)}><span>{item.provider_key} · v{item.version}<br/><small>{item.package_name}</small></span><span className={`fm-badge ${STATUS[item.status][1]}`}>{STATUS[item.status][0]}</span></button>):<EmptyState message={list.search?'Không có định dạng nào khớp':'Chưa có dữ liệu'}/>}<OffsetPager offset={list.offset} limit={list.limit} total={list.total} onChange={list.setOffset}/></div>
      <div>{!detail?<div className="fm-card"><EmptyState message="Chọn một định dạng ở bên trái, hoặc thêm mới."/></div>:<>
        <div className="fm-card"><div className="fm-toolbar"><h3>{detail.provider_key} · v{detail.version} <span className={`fm-badge ${STATUS[detail.status][1]}`}>{STATUS[detail.status][0]}</span></h3>
          <span className="fm-actions"><button className="btn btn--small" onClick={runCheck} disabled={busy}>Kiểm tra</button>{draft&&<button className="btn btn--small btn--primary" onClick={()=>setConfirm({kind:'activate'})} disabled={busy}>Kích hoạt</button>}{detail.status!=='archived'&&<button className="btn btn--small" onClick={()=>setConfirm({kind:'archive'})} disabled={busy}>Lưu trữ</button>}{!draft&&<button className="btn btn--small" onClick={()=>setConfirm({kind:'clone'})} disabled={busy}>Nhân bản để sửa</button>}</span></div>
          <p className="fm-hint"><code>{detail.package_name}</code>{!draft&&' · Chỉ sửa được bản nháp: nhân bản bản này thành bản nháp mới rồi sửa, bản đang chạy không bị đụng tới.'}</p>
          {check&&(check.ready?<div className="fm-success">Đủ điều kiện kích hoạt.</div>:<div className="error-box" role="alert"><span>Chưa đủ điều kiện: {check.problems.join(' · ')}</span></div>)}</div>
        <div className="fm-card"><div className="fm-toolbar"><h3>Pattern ({detail.patterns.length})</h3>{draft&&<button className="btn btn--small" onClick={()=>setPattern({priority:100,is_active:true})}>Thêm pattern</button>}</div>
          {detail.patterns.length?detail.patterns.map(p=><div className="fm-list-row" key={p.id}><span><strong>{p.pattern_name}</strong> <small>ưu tiên {p.priority} · {p.transaction_type||'chiều tiền theo dấu'}{p.is_active?'':' · đang tắt'}</small><br/><code className="fm-regex">{p.regex}</code></span>{draft&&<span className="fm-actions"><button className="btn btn--small" onClick={()=>setPattern(p)}>Sửa</button><button className="btn btn--small" onClick={()=>ask(`Xóa pattern ${p.pattern_name}`,async()=>{await api.delete(`${base}/${detail.id}/patterns/${p.id}`)})}>Xóa</button></span>}</div>):<EmptyState message="Chưa có pattern"/>}</div>
        <div className="fm-card"><h3>Thử một thông báo</h3><p className="fm-hint">Dán chữ thông báo (đã che số tài khoản và tên người) để xem các pattern đang bật đọc ra gì. Kết quả đúng thì lưu làm mẫu kiểm tra: kích hoạt chỉ thành công khi mọi mẫu khớp.</p>
          <form className="fm-profile-form" onSubmit={runTry}><label>Chữ thông báo<textarea rows={5} value={text} onChange={e=>setText(e.target.value)} required spellCheck={false}/></label><div className="fm-actions"><button className="btn btn--primary" disabled={busy||!text.trim()}>Thử</button>{draft&&tried?.matched&&<button type="button" className="btn" onClick={saveSample} disabled={busy}>Lưu kết quả này làm mẫu kiểm tra</button>}</div></form>
          {tried&&<div className="fm-preview"><p>{tried.matched?<>Khớp pattern <strong>{tried.pattern_name}</strong></>:'Không pattern nào khớp (thông báo sẽ rơi về nhánh generic).'}{tried.broken_patterns.length>0&&` · Regex lỗi: ${tried.broken_patterns.join(', ')}`}</p>{tried.fields&&<pre className="fm-json">{JSON.stringify(tried.fields,null,2)}</pre>}</div>}</div>
        <div className="fm-card"><h3>Mẫu kiểm tra ({detail.samples.length})</h3>{detail.samples.length?detail.samples.map(s=><div className="fm-list-row" key={s.id}><span><code className="fm-regex">{s.sample_text}</code><br/><small>{JSON.stringify(s.expected_fields)}</small></span>{draft&&<button className="btn btn--small" onClick={()=>ask('Xóa mẫu kiểm tra',async()=>{await api.delete(`${base}/${detail.id}/samples/${s.id}`)})}>Xóa</button>}</div>):<EmptyState message="Chưa có mẫu; kích hoạt cần ít nhất một mẫu."/>}</div></>}</div></div>

    {create&&<DialogOverlay onClose={()=>setCreate(null)} guardChanges busy={busy}><form className="fm-modal" role="dialog" aria-modal="true" aria-label="Thêm định dạng" onSubmit={submitCreate}><div className="fm-modal-head"><h2>Thêm định dạng cho một ngân hàng/ví</h2></div><div className="fm-form"><PageError message={error}/>
      <label>Chọn từ danh sách nhà cung cấp<select value="" onChange={e=>{const found=providers.find(p=>p.providerKey===e.target.value);if(found)setCreate({provider_key:found.providerKey,package_name:found.packageName})}}><option value="">Chọn...</option>{providers.map(p=><option key={p.providerKey} value={p.providerKey}>{p.displayName}</option>)}</select></label>
      <label>Mã nhà cung cấp (provider_key)<input required pattern="[a-z0-9_]{1,100}" value={create.provider_key} onChange={e=>setCreate({...create,provider_key:e.target.value})}/></label>
      <label>Package name của app<input required value={create.package_name} onChange={e=>setCreate({...create,package_name:e.target.value})}/></label></div>
      <div className="fm-modal-foot"><button data-dialog-close type="button" className="btn" onClick={()=>setCreate(null)}>Hủy</button><button className="btn btn--primary" disabled={busy}>Tạo bản nháp</button></div></form></DialogOverlay>}
    {pattern&&<DialogOverlay onClose={()=>setPattern(null)} guardChanges busy={busy}><form className="fm-modal" role="dialog" aria-modal="true" aria-label="Sửa pattern" onSubmit={submitPattern}><div className="fm-modal-head"><h2>{pattern.id?'Sửa':'Thêm'} pattern</h2></div><div className="fm-form"><PageError message={error}/>
      {field('pattern_name','Tên pattern')}
      <label>Regex<textarea required rows={6} spellCheck={false} value={pattern.regex||''} onChange={e=>setPattern({...pattern,regex:e.target.value})}/></label>
      <small>Dùng nhóm có tên: <code>amount</code> (bắt buộc), <code>sign</code>, <code>balance</code>, <code>merchant</code>, <code>description</code>, <code>occurred_at</code>. Viết không dấu là đủ: chữ có dấu vẫn khớp và kết quả giữ nguyên dấu.</small>
      <label>Chiều tiền<select value={pattern.transaction_type||''} onChange={e=>setPattern({...pattern,transaction_type:e.target.value||null})}><option value="">Suy từ nhóm sign (+/-)</option><option value="debit">Luôn là tiền ra</option><option value="credit">Luôn là tiền vào</option></select></label>
      {field('priority','Ưu tiên (số nhỏ chạy trước)','number')}
      <label>Mẫu minh họa (tùy chọn, đã che dữ liệu cá nhân)<textarea rows={3} spellCheck={false} value={pattern.sample_text||''} onChange={e=>setPattern({...pattern,sample_text:e.target.value})}/></label>
      {pattern.id&&<label className="fm-inline"><input type="checkbox" checked={pattern.is_active??true} onChange={e=>setPattern({...pattern,is_active:e.target.checked})}/> Đang bật</label>}</div>
      <div className="fm-modal-foot"><button data-dialog-close type="button" className="btn" onClick={()=>setPattern(null)}>Hủy</button><button className="btn btn--primary" disabled={busy}>Lưu</button></div></form></DialogOverlay>}
    {confirm&&confirm.kind!=='delete'&&<ConfirmReasonDialog error={error} title={confirm.kind==='activate'?'Kích hoạt định dạng':confirm.kind==='archive'?'Lưu trữ định dạng':'Nhân bản thành bản nháp'} description={confirm.kind==='activate'?'Chỉ thành công khi mọi mẫu kiểm tra khớp. Bản đang chạy của ngân hàng này được thay bằng bản nháp.':confirm.kind==='archive'?'Ngân hàng nếu không còn bản đang chạy sẽ quay về nhánh đọc chung (kém chính xác hơn).':'Tạo bản nháp mới sao từ bản mới nhất của ngân hàng này; bản đang chạy không đổi.'} onCancel={()=>setConfirm(null)} onConfirm={reasoned} busy={busy}/>}
    {confirm&&confirm.kind==='delete'&&<ConfirmDialog error={error} title={confirm.title} description="Xóa ngay, không hoàn tác được." onCancel={()=>setConfirm(null)} onConfirm={confirm.run} busy={busy}/>}
  </section>;
}
