import { Login } from './auth/Login';
import { lazy, useEffect, useState, type ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { accessToken, clearSession, errorText, getData, INTERNAL_ROLES, logout, needsOtp, type OpsMe, type Profile } from '../shared/api';
import { OpsTicketsPage } from './ops/OpsTicketsPage';
import { OpsTicketDetailPage } from './ops/OpsTicketDetailPage';
import { OpsApprovalsPage } from './ops/OpsApprovalsPage';
import { OpsDashboardPage } from './ops/OpsDashboardPage';
import { OpsMonitoringPage } from './ops/OpsMonitoringPage';
import { OpsCannedRepliesPage } from './ops/OpsCannedRepliesPage';
import { OpsAuditPage } from './ops/OpsAuditPage';
import { OpsAiStatsPage } from './ops/OpsAiStatsPage';
import { AgentSandboxPage } from './AgentSandboxPage';
import { AgentUsagePage } from './AgentUsagePage';
import { EconomicFeedsPage } from './EconomicFeedsPage';
import { CatalogPage, DashboardPage, LogsPage, UsersPage, DeletionsPage } from './CorePages';
import { AiLearningPage, ProfilePage, ProvidersPage, RolesPage } from './ExtraPages';
import { AiSettingsLayout, DictionaryPage, KnowledgePage, RulesPage, SettingsRedirect, SystemSettingsPage } from './SettingsPages';
import { SurveyPage } from './SurveyPage';
import { FinanceMethodsPage } from './FinanceMethodsPage';
import { AppShell } from './layout/AppShell';
import axios from 'axios';
import { useResource } from './ui/useResource';
import { hasAny, homeFor, isAdminRole } from '../shared/permissions';
import { PageHeader } from './Shared';


const KnowledgeLibraryPage=lazy(()=>import('./modules/KnowledgePage').then(m=>({default:m.KnowledgeLibraryPage})));
const AssumptionsPage=lazy(()=>import('./modules/AssumptionsPage').then(m=>({default:m.AssumptionsPage})));
const ForecastPage=lazy(()=>import('./modules/ForecastPage').then(m=>({default:m.ForecastPage})));
const CommunityPage=lazy(()=>import('./modules/CommunityPage').then(m=>({default:m.CommunityPage})));
const LegalPage=lazy(()=>import('./modules/LegalPage').then(m=>({default:m.LegalPage})));
const SubscriptionsPage=lazy(()=>import('./modules/SubscriptionsPage').then(m=>({default:m.SubscriptionsPage})));
const PendingDataPage=lazy(()=>import('./modules/DevelopmentPages').then(m=>({default:m.PendingDataPage})));
const KpiOverviewPage=lazy(()=>import('./modules/DevelopmentPages').then(m=>({default:m.KpiOverviewPage})));
const MarketPage=lazy(()=>import('./modules/MarketPage').then(m=>({default:m.MarketPage})));

function Require({caps,need,children}:{caps:string[];need:string|string[];children:ReactElement}){return hasAny(caps,need)?children:<PageHeader title="Bạn không có quyền mở trang này" description="Quyền có thể đã thay đổi. Chọn một trang được cấp quyền trong menu hoặc tải lại quyền."/>}

export function App() {
  const [profile,setProfile]=useState<Profile|null>(null),[awaitingOtp,setAwaitingOtp]=useState<Profile|null>(null),[checking,setChecking]=useState(Boolean(accessToken()));
  const opsResource=useResource<OpsMe>('/ops/me',{},Boolean(profile));
  const ops=opsResource.data??null,opsError=opsResource.error;
  const [bootError,setBootError]=useState(''),[bootAttempt,setBootAttempt]=useState(0);
  const navigate=useNavigate(),location=useLocation();
  useEffect(()=>{if(!accessToken())return;let live=true;
    (async()=>{const me=await getData<Profile>('/users/me');if(!live)return;
      if(!INTERNAL_ROLES.includes(me.role)){clearSession();return}
      if(await needsOtp()){if(live)setAwaitingOtp(me)}else if(live)setProfile(me)})()
      .catch(error=>{if(!live)return;if(axios.isAxiosError(error)&&error.response?.status===401){clearSession();sessionStorage.setItem('finmate_expired','1')}else setBootError(errorText(error))}).finally(()=>{if(live)setChecking(false)});
    return()=>{live=false}},[bootAttempt]);
  async function signOut(){try{await logout()}catch{/* clearSession runs in finally */}setProfile(null);setAwaitingOtp(null);navigate('/login',{replace:true})}
  if(checking)return <div className="fm-loading">Đang kiểm tra phiên đăng nhập...</div>;
  if(bootError)return <div className="login-screen"><div className="login-card"><h1>Chưa thể tải phiên</h1><p>Thử lại kết nối để tiếp tục làm việc.</p><div className="error-box" role="alert">{bootError}</div><button className="btn btn--primary" onClick={()=>{setBootError('');setChecking(true);setBootAttempt(value=>value+1)}}>Thử lại</button><button className="btn" onClick={()=>{setBootError('');void signOut()}}>Đăng xuất</button></div></div>;
  if(!profile)return <Routes><Route path="/login" element={<Login onLogin={setProfile} pending={awaitingOtp} onCancel={()=>setAwaitingOtp(null)}/>}/><Route path="*" element={<Navigate to="/login" state={{from:location.pathname+location.search}} replace/>}/></Routes>;
  const isAdmin=isAdminRole(profile.role),caps=ops?.capabilities??[],home=homeFor(profile.role,caps);
  // Keep the requested route while effective permissions are loading, including Admin.
  if(!ops)return <div className="login-screen"><div className="login-card"><h1>Đang tải quyền</h1>{opsError?<><p role="alert">{opsError}</p><button className="btn btn--primary" onClick={opsResource.reload}>Thử lại</button><button className="btn" onClick={()=>void signOut()}>Đăng xuất</button></>:<p>Đang kiểm tra quyền truy cập trang bạn yêu cầu…</p>}</div></div>;
  const requested=(location.state as {from?:string}|null)?.from;
  const loginDestination=requested?.startsWith('/')&&!requested.startsWith('//')&&!requested.startsWith('/login')?requested:home;
  const need=(cap:string|string[],page:ReactElement)=><Require caps={caps} need={cap}>{page}</Require>;
  return <Routes><Route path="/login" element={<Navigate to={loginDestination} replace/>}/><Route element={<AppShell profile={profile} caps={caps} onLogout={signOut}/>}>
    {ops&&<><Route path="/ops/dashboard" element={need('ViewDashboard',<OpsDashboardPage/>)}/><Route path="/ops/tickets" element={need('HandleTickets',<OpsTicketsPage/>)}/><Route path="/ops/tickets/:id" element={need('HandleTickets',<OpsTicketDetailPage me={ops}/>)}/><Route path="/ops/approvals" element={need(['ProposeApprovals','DecideApprovals'],<OpsApprovalsPage me={ops}/>)}/><Route path="/ops/forecast-feedback" element={<Navigate to="/ops/forecast" replace/>}/><Route path="/ops/forecast-accuracy" element={<Navigate to="/ops/forecast" replace/>}/><Route path="/ops/canned-replies" element={need('ManageCannedReplies',<OpsCannedRepliesPage/>)}/><Route path="/ops/monitoring" element={need('ViewMonitoring',<OpsMonitoringPage me={ops}/>)}/><Route path="/ops/audit" element={need('ViewOpsAudit',<OpsAuditPage/>)}/><Route path="/ops/ai-stats" element={need('ViewAiStats',<OpsAiStatsPage/>)}/></>}
    <Route path="/ops/knowledge" element={need('ManageAgentContent',<KnowledgeLibraryPage me={ops}/>)}/><Route path="/ops/assumptions" element={need('ManageAgentContent',<AssumptionsPage me={ops}/>)}/>
    <Route path="/ops/forecast" element={need(['ViewMonitoring','HandleTickets'],<ForecastPage me={ops}/>)}/>
    <Route path="/ops/community" element={need('ModerateCommunity',<CommunityPage me={ops}/>)}/>
    <Route path="/ops/legal" element={need('ManageLegalDocuments',<LegalPage me={ops}/>)}/>
    <Route path="/ops/subscriptions" element={need('ManageSubscriptionPlans',<SubscriptionsPage/>)}/>
    {!isAdmin&&<><Route path="/" element={<Navigate to={home} replace/>}/><Route path="/profile" element={<ProfilePage profile={profile} onLogout={signOut}/>}/></>}
    {isAdmin&&<><Route path="/overview" element={<KpiOverviewPage/>}/><Route path="/markets" element={<MarketPage/>}/><Route path="/" element={<DashboardPage/>}/><Route path="/users" element={<UsersPage currentUserId={profile?.id}/>}/><Route path="/roles" element={<RolesPage currentUserId={profile?.id}/>}/><Route path="/audit-logs" element={<LogsPage/>}/><Route path="/data-deletion" element={<DeletionsPage/>}/>
    <Route path="/categories" element={<CatalogPage kind="categories"/>}/><Route path="/providers" element={<ProvidersPage/>}/><Route path="/finance-methods" element={<FinanceMethodsPage/>}/><Route path="/goal-templates" element={<CatalogPage kind="goal-templates"/>}/><Route path="/survey" element={<SurveyPage/>}/>
    <Route path="/settings" element={<SettingsRedirect/>}/><Route path="/settings/system" element={<SystemSettingsPage/>}/><Route path="/settings/economic" element={<EconomicFeedsPage/>}/><Route path="/settings/ai" element={<AiSettingsLayout/>}><Route index element={<Navigate to="dictionary" replace/>}/><Route path="dictionary" element={<DictionaryPage/>}/><Route path="rules" element={<RulesPage/>}/><Route path="knowledge" element={<KnowledgePage/>}/><Route path="rasa" element={<Navigate to="/settings/ai/dictionary" replace/>}/></Route><Route path="/sync" element={<PendingDataPage kind="sync"/>}/><Route path="/ai-learning" element={<AiLearningPage/>}/><Route path="/agent-sandbox" element={<AgentSandboxPage/>}/><Route path="/ai-usage" element={<AgentUsagePage/>}/><Route path="/profile" element={<ProfilePage profile={profile} onLogout={signOut}/>}/>
    <Route path="/dashboard" element={<Navigate to="/" replace/>}/><Route path="/provider-configs" element={<Navigate to="/providers" replace/>}/><Route path="/survey-questions" element={<Navigate to="/survey" replace/>}/><Route path="/ai-rules" element={<Navigate to="/settings/ai/rules" replace/>}/><Route path="/ai-config" element={<Navigate to="/settings/ai/dictionary" replace/>}/></>}
  </Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}


