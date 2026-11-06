import { Login } from './auth/Login';
import { useEffect, useState, type ReactElement } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { accessToken, clearSession, errorText, getData, INTERNAL_ROLES, logout, needsOtp, type OpsMe, type Profile } from '../shared/api';
import { OpsTicketsPage } from './ops/OpsTicketsPage';
import { OpsTicketDetailPage } from './ops/OpsTicketDetailPage';
import { OpsApprovalsPage } from './ops/OpsApprovalsPage';
import { OpsDashboardPage } from './ops/OpsDashboardPage';
import { OpsMonitoringPage } from './ops/OpsMonitoringPage';
import { OpsCannedRepliesPage } from './ops/OpsCannedRepliesPage';
import { OpsAuditPage } from './ops/OpsAuditPage';
import { OpsAiStatsPage } from './ops/OpsAiStatsPage';
import { CatalogPage, DashboardPage, LogsPage, UsersPage, DeletionsPage } from './CorePages';
import { AiLearningPage, ProfilePage, ProvidersPage, RolesPage, SyncPage } from './ExtraPages';
import { AiSettingsLayout, DictionaryPage, KnowledgePage, RasaPage, RulesPage, SettingsRedirect, SystemSettingsPage } from './SettingsPages';
import { SurveyPage } from './SurveyPage';
import { FinanceMethodsPage } from './FinanceMethodsPage';
import { AppShell } from './layout/AppShell';
import axios from 'axios';

const homeFor=(role:string,caps:string[])=>role==='Admin'?'/':caps.includes('ViewDashboard')?'/ops/dashboard':'/ops/tickets';
function Require({caps,need,children}:{caps:string[];need:string;children:ReactElement}){return caps.includes(need)?children:<Navigate to="/" replace/>}

