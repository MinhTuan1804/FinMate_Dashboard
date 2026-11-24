import { LearningSummary, SuggestionsPanel } from './LearningSuggestions';
import { displayValue } from '../shared/labels';
import { lazy, useState, type FormEvent } from 'react';
import { api, errorText, type Profile } from '../shared/api';
import { ROLES, type UserRole } from '../shared/models';
import { ConfirmDialog, ConfirmReasonDialog, CursorPager, LoadingRows, PageError, PageHeader } from './Shared';
import { SearchField } from './ui/ListControls';
const PendingDataPage=lazy(()=>import('./modules/DevelopmentPages').then(m=>({default:m.PendingDataPage})));
import { useUrlState } from './ui/useUrlState';
import { useCursorList } from './ui/useServerList';
import { CatalogPage } from './CorePages';
import { RolePermissionsPanel } from './RolePermissionsPanel';
import { FormatsPanel } from './FormatsPanel';
import { FeedbackPanel } from './LearningPanels';

type User = {id:string;displayName:string;email:string;role:UserRole;isLocked:boolean;createdAt:string};

/** Thứ bậc để biết một lần đổi vai trò có làm giảm quyền không (khớp UserRoleExtensions.Rank ở backend). */
const LEVEL:Record<UserRole,number>={User:0,Staff:1,OpsManager:2,Admin:3};

export function RolesPage({currentUserId}:{currentUserId?:string}) {
  const [tab,setTab]=useUrlState('tab','team');
  const [filter,setFilter]=useUrlState('roleFilter','internal');   // 'internal' = mọi vai trò khác User; '' = tất cả
  const list=useCursorList<User>('/admin/users',{params:filter==='internal'?{internalOnly:true}:filter?{role:filter}:{}});   // tìm kiếm + lọc vai trò + phân trang do API làm
  const [pending,setPending]=useState<{user:User;role:UserRole}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function change(reason:string){if(!pending)return;setBusy(true);try{await api.patch(`/admin/users/${pending.user.id}/role`,{role:pending.role,reason});setPending(null);setError('');list.reload()}catch(e){setError(errorText(e))}finally{setBusy(false)}}
  const picker=(u:User)=><select style={{minWidth:'9rem'}} aria-label={`Vai trò của ${u.displayName}`} value={u.role} disabled={u.id===currentUserId} title={u.id===currentUserId?'Không tự đổi vai trò của mình':undefined} onChange={e=>{setError('');if(e.target.value!==u.role)setPending({user:u,role:e.target.value as UserRole})}}>{ROLES.map(r=><option key={r} value={r}>{displayValue(r)}</option>)}</select>;
  return <><PageHeader title="Phân quyền" description="Quản lý vai trò và quyền truy cập của đội ngũ. Chỉ quản trị viên được thay đổi vai trò; bạn không thể tự đổi vai trò của mình."/><PageError message={error||list.error} retry={list.reload}/><div className="fm-tabs"><button className={tab==='team'?'active':''} onClick={()=>setTab('team')}>Tài khoản &amp; vai trò</button><button className={tab==='permissions'?'active':''} onClick={()=>setTab('permissions')}>Ma trận quyền</button></div>{tab==='team'?<div className="fm-card"><div className="fm-toolbar fm-filter-bar"><SearchField value={list.search} onChange={list.setSearch} placeholder="Email hoặc tên"/><label>Vai trò<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="internal">Đội ngũ nội bộ</option><option value="">Tất cả</option>{ROLES.map(r=><option key={r} value={r}>{displayValue(r)}</option>)}</select></label></div><p className="fm-hint">Muốn cấp vai trò nội bộ cho một khách hàng: chọn vai trò "Người dùng", tìm theo email hoặc tên rồi đổi vai trò ở cột bên phải.</p>{list.loading&&list.rows.length===0?<LoadingRows/>:list.error&&!list.rows.length?null:<table className="fm-table"><thead><tr><th>Tên</th><th>Email</th><th>Vai trò</th></tr></thead><tbody>{list.rows.map(u=><tr key={u.id}><td>{u.displayName}</td><td>{u.email}</td><td>{picker(u)}</td></tr>)}{list.rows.length===0&&<tr><td colSpan={3}>Không có tài khoản nào khớp.</td></tr>}</tbody></table>}<CursorPager back={list.hasBack} next={list.hasNext} onBack={list.back} onNext={list.next}/></div>:<RolePermissionsPanel/>}{pending&&<ConfirmReasonDialog error={error} title={`Đổi vai trò thành ${displayValue(pending.role)}`} description={`Xác nhận đổi vai trò của ${pending.user.displayName} từ ${displayValue(pending.user.role)} sang ${displayValue(pending.role)}.${LEVEL[pending.role]<LEVEL[pending.user.role]?' Các phiên đăng nhập hiện có của họ sẽ bị thu hồi.':''}`} onCancel={()=>setPending(null)} onConfirm={change} busy={busy}/>}</>;
}

