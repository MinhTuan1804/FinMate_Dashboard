import { useUnsavedChanges } from './ui/useUnsavedChanges';
import { JsonDiff } from './ui/JsonReview';
import { SuccessNotice } from './Shared';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, errorText, getData } from '../shared/api';
import { ConfirmReasonDialog, EmptyState, LoadingRows, PageError } from './Shared';
import { OffsetPager } from './ui/ListControls';

type Maintenance={enabled:boolean;title:string;message:string;estimatedEndAt:string|null};
type AppVersion={minVersion:string;latestVersion:string;forceUpdate:boolean;storeUrl:string};
type Features={chatAi:boolean;voice:boolean;billScan:boolean;notificationReading:boolean};
type Limits={alertT1Percent:number;alertT2Percent:number};
type Sync={intervalMinutes:number;maxRetries:number;queueRetentionDays:number};
type Theme={primaryColor:string|null;backgroundColor:string|null;navBarColor:string|null;fontFamily:string|null;textScale:number;logoUrl:string|null};
type QrTransfer={matchWindowMinutes:number;clockSkewMinutes:number;pendingLifetimeHours:number;maxAmount:number;maxMessageLength:number;defaultMessage:string;deeplinkHost:string;deeplinkReturnUrl:string};
type FinanceMethods={recommendationReuseMinutes:number;supportMinSharePercent:number};
type Doc={maintenance:Maintenance;appVersion:AppVersion;features:Features;limits:Limits;sync:Sync;theme:Theme;qrTransfer:QrTransfer;financeMethods:FinanceMethods};
type View={version:number;content:Doc;note:string|null;updatedBy:string|null;updatedAt:string|null};
type Summary={version:number;status:string;note:string|null;createdBy:string;createdAt:string};
type Props={section:'app'|'limits'|'appearance'|'history'};

const base='/admin/system-config';
const HISTORY_PAGE=10;
const FONTS=['Be Vietnam Pro','Inter','Roboto','Nunito','Open Sans','Lexend','Montserrat'];
const when=(iso:string|null|undefined)=>iso?new Date(iso).toLocaleString('vi-VN'):'—';