export function App() {
  const [profile,setProfile]=useState<Profile|null>(null),[awaitingOtp,setAwaitingOtp]=useState<Profile|null>(null),[checking,setChecking]=useState(Boolean(accessToken()));
  const [ops,setOps]=useState<OpsMe|null>(null),[opsError,setOpsError]=useState('');
  const [bootError,setBootError]=useState(''),[bootAttempt,setBootAttempt]=useState(0);
  const navigate=useNavigate();
  useEffect(()=>{if(!accessToken())return;let live=true;
    (async()=>{const me=await getData<Profile>('/users/me');if(!live)return;
      if(!INTERNAL_ROLES.includes(me.role)){clearSession();return}
      if(await needsOtp()){if(live)setAwaitingOtp(me)}else if(live)setProfile(me)})()
      .catch(error=>{if(!live)return;if(axios.isAxiosError(error)&&error.response?.status===401){clearSession();sessionStorage.setItem('finmate_expired','1')}else setBootError(errorText(error))}).finally(()=>{if(live)setChecking(false)});
    return()=>{live=false}},[bootAttempt]);
  // Quyền hiệu lực đọc từ backend (không đoán từ token): menu và route vận hành dựng từ đây.
  useEffect(()=>{if(!profile)return;let live=true;getData<OpsMe>('/ops/me').then(m=>{if(live){setOps(m);setOpsError('')}}).catch(e=>{if(live)setOpsError(errorText(e))});return()=>{live=false}},[profile]);
  async function signOut(){try{await logout()}catch{/* clearSession runs in finally */}setProfile(null);setOps(null);setAwaitingOtp(null);navigate('/login',{replace:true})}
  if(checking)return <div className="fm-loading">Đang kiểm tra phiên đăng nhập...</div>;
  if(bootError)return <div className="login-screen"><div className="login-card"><h1>Chưa thể tải phiên</h1><p>Thử lại kết nối để tiếp tục làm việc.</p><div className="error-box" role="alert">{bootError}</div><button className="btn btn--primary" onClick={()=>{setBootError('');setChecking(true);setBootAttempt(value=>value+1)}}>Thử lại</button><button className="btn" onClick={()=>{setBootError('');void signOut()}}>Đăng xuất</button></div></div>;
  if(!profile)return <Routes><Route path="/login" element={<Login onLogin={setProfile} pending={awaitingOtp} onCancel={()=>setAwaitingOtp(null)}/>}/><Route path="*" element={<Navigate to="/login" replace/>}/></Routes>;
  const isAdmin=profile.role==='Admin',caps=ops?.capabilities??[],home=homeFor(profile.role,caps);
  // Admin vẫn vào được trang quản trị khi /ops/me lỗi (backend cũ chưa có); Staff/OpsManager không có gì để xem nếu thiếu quyền.
  if(!ops&&!isAdmin)return <div className="fm-loading">{opsError?<>{opsError} <button className="btn" onClick={()=>void signOut()}>Đăng xuất</button></>:'Đang tải quyền...'}</div>;
  const need=(cap:string,page:ReactElement)=><Require caps={caps} need={cap}>{page}</Require>;
  return <Routes><Route path="/login" element={<Navigate to="/" replace/>}/><Route element={<AppShell profile={profile} caps={caps} onLogout={signOut}/>}>
    {ops&&<><Route path="/ops/dashboard" element={need('ViewDashboard',<OpsDashboardPage/>)}/><Route path="/ops/tickets" element={need('HandleTickets',<OpsTicketsPage/>)}/><Route path="/ops/tickets/:id" element={need('HandleTickets',<OpsTicketDetailPage me={ops}/>)}/><Route path="/ops/approvals" element={need('ProposeApprovals',<OpsApprovalsPage me={ops}/>)}/><Route path="/ops/canned-replies" element={need('ManageCannedReplies',<OpsCannedRepliesPage/>)}/><Route path="/ops/monitoring" element={need('ViewMonitoring',<OpsMonitoringPage me={ops}/>)}/><Route path="/ops/audit" element={need('ViewOpsAudit',<OpsAuditPage/>)}/><Route path="/ops/ai-stats" element={need('ViewAiStats',<OpsAiStatsPage/>)}/></>}
    {!isAdmin&&<><Route path="/" element={<Navigate to={home} replace/>}/><Route path="/profile" element={<ProfilePage profile={profile} onLogout={signOut}/>}/></>}
    {isAdmin&&<><Route path="/" element={<DashboardPage/>}/><Route path="/users" element={<UsersPage currentUserId={profile?.id}/>}/><Route path="/roles" element={<RolesPage currentUserId={profile?.id}/>}/><Route path="/audit-logs" element={<LogsPage/>}/><Route path="/data-deletion" element={<DeletionsPage/>}/>
    <Route path="/categories" element={<CatalogPage kind="categories"/>}/><Route path="/providers" element={<ProvidersPage/>}/><Route path="/finance-methods" element={<FinanceMethodsPage/>}/><Route path="/goal-templates" element={<CatalogPage kind="goal-templates"/>}/><Route path="/survey" element={<SurveyPage/>}/>
    <Route path="/settings" element={<SettingsRedirect/>}/><Route path="/settings/system" element={<SystemSettingsPage/>}/><Route path="/settings/ai" element={<AiSettingsLayout/>}><Route index element={<Navigate to="dictionary" replace/>}/><Route path="dictionary" element={<DictionaryPage/>}/><Route path="rules" element={<RulesPage/>}/><Route path="knowledge" element={<KnowledgePage/>}/><Route path="rasa" element={<RasaPage/>}/></Route><Route path="/sync" element={<SyncPage/>}/><Route path="/ai-learning" element={<AiLearningPage/>}/><Route path="/profile" element={<ProfilePage profile={profile} onLogout={signOut}/>}/>
    <Route path="/dashboard" element={<Navigate to="/" replace/>}/><Route path="/provider-configs" element={<Navigate to="/providers" replace/>}/><Route path="/survey-questions" element={<Navigate to="/survey" replace/>}/><Route path="/ai-rules" element={<Navigate to="/settings/ai/rules" replace/>}/><Route path="/ai-config" element={<Navigate to="/settings/ai/dictionary" replace/>}/></>}
  </Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}


