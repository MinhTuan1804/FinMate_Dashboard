import { AdvancedConfigEditor } from './AdvancedConfigEditor';
import { validateConfigValue } from '../shared/configEditor';
import { useUnsavedChanges } from './ui/useUnsavedChanges';
import { JsonDiff } from './ui/JsonReview';
import { SuccessNotice } from './Shared';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, errorText, getData } from '../shared/api';
import { ConfirmReasonDialog, EmptyState, LoadingRows, PageError } from './Shared';
import { OffsetPager } from './ui/ListControls';

type Maintenance={enabled:boolean;title:string;message:string;estimatedEndAt:string|null};
type AppVersion={minVersion:string;latestVersion:string;forceUpdate:boolean;storeUrl:string};
type Features={chatAi:boolean;voice:boolean;billScan:boolean;notificationReading:boolean;groups:boolean;support:boolean;marketAlerts:boolean;community:boolean;subscriptions:boolean;groupFunds:boolean};
type Limits={alertT1Percent:number;alertT2Percent:number};
type Sync={intervalMinutes:number;maxRetries:number;queueRetentionDays:number};
type Theme={fontFamily:string|null;logoUrl:string|null;availableFonts:string[]};
type QrTransfer={matchWindowMinutes:number;clockSkewMinutes:number;pendingLifetimeHours:number;maxAmount:number;maxMessageLength:number;defaultMessage:string;deeplinkHost:string;deeplinkReturnUrl:string};
type FinanceMethods={recommendationReuseMinutes:number;supportMinSharePercent:number};
type Doc=Record<string,unknown>&{maintenance:Maintenance;appVersion:AppVersion;features:Features;limits:Limits;sync:Sync;theme:Theme;qrTransfer:QrTransfer;financeMethods:FinanceMethods};
type View={version:number;content:Doc;note:string|null;updatedBy:string|null;updatedAt:string|null};
type Summary={version:number;status:string;note:string|null;createdBy:string;createdAt:string};
type Props={section:'app'|'limits'|'appearance'|'history'|'advanced'};

const base='/admin/system-config';
const HISTORY_PAGE=10;
/** Font có sẵn trong app khi chưa chọn font nào (ThemeSettings.DefaultFont ở backend); các font khác lấy từ cấu hình theme.availableFonts. */
const DEFAULT_FONT='Be Vietnam Pro';
const FONT_NAME=/^[A-Za-z0-9 ]{1,40}$/;
const MAX_FONTS=30;
/** Hỏi Google Fonts bằng cách tải thử stylesheet: tên sai thì Google trả 400 (không kèm CORS nên fetch không đọc được), link báo onerror. null = quá 8 giây, không biết. */
const fontExists=(name:string)=>new Promise<boolean|null>(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href=googleFontsUrl([name]);const done=(value:boolean|null)=>{clearTimeout(timer);link.remove();resolve(value)};const timer=setTimeout(()=>done(null),8000);link.onload=()=>done(true);link.onerror=()=>done(false);document.head.appendChild(link)});
const googleFontsUrl=(fonts:string[])=>'https://fonts.googleapis.com/css2?'+fonts.map(font=>`family=${font.trim().replace(/ /g,'+')}:wght@400;600`).join('&')+'&display=swap';
/** Màu mặc định của app (Serene Glass) chỉ để minh họa: admin không còn đổi màu, màu do thiết kế trong app quyết định. */
const APP_INK='#42638E',APP_SURFACE='#F4F7FC';
const when=(iso:string|null|undefined)=>iso?new Date(iso).toLocaleString('vi-VN'):'—';