export function SystemConfigPanel({section}:Props){
  const [view,setView]=useState<View|null>(null),[draft,setDraft]=useState<Doc|null>(null),[versions,setVersions]=useState<Summary[]>([]),[shown,setShown]=useState<View|null>(null);
  const [saving,setSaving]=useState(false),[rollback,setRollback]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');

  const [offset,setOffset]=useState(0),[total,setTotal]=useState(0);
  const load=useCallback(async()=>{try{const [current,list]=await Promise.all([getData<View>(base),getData<{items:Summary[];total:number}>(`${base}/versions`,{limit:HISTORY_PAGE,offset})]);setView(current);setDraft(current.content);setVersions(list.items);setTotal(list.total);setError('')}catch(e){setError(errorText(e))}},[offset]);   // lịch sử do API cắt trang
  useEffect(()=>{queueMicrotask(()=>void load())},[load]);

  const dirty=Boolean(view&&draft&&JSON.stringify(view.content)!==JSON.stringify(draft));const navigationDialog=useUnsavedChanges(dirty);
  const set=<K extends keyof Doc>(key:K,patch:Partial<Doc[K]>)=>setDraft(current=>current&&{...current,[key]:{...current[key],...patch}});
  /** Xung đột phiên bản (409): tải lại bản mới nhất NHƯNG giữ thông báo, vì tải lại tự xóa lỗi và người dùng sẽ không biết vì sao lưu không được. */
  async function failed(e:unknown){const message=errorText(e);if((e as {response?:{status?:number}}).response?.status===409)await load();setError(message)}
  async function save(note:string){if(!view||!draft)return;setBusy(true);try{await api.put(base,{expectedVersion:view.version,content:draft,note});setSaving(false);setNotice('Đã lưu. App áp dụng trong khoảng 30 giây.');await load()}catch(e){await failed(e);setSaving(false)}finally{setBusy(false)}}
  async function restore(note:string){if(!view||rollback==null)return;setBusy(true);try{await api.post(`${base}/rollback/${rollback}`,{expectedVersion:view.version,note});setRollback(null);setNotice(`Đã khôi phục nội dung của phiên bản ${rollback} thành phiên bản mới.`);await load()}catch(e){await failed(e);setRollback(null)}finally{setBusy(false)}}
  async function show(version:number){try{setShown(await getData<View>(`${base}/versions/${version}`))}catch(e){setError(errorText(e))}}

  if(!draft||!view)return error?<PageError message={error} retry={()=>void load()}/>:<LoadingRows/>;
  const toggle=(label:string,hint:string,checked:boolean,onChange:(value:boolean)=>void)=><label className="fm-field fm-switch-row"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span><strong>{label}</strong><small>{hint}</small></span></label>;
  const number=(label:string,value:number,onChange:(value:number)=>void,step=1)=><label className="fm-field fm-field--inline">{label}<input type="number" step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
  const text=(label:string,value:string,onChange:(value:string)=>void,placeholder='')=><label className="fm-field">{label}<input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>;
  const color=(label:string,key:'primaryColor'|'backgroundColor'|'navBarColor')=>{const value=draft.theme[key];return <label className="fm-field" key={key}>{label}<span className="fm-color-row"><input type="checkbox" checked={value==null} onChange={e=>set('theme',{[key]:e.target.checked?null:'#2E7D6B'})} aria-label="Dùng mặc định của app"/> <small>Dùng mặc định</small>{value!=null&&<><input type="color" value={value} onChange={e=>set('theme',{[key]:e.target.value.toUpperCase()})}/><code>{value}</code></>}</span></label>};
  const card=(title:string,children:ReactNode,hint?:string)=><div className="fm-card"><h2>{title}</h2>{hint&&<p className="fm-hint">{hint}</p>}{children}</div>;
  const theme=draft.theme;

  return <section>{navigationDialog}
    <PageError message={error} retry={()=>void load()}/><SuccessNotice message={notice}/>
    <p className="fm-hint">Đang chạy: <strong>phiên bản {view.version}</strong>{view.version>0?` · lưu lúc ${when(view.updatedAt)}`:' (giá trị mặc định, chưa ai lưu)'}</p>
    {section!=='history'&&<div className="fm-card fm-toolbar fm-sticky-bar"><span>{dirty?'Có thay đổi chưa lưu.':'Chưa có thay đổi.'}</span><span className="fm-actions"><button className="btn" disabled={!dirty||busy} onClick={()=>setDraft(view.content)}>Bỏ thay đổi</button><button className="btn btn--primary" disabled={!dirty||busy} onClick={()=>setSaving(true)}>Lưu thay đổi</button></span></div>}

    {section==='app'&&<div className="fm-settings-grid">
      {card('Chế độ bảo trì',<>{toggle('Bật bảo trì','Người dùng thường thấy popup chặn và không dùng được app. Admin vẫn vào được để kiểm tra và tắt.',draft.maintenance.enabled,value=>set('maintenance',{enabled:value}))}
        {text('Tiêu đề popup',draft.maintenance.title,value=>set('maintenance',{title:value}))}
        <label className="fm-field">Nội dung popup<textarea rows={3} value={draft.maintenance.message} onChange={e=>set('maintenance',{message:e.target.value})}/></label>
        <label className="fm-field">Dự kiến xong (tùy chọn)<input type="datetime-local" value={draft.maintenance.estimatedEndAt?new Date(new Date(draft.maintenance.estimatedEndAt).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):''} onChange={e=>set('maintenance',{estimatedEndAt:e.target.value?new Date(e.target.value).toISOString():null})}/></label></>)}
      {card('Phiên bản ứng dụng',<>{text('Phiên bản tối thiểu',draft.appVersion.minVersion,value=>set('appVersion',{minVersion:value}),'1.0.0')}{text('Phiên bản mới nhất',draft.appVersion.latestVersion,value=>set('appVersion',{latestVersion:value}),'1.0.0')}
        {toggle('Buộc cập nhật','Bật thì app cũ hơn phiên bản mới nhất cũng phải cập nhật, không chỉ app dưới mức tối thiểu.',draft.appVersion.forceUpdate,value=>set('appVersion',{forceUpdate:value}))}{text('Liên kết cửa hàng (https)',draft.appVersion.storeUrl,value=>set('appVersion',{storeUrl:value}))}</>)}
      {card('Tính năng',<>{toggle('Chat AI','Nhập giao dịch bằng câu chat',draft.features.chatAi,value=>set('features',{chatAi:value}))}{toggle('Giọng nói','Nhập giao dịch bằng giọng nói',draft.features.voice,value=>set('features',{voice:value}))}{toggle('Quét hóa đơn','Chụp hóa đơn để nhập',draft.features.billScan,value=>set('features',{billScan:value}))}{toggle('Đọc thông báo ngân hàng','Tự tạo giao dịch từ thông báo',draft.features.notificationReading,value=>set('features',{notificationReading:value}))}</>)}
    </div>}

    {section==='limits'&&<div className="fm-settings-grid">
      {card('Ngưỡng cảnh báo ngân sách mặc định',<>{number('Nhắc nhẹ T1 (% hạn mức đã dùng, 1-98)',draft.limits.alertT1Percent,value=>set('limits',{alertT1Percent:value}))}{number('Cảnh báo mạnh T2 (% hạn mức đã dùng, 2-99)',draft.limits.alertT2Percent,value=>set('limits',{alertT2Percent:value}))}</>,'Áp dụng cho người dùng không có ngưỡng cá nhân và không dùng cách quản lý nào có ngưỡng riêng. Mỗi phương pháp tài chính có T1/T2 riêng (sửa ở Phương pháp tài chính) và người dùng tự đặt được ngưỡng cá nhân. T1 phải nhỏ hơn T2. Mức "vượt hạn mức" luôn là 100%, không cấu hình.')}
      {card('Đồng bộ local-first',<>{number('Chu kỳ nền (phút, 5-1440)',draft.sync.intervalMinutes,value=>set('sync',{intervalMinutes:value}))}{number('Số lần thử lại (0-20)',draft.sync.maxRetries,value=>set('sync',{maxRetries:value}))}{number('Giữ hàng đợi tối đa (ngày, 1-90)',draft.sync.queueRetentionDays,value=>set('sync',{queueRetentionDays:value}))}</>)}
      {card('Gợi ý cách quản lý tài chính',<>{number('Dùng lại gợi ý trong (phút, 0-1440)',draft.financeMethods.recommendationReuseMinutes,value=>set('financeMethods',{recommendationReuseMinutes:value}))}{number('Điểm tối thiểu của cách bổ trợ (% so với cách chính, 1-100)',draft.financeMethods.supportMinSharePercent,value=>set('financeMethods',{supportMinSharePercent:value}))}</>,'Xin lại gợi ý với cùng câu trả lời khảo sát trong khoảng này thì trả bản vừa tạo, không gọi AI lại (0 = luôn tạo mới). Khi AI lỗi và app chọn bằng luật, cách bổ trợ chỉ được chọn nếu điểm của nó đạt ít nhất tỷ lệ này so với cách chính.')}
      {card('Quét QR: khớp giao dịch',<>{number('Cửa sổ khớp (phút, 5-180)',draft.qrTransfer.matchWindowMinutes,value=>set('qrTransfer',{matchWindowMinutes:value}))}{number('Lệch đồng hồ cho phép (phút, 0-10)',draft.qrTransfer.clockSkewMinutes,value=>set('qrTransfer',{clockSkewMinutes:value}))}{number('Hết hạn lần quét (giờ, 1-168)',draft.qrTransfer.pendingLifetimeHours,value=>set('qrTransfer',{pendingLifetimeHours:value}))}</>,'Thông báo ngân hàng phải đến trong cửa sổ này sau lúc quét thì mới khớp với lần quét. Quá hẹp thì lỡ người nhập OTP chậm, quá rộng thì khớp nhầm giao dịch cùng số tiền.')}
      {card('Quét QR: nhập liệu',<>{number('Trần số tiền (đồng)',draft.qrTransfer.maxAmount,value=>set('qrTransfer',{maxAmount:value}))}{number('Độ dài nội dung tối đa (20-100)',draft.qrTransfer.maxMessageLength,value=>set('qrTransfer',{maxMessageLength:value}))}{text('Nội dung chuyển khoản mặc định',draft.qrTransfer.defaultMessage,value=>set('qrTransfer',{defaultMessage:value}))}</>,'Nên viết không dấu: nhiều ngân hàng không nhận dấu tiếng Việt.')}
      {card('Quét QR: mở app ngân hàng',<>{text('Máy chủ chuyển tiếp (tên miền)',draft.qrTransfer.deeplinkHost,value=>set('qrTransfer',{deeplinkHost:value}),'dl.vietqr.io')}{text('Liên kết quay về (https)',draft.qrTransfer.deeplinkReturnUrl,value=>set('qrTransfer',{deeplinkReturnUrl:value}))}</>,'Số tài khoản, số tiền và nội dung của người dùng đi qua máy chủ này. Chỉ đổi khi dịch vụ đổi địa chỉ; thiếu liên kết quay về thì app ngân hàng chỉ mở màn hình chủ.')}
    </div>}

    {section==='appearance'&&<div className="fm-settings-grid">
      {card('Màu sắc',<>{color('Màu chủ đạo','primaryColor')}{color('Màu nền','backgroundColor')}{color('Màu thanh điều hướng','navBarColor')}</>,'Bỏ chọn "Dùng mặc định" để đổi màu. Để mặc định thì app giữ giao diện có sẵn.')}
      {card('Chữ',<><label className="fm-field">Font chữ (Google Fonts)<input list="fm-fonts" value={theme.fontFamily??''} placeholder="Mặc định của app" onChange={e=>set('theme',{fontFamily:e.target.value||null})}/><datalist id="fm-fonts">{FONTS.map(font=><option key={font} value={font}/>)}</datalist></label>
        <label className="fm-field">Cỡ chữ toàn app: {theme.textScale.toFixed(2)}×<input type="range" min={0.8} max={1.5} step={0.05} value={theme.textScale} onChange={e=>set('theme',{textScale:Number(e.target.value)})}/></label></>,'Font không tải được thì app dùng font mặc định.')}
      {card('Logo',<>{text('Đường dẫn logo (https)',theme.logoUrl??'',value=>set('theme',{logoUrl:value||null}),'Để trống = logo mặc định')}{theme.logoUrl&&<img className="fm-logo-preview" src={theme.logoUrl} alt="Logo xem trước"/>}</>)}
      {card('Xem trước',<div><span className="fm-badge">Minh họa giao diện</span><div className="fm-phone" style={{background:theme.backgroundColor??'#FFFFFF',fontFamily:theme.fontFamily?`'${theme.fontFamily}', sans-serif`:undefined,fontSize:`${14*theme.textScale}px`}}>
        <div className="fm-phone-head" style={{background:theme.primaryColor??'#2E7D6B'}}>{theme.logoUrl?<img src={theme.logoUrl} alt="" height={22}/>:<strong>FinMate</strong>}</div>
        <div className="fm-phone-body"><p>Số dư tháng này</p><strong>12.500.000 đ</strong><button type="button" style={{background:theme.primaryColor??'#2E7D6B'}}>Thêm giao dịch</button></div>
        <div className="fm-phone-nav" style={{background:theme.navBarColor??'#F3F4F6'}}>Tổng quan · Giao dịch · Ngân sách</div></div></div>)}
    </div>}

    {section==='history'&&<div className="fm-card"><div className="fm-toolbar"><h2>Lịch sử thay đổi</h2></div>
      {versions.length?versions.map(v=><div className="fm-list-row" key={v.version}><span><strong>Phiên bản {v.version}</strong> <span className={`fm-badge ${v.status==='active'?'good':''}`}>{v.status==='active'?'Đang chạy':'Đã thay'}</span><br/><small>{when(v.createdAt)} · {v.note||'Không có lý do'}</small></span><span className="fm-actions"><button className="btn btn--small" onClick={()=>void show(v.version)}>Xem</button><button className="btn btn--small" disabled={busy||v.status==='active'} onClick={()=>setRollback(v.version)}>Khôi phục</button></span></div>):<EmptyState message="Chưa ai lưu cấu hình nào: hệ thống đang dùng giá trị mặc định."/>}
      <OffsetPager offset={offset} limit={HISTORY_PAGE} total={total} onChange={setOffset}/>
      {shown&&<div className="fm-preview"><h3>Nội dung phiên bản {shown.version}</h3><JsonDiff before={view.content} after={shown.content}/></div>}</div>}

    {saving&&<ConfirmReasonDialog error={error} title="Lưu cấu hình hệ thống" description={draft.maintenance.enabled&&!view.content.maintenance.enabled?'Bạn đang BẬT bảo trì: người dùng thường sẽ không dùng được app cho tới khi tắt.':'Thay đổi áp dụng cho app trong khoảng 30 giây và được ghi vào lịch sử để khôi phục.'} onCancel={()=>setSaving(false)} onConfirm={save} busy={busy}/>}
    {rollback!=null&&<ConfirmReasonDialog error={error} title={`Khôi phục phiên bản ${rollback}`} description="Tạo một phiên bản MỚI có nội dung của phiên bản này. Lịch sử cũ vẫn được giữ nguyên." onCancel={()=>setRollback(null)} onConfirm={restore} busy={busy}/>}
  </section>;
}