export function ProvidersPage(){const [requested,setTab]=useUrlState('tab','providers');const tab=requested==='formats'?'formats':'providers';return <><PageHeader title="Ngân hàng & Ví" description="Quản lý nhà cung cấp và định dạng thông báo."/><div className="fm-tabs"><button className={tab==='providers'?'active':''} onClick={()=>setTab('providers')}>Nhà cung cấp</button><button className={tab==='formats'?'active':''} onClick={()=>setTab('formats')}>Định dạng thông báo</button></div>{tab==='providers'?<CatalogPage kind="provider-configs" embedded/>:<FormatsPanel/>}</>}

export function AiLearningPage(){
  const [tab,setTab]=useUrlState('tab','suggestions');
  return <><PageHeader title="Học AI" description="Người dùng sửa kết quả AI ở đâu, và biến các lần sửa đó thành luật để AI tự xếp đúng lần sau."/>
    <LearningSummary/>
    <div className="fm-tabs">{[['suggestions','Gợi ý thêm vào từ điển'],['feedback','Phản hồi người dùng'],['bills','Mẫu hóa đơn']].map(([key,label])=><button key={key} aria-pressed={tab===key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</div>
    {tab==='suggestions'?<SuggestionsPanel/>:tab==='feedback'?<FeedbackPanel/>:<PendingDataPage kind="bills" embedded/>}
  </>;
}

export function ProfilePage({profile,onLogout}:{profile:Profile|null;onLogout:()=>Promise<void>}){const [current,setCurrent]=useState(''),[next,setNext]=useState(''),[repeat,setRepeat]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false),[confirmAll,setConfirmAll]=useState(false);
  const strong=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(next);
  async function change(event:FormEvent){event.preventDefault();if(!strong||next!==repeat)return;setBusy(true);try{await api.post('/auth/change-password',{currentPassword:current,newPassword:next});setSuccess('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');await onLogout()}catch(e){setError(errorText(e))}finally{setBusy(false)}}
  async function logoutAll(){setBusy(true);try{await api.post('/auth/logout-all');setConfirmAll(false);await onLogout()}catch(e){setError(errorText(e))}finally{setBusy(false)}}
  return <><PageHeader title="Hồ sơ admin" description="Thông tin tài khoản và bảo mật phiên đăng nhập."/><PageError message={error}/>{success&&<div className="fm-success">{success}</div>}<div className="fm-grid"><div className="fm-card"><h2>Thông tin</h2><dl className="fm-kv"><dt>Tên</dt><dd>{profile?.displayName}</dd><dt>Email</dt><dd>{profile?.email}</dd><dt>Vai trò</dt><dd>{profile?.role}</dd></dl><button className="btn" onClick={()=>setConfirmAll(true)}>Đăng xuất tất cả thiết bị</button></div><form className="fm-card fm-profile-form" onSubmit={change}><h2>Đổi mật khẩu</h2><label>Mật khẩu hiện tại<input type="password" value={current} onChange={e=>setCurrent(e.target.value)} required autoComplete="current-password"/></label><label>Mật khẩu mới<input type="password" value={next} onChange={e=>setNext(e.target.value)} required autoComplete="new-password"/></label><small>Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</small><label>Nhập lại mật khẩu mới<input type="password" value={repeat} onChange={e=>setRepeat(e.target.value)} required autoComplete="new-password"/></label><button className="btn btn--primary" disabled={busy||!strong||next!==repeat}>Đổi mật khẩu</button></form></div>{confirmAll&&<ConfirmDialog error={error} title="Đăng xuất tất cả thiết bị" description="Mọi phiên đăng nhập sẽ bị vô hiệu hóa." onCancel={()=>setConfirmAll(false)} onConfirm={async()=>logoutAll()} busy={busy}/>}</>}