export function SystemConfigPanel({section}:Props){
  const [view,setView]=useState<View|null>(null),[draft,setDraft]=useState<Doc|null>(null),[versions,setVersions]=useState<Summary[]>([]),[shown,setShown]=useState<View|null>(null);
  const [uploading,setUploading]=useState(false);
  const [saving,setSaving]=useState(false),[rollback,setRollback]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');

  const [offset,setOffset]=useState(0),[total,setTotal]=useState(0),[conflict,setConflict]=useState(false);
  const dirtyRef=useRef(false),generation=useRef(0);
  const load=useCallback(async(reset=false)=>{const currentRequest=++generation.current;try{const [current,list]=await Promise.all([getData<View>(base),getData<{items:Summary[];total:number}>(`${base}/versions`,{limit:HISTORY_PAGE,offset})]);if(currentRequest!==generation.current)return;if(reset||!dirtyRef.current){setView(current);setDraft(current.content);}setVersions(list.items);setTotal(list.total);setError('');if(reset)setConflict(false);}catch(e){if(currentRequest===generation.current)setError(errorText(e));}},[offset]);
  const cancelLoad=useCallback(()=>{generation.current++;},[]);
  useEffect(()=>{queueMicrotask(()=>void load());return cancelLoad;},[load,cancelLoad]);

  const dirty=Boolean(view&&draft&&JSON.stringify(view.content)!==JSON.stringify(draft));const navigationDialog=useUnsavedChanges(dirty);
  useEffect(()=>{dirtyRef.current=dirty;},[dirty]);
  const set=<K extends keyof Doc>(key:K,patch:Partial<Doc[K]>)=>setDraft(current=>current&&{...current,[key]:{...(current[key] as Record<string,unknown>),...patch}});
  /** Xung đột phiên bản (409): tải lại bản mới nhất NHƯNG giữ thông báo, vì tải lại tự xóa lỗi và người dùng sẽ không biết vì sao lưu không được. */
  async function failed(e:unknown){const message=errorText(e);if((e as {response?:{status?:number}}).response?.status===409){setConflict(true);await load();setError(message+' Bản nhập được giữ nguyên. Bấm Bỏ thay đổi để tải bản mới nhất.');}else setError(message)}
  async function save(note:string){if(!view||!draft)return;setBusy(true);try{await api.put(base,{expectedVersion:view.version,content:draft,note});setSaving(false);setNotice('Đã lưu. Ứng dụng áp dụng trong khoảng 30 giây.');await load(true)}catch(e){await failed(e);setSaving(false)}finally{setBusy(false)}}
  async function restore(note:string){if(!view||rollback==null)return;setBusy(true);try{await api.post(`${base}/rollback/${rollback}`,{expectedVersion:view.version,note});setRollback(null);setNotice(`Đã khôi phục nội dung của phiên bản ${rollback} thành phiên bản mới.`);await load(true)}catch(e){await failed(e);setRollback(null)}finally{setBusy(false)}}
  /** Tải logo lên Firebase qua backend, chỉ điền link vào bản nháp: logo chỉ áp dụng khi bấm Lưu thay đổi (có lý do và lịch sử như mọi thay đổi). */
  async function uploadLogo(file:File|undefined){if(!file)return;if(file.size>2*1024*1024){setError('Logo phải nhỏ hơn 2 MB.');return}setUploading(true);try{const form=new FormData();form.append('file',file);const response=await api.post<{data:{url:string}}>('/admin/brand-logo',form);set('theme',{logoUrl:response.data.data.url});setError('');setNotice('Đã tải logo lên. Bấm Lưu thay đổi để áp dụng cho ứng dụng.')}catch(e){setError(errorText(e))}finally{setUploading(false)}}
  async function show(version:number){try{setShown(await getData<View>(`${base}/versions/${version}`))}catch(e){setError(errorText(e))}}

  /** Tải các font trong danh sách từ Google Fonts một lần, để mỗi ô chọn hiện đúng font của nó (Be Vietnam Pro đã có sẵn trong trang). */
  const fontList=draft?.theme?.availableFonts??[];const fontKey=fontList.join('|');
  useEffect(()=>{const fonts=fontKey?fontKey.split('|'):[];const id='fm-font-picker';let link=document.getElementById(id) as HTMLLinkElement|null;if(!fonts.length){link?.remove();return;}if(!link){link=document.createElement('link');link.id=id;link.rel='stylesheet';document.head.appendChild(link);}link.href=googleFontsUrl(fonts);},[fontKey]);
  const [newFont,setNewFont]=useState(''),[fontError,setFontError]=useState(''),[checkingFont,setCheckingFont]=useState(false);
  /** Thêm font vào danh sách (bản nháp): đúng dạng tên, không trùng, và phải có thật trên Google Fonts (hỏi Google trước khi thêm). */
  async function addFont(){const name=newFont.trim().replace(/\s+/g,' ');const list=draft?.theme?.availableFonts??[];if(!FONT_NAME.test(name)){setFontError('Tên font chỉ gồm chữ, số và dấu cách, đúng như trên Google Fonts.');return}if(name.toLowerCase()===DEFAULT_FONT.toLowerCase()||list.some(f=>f.toLowerCase()===name.toLowerCase())){setFontError('Font này đã có trong danh sách.');return}if(list.length>=MAX_FONTS){setFontError(`Danh sách tối đa ${MAX_FONTS} font.`);return}setCheckingFont(true);try{const found=await fontExists(name);if(found===null){setFontError('Không kiểm tra được với Google Fonts. Thử lại sau.');return}if(!found){setFontError(`Không tìm thấy "${name}" trên Google Fonts. Kiểm tra lại tên (phân biệt hoa thường).`);return}set('theme',{availableFonts:[...list,name]});setNewFont('');setFontError('')}catch{setFontError('Không kiểm tra được với Google Fonts. Thử lại sau.')}finally{setCheckingFont(false)}}
  function removeFont(name:string){if(draft?.theme?.fontFamily===name){setFontError('Font này đang được chọn. Chọn font khác trước khi xóa.');return}setFontError('');set('theme',{availableFonts:(draft?.theme?.availableFonts??[]).filter(f=>f!==name)})}
  if(!draft||!view)return error?<PageError message={error} retry={()=>void load()}/>:<LoadingRows/>;
  const toggle=(label:string,hint:string,checked:boolean,onChange:(value:boolean)=>void)=><label className="fm-field fm-switch-row"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span><strong>{label}</strong><small>{hint}</small></span></label>;
  const number=(label:string,value:number,onChange:(value:number)=>void,step=1)=><label className="fm-field fm-field--inline">{label}<input type="number" step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
  const text=(label:string,value:string,onChange:(value:string)=>void,placeholder='')=><label className="fm-field">{label}<input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>;
  const card=(title:string,children:ReactNode,hint?:string)=><div className="fm-card"><div className="fm-sheet__intro"><h2>{title}</h2>{hint&&<p className="fm-hint">{hint}</p>}</div><div className="fm-sheet__body">{children}</div></div>;
  const theme=draft.theme;
  const textFont=theme.fontFamily?`'${theme.fontFamily}', 'Be Vietnam Pro', sans-serif`:`'Be Vietnam Pro', sans-serif`;

  return <section>{navigationDialog}
    <PageError message={error} retry={()=>void load()}/><SuccessNotice message={notice}/>
    <p className="fm-hint">Đang chạy: <strong>phiên bản {view.version}</strong>{view.version>0?` · lưu lúc ${when(view.updatedAt)}`:' (giá trị mặc định, chưa ai lưu)'}</p>
    {section!=='history'&&<div className="fm-card fm-toolbar fm-sticky-bar"><span>{dirty?'Có thay đổi chưa lưu.':'Chưa có thay đổi.'}</span><span className="fm-actions"><button className="btn" disabled={!dirty||busy} onClick={()=>void load(true)}>Bỏ thay đổi</button><button className="btn btn--primary" disabled={!dirty||busy||conflict} onClick={()=>{const issue=validateConfigValue(draft);if(issue){setError(issue);return;}if(draft.limits.alertT1Percent>=draft.limits.alertT2Percent){setError('T1 phải nhỏ hơn T2.');return;}setError('');setSaving(true)}}>Lưu thay đổi</button></span></div>}

    {section==='app'&&<div className="fm-sheet">
      {card('Chế độ bảo trì',<>{toggle('Bật bảo trì','Người dùng thường thấy thông báo chặn và không dùng được ứng dụng. Quản trị viên vẫn vào được để kiểm tra và tắt.',draft.maintenance.enabled,value=>set('maintenance',{enabled:value}))}
        {text('Tiêu đề thông báo',draft.maintenance.title,value=>set('maintenance',{title:value}))}
        <label className="fm-field">Nội dung thông báo<textarea rows={3} value={draft.maintenance.message} onChange={e=>set('maintenance',{message:e.target.value})}/></label>
        <label className="fm-field">Dự kiến xong (tùy chọn)<input type="datetime-local" value={draft.maintenance.estimatedEndAt?new Date(new Date(draft.maintenance.estimatedEndAt).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):''} onChange={e=>set('maintenance',{estimatedEndAt:e.target.value?new Date(e.target.value).toISOString():null})}/></label></>)}
      {card('Phiên bản ứng dụng',<>{text('Phiên bản tối thiểu',draft.appVersion.minVersion,value=>set('appVersion',{minVersion:value}),'1.0.0')}{text('Phiên bản mới nhất',draft.appVersion.latestVersion,value=>set('appVersion',{latestVersion:value}),'1.0.0')}
        {toggle('Buộc cập nhật','Bật thì ứng dụng cũ hơn phiên bản mới nhất cũng phải cập nhật, không chỉ ứng dụng dưới mức tối thiểu.',draft.appVersion.forceUpdate,value=>set('appVersion',{forceUpdate:value}))}{text('Liên kết cửa hàng (https)',draft.appVersion.storeUrl,value=>set('appVersion',{storeUrl:value}))}</>)}
      {card('Tính năng',<>{toggle('Chat AI','Nhập giao dịch bằng câu chat',draft.features.chatAi,value=>set('features',{chatAi:value}))}{toggle('Giọng nói','Nhập giao dịch bằng giọng nói',draft.features.voice,value=>set('features',{voice:value}))}{toggle('Quét hóa đơn','Chụp hóa đơn để nhập',draft.features.billScan,value=>set('features',{billScan:value}))}{toggle('Đọc thông báo ngân hàng','Tự tạo giao dịch từ thông báo',draft.features.notificationReading,value=>set('features',{notificationReading:value}))}{([['groups','Tài chính nhóm','Chỉ bật khi ứng dụng và điều khoản đã sẵn sàng.'],['support','Hỗ trợ khách hàng','Cần màn hình ứng dụng và xác thực 2 lớp cho đội vận hành.'],['marketAlerts','Cảnh báo thị trường','Chỉ bật sau khi ứng dụng xử lý được loại cảnh báo này.'],['community','Cộng đồng','Cần câu chữ đồng ý và nhân sự duyệt ảnh.'],['subscriptions','Gói đăng ký','Bật kiểm tra hạn mức và tạo đơn mới; tắt vẫn ghi nhận tiền đã trả.'],['groupFunds','Quỹ chung','Chỉ có hiệu lực khi Tài chính nhóm cũng bật.']] as const).map(([key,label,hint])=><div key={key}>{toggle(label,hint,draft.features[key],value=>set('features',{[key]:value}))}</div>)}</>)}
    </div>}

    {section==='limits'&&<div className="fm-sheet">
      {card('Ngưỡng cảnh báo ngân sách mặc định',<>{number('Nhắc nhẹ T1 (% hạn mức đã dùng, 1-98)',draft.limits.alertT1Percent,value=>set('limits',{alertT1Percent:value}))}{number('Cảnh báo mạnh T2 (% hạn mức đã dùng, 2-99)',draft.limits.alertT2Percent,value=>set('limits',{alertT2Percent:value}))}</>,'Áp dụng cho người dùng không có ngưỡng cá nhân và không dùng cách quản lý nào có ngưỡng riêng. Mỗi phương pháp tài chính có T1/T2 riêng (sửa ở Phương pháp tài chính) và người dùng tự đặt được ngưỡng cá nhân. T1 phải nhỏ hơn T2. Mức "vượt hạn mức" luôn là 100%, không cấu hình.')}
      {card('Đồng bộ local-first',<>{number('Chu kỳ nền (phút, 5-1440)',draft.sync.intervalMinutes,value=>set('sync',{intervalMinutes:value}))}{number('Số lần thử lại (0-20)',draft.sync.maxRetries,value=>set('sync',{maxRetries:value}))}{number('Giữ hàng đợi tối đa (ngày, 1-90)',draft.sync.queueRetentionDays,value=>set('sync',{queueRetentionDays:value}))}</>)}
      {card('Gợi ý cách quản lý tài chính',<>{number('Dùng lại gợi ý trong (phút, 0-1440)',draft.financeMethods.recommendationReuseMinutes,value=>set('financeMethods',{recommendationReuseMinutes:value}))}{number('Điểm tối thiểu của cách bổ trợ (% so với cách chính, 1-100)',draft.financeMethods.supportMinSharePercent,value=>set('financeMethods',{supportMinSharePercent:value}))}</>,'Xin lại gợi ý với cùng câu trả lời khảo sát trong khoảng này thì trả bản vừa tạo, không gọi AI lại (0 = luôn tạo mới). Khi AI lỗi và ứng dụng chọn bằng luật, cách bổ trợ chỉ được chọn nếu điểm của nó đạt ít nhất tỷ lệ này so với cách chính.')}
      {card('Quét QR: khớp giao dịch',<>{number('Cửa sổ khớp (phút, 5-180)',draft.qrTransfer.matchWindowMinutes,value=>set('qrTransfer',{matchWindowMinutes:value}))}{number('Lệch đồng hồ cho phép (phút, 0-10)',draft.qrTransfer.clockSkewMinutes,value=>set('qrTransfer',{clockSkewMinutes:value}))}{number('Hết hạn lần quét (giờ, 1-168)',draft.qrTransfer.pendingLifetimeHours,value=>set('qrTransfer',{pendingLifetimeHours:value}))}</>,'Thông báo ngân hàng phải đến trong cửa sổ này sau lúc quét thì mới khớp với lần quét. Quá hẹp thì lỡ người nhập OTP chậm, quá rộng thì khớp nhầm giao dịch cùng số tiền.')}
      {card('Quét QR: nhập liệu',<>{number('Trần số tiền (đồng)',draft.qrTransfer.maxAmount,value=>set('qrTransfer',{maxAmount:value}))}{number('Độ dài nội dung tối đa (20-100)',draft.qrTransfer.maxMessageLength,value=>set('qrTransfer',{maxMessageLength:value}))}{text('Nội dung chuyển khoản mặc định',draft.qrTransfer.defaultMessage,value=>set('qrTransfer',{defaultMessage:value}))}</>,'Nên viết không dấu: nhiều ngân hàng không nhận dấu tiếng Việt.')}
      {card('Quét QR: mở ứng dụng ngân hàng',<>{text('Máy chủ chuyển tiếp (tên miền)',draft.qrTransfer.deeplinkHost,value=>set('qrTransfer',{deeplinkHost:value}),'dl.vietqr.io')}{text('Liên kết quay về (https)',draft.qrTransfer.deeplinkReturnUrl,value=>set('qrTransfer',{deeplinkReturnUrl:value}))}</>,'Số tài khoản, số tiền và nội dung của người dùng đi qua máy chủ này. Chỉ đổi khi dịch vụ đổi địa chỉ; thiếu liên kết quay về thì ứng dụng ngân hàng chỉ mở màn hình chủ.')}
    </div>}

    {section==='appearance'&&<div className="fm-sheet">
      {card('Font chữ',<><label className="fm-field">Font cho mọi chữ trong app<select value={theme.fontFamily??''} onChange={e=>set('theme',{fontFamily:e.target.value||null})}><option value="">{DEFAULT_FONT} (mặc định)</option>{(theme.availableFonts??[]).map(font=><option key={font} value={font}>{font}</option>)}</select></label><div className="fm-font-preview" style={{fontFamily:textFont}} aria-live="polite"><small>Xem trước: {theme.fontFamily||'Be Vietnam Pro'}</small><strong>Tiền ăn trưa hôm nay — Ăn uống</strong><p>Số dư tháng này còn đủ cho các khoản đã lên kế hoạch.</p><p className="fm-font-preview__letters">Aa Ăă Ââ Đđ Êê Ôô Ơơ Ưư · 0123456789</p></div><div className="fm-font-list"><span className="fm-font-list__title">Danh sách font được chọn ({(theme.availableFonts??[]).length})</span><ul>{(theme.availableFonts??[]).map(font=><li key={font} style={{fontFamily:`'${font}', '${DEFAULT_FONT}', sans-serif`}}>{font}<button type="button" aria-label={`Xóa font ${font}`} title="Xóa khỏi danh sách" onClick={()=>removeFont(font)}>×</button></li>)}</ul><form className="fm-font-add" onSubmit={e=>{e.preventDefault();void addFont()}}><input value={newFont} onChange={e=>{setNewFont(e.target.value);setFontError('')}} placeholder="Tên font trên Google Fonts, ví dụ Plus Jakarta Sans" aria-label="Tên font mới"/><button className="btn" disabled={checkingFont||!newFont.trim()}>{checkingFont?'Đang kiểm tra…':'Thêm font'}</button></form>{fontError&&<small className="fm-font-error" role="alert">{fontError}</small>}<small className="fm-hint">Chọn font có hỗ trợ tiếng Việt: xem dòng chữ có dấu ở ô xem trước. Thêm hoặc xóa font cũng cần bấm Lưu thay đổi.</small></div></>,'Chọn font trong danh sách, ô xem trước ngay bên dưới đổi theo. Danh sách font quản lý ngay tại đây. Số tiền luôn dùng Inter để các con số thẳng cột. Màu sắc, sáng/tối và cỡ chữ do người dùng tự chọn trong app, admin không đè lên.')}
      {card('Logo',<><div className="fm-field fm-logo-field"><span>Ảnh logo (PNG, JPG, WebP, tối đa 2 MB)</span><span className="fm-actions"><label className="btn" aria-disabled={uploading}>{uploading?'Đang tải lên...':theme.logoUrl?'Đổi ảnh':'Chọn ảnh'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={uploading} onChange={e=>{void uploadLogo(e.target.files?.[0]);e.target.value=''}}/></label>{theme.logoUrl&&<button type="button" className="btn" disabled={uploading} onClick={()=>set('theme',{logoUrl:null})}>Dùng logo mặc định</button>}</span></div>{theme.logoUrl&&<img className="fm-logo-preview" src={theme.logoUrl} alt="Logo xem trước"/>}</>,'Ảnh được lưu trên Firebase Storage. Cần nhập bucket và service account Firebase ở Tích hợp bên thứ ba trước.')}
      {card('Xem trước',<div><span className="fm-badge">Minh họa giao diện</span><div className="fm-phone" style={{background:APP_SURFACE,fontFamily:textFont}}>
        <div className="fm-phone-head" style={{background:APP_INK}}>{theme.logoUrl?<img src={theme.logoUrl} alt="" height={22}/>:<strong>FinMate</strong>}</div>
        <div className="fm-phone-body"><p>Số dư tháng này</p><strong style={{fontFamily:"'Inter', sans-serif",fontVariantNumeric:'tabular-nums'}}>12.500.000 đ</strong><button type="button" style={{background:APP_INK}}>Thêm giao dịch</button></div>
        <div className="fm-phone-nav">Tổng quan · Giao dịch · Ngân sách</div></div></div>)}
    </div>}

    {section==='advanced'&&<AdvancedConfigEditor value={draft} onChange={value=>setDraft(value as Doc)}/>}

    {section==='history'&&<div className="fm-card"><div className="fm-toolbar"><h2>Lịch sử thay đổi</h2></div>
      {versions.length?versions.map(v=><div className="fm-list-row" key={v.version}><span><strong>Phiên bản {v.version}</strong> <span className={`fm-badge ${v.status==='active'?'good':''}`}>{v.status==='active'?'Đang chạy':'Đã thay'}</span><br/><small>{when(v.createdAt)} · {v.note||'Không có lý do'}</small></span><span className="fm-actions"><button className="btn btn--small" onClick={()=>void show(v.version)}>Xem</button><button className="btn btn--small" disabled={busy||v.status==='active'} onClick={()=>setRollback(v.version)}>Khôi phục</button></span></div>):<EmptyState message="Chưa ai lưu cấu hình nào: hệ thống đang dùng giá trị mặc định."/>}
      <OffsetPager offset={offset} limit={HISTORY_PAGE} total={total} onChange={setOffset}/>
      {shown&&<div className="fm-preview"><h3>Nội dung phiên bản {shown.version}</h3><JsonDiff before={view.content} after={shown.content}/></div>}</div>}

    {saving&&<ConfirmReasonDialog error={error} title="Lưu cấu hình hệ thống" description={draft.maintenance.enabled&&!view.content.maintenance.enabled?'Bạn đang BẬT bảo trì: người dùng thường sẽ không dùng được ứng dụng cho tới khi tắt.':'Thay đổi áp dụng cho ứng dụng trong khoảng 30 giây và được ghi vào lịch sử để khôi phục.'} onCancel={()=>setSaving(false)} onConfirm={save} busy={busy}><JsonDiff before={view.content} after={draft}/></ConfirmReasonDialog>}
    {rollback!=null&&<ConfirmReasonDialog error={error} title={`Khôi phục phiên bản ${rollback}`} description="Tạo một phiên bản MỚI có nội dung của phiên bản này. Lịch sử cũ vẫn được giữ nguyên." onCancel={()=>setRollback(null)} onConfirm={restore} busy={busy}/>}
  </section>;
}
