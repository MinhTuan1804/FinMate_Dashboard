import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Bot, BookOpen, BrainCircuit, ChevronRight, ClipboardCheck, Database, HeartPulse, Inbox, Landmark, LayoutDashboard, LogOut, Menu, MessageSquareText, Moon, PanelLeftClose, Search, Settings2, Shield, Sun, Tags, Target, UserCog, Users, Wallet, X, type LucideIcon } from 'lucide-react';
import { ROLE_LABEL, type Profile } from '../../shared/api';
import { DialogOverlay } from '../ui/DialogOverlay';

type NavGroup={title:string;links:[string,string,LucideIcon][]};
const adminGroups:NavGroup[]=[
  {title:'Tổng quan',links:[['/','Dashboard',LayoutDashboard]]},
  {title:'Tài khoản & quyền',links:[['/users','Người dùng',Users],['/roles','Phân quyền',UserCog],['/audit-logs','Nhật ký quản trị',Activity],['/data-deletion','Yêu cầu xóa dữ liệu',Shield]]},
  {title:'Danh mục tài chính',links:[['/categories','Danh mục',Tags],['/providers','Ngân hàng & ví',Wallet],['/finance-methods','Phương pháp tài chính',Database],['/goal-templates','Mẫu mục tiêu',Target],['/survey','Khảo sát',ClipboardCheck]]},
  {title:'Cấu hình',links:[['/settings/system','Hệ thống',Settings2],['/settings/ai','Trí tuệ nhân tạo',Bot],['/settings/economic','Số liệu kinh tế',Landmark],['/sync','Đồng bộ dữ liệu',Activity],['/ai-learning','Học AI',BrainCircuit]]},
];
const opsLinks:[string,string,LucideIcon,string][]=[['/ops/dashboard','Tổng quan',LayoutDashboard,'ViewDashboard'],['/ops/tickets','Hàng đợi ticket',Inbox,'HandleTickets'],['/ops/approvals','Đề xuất & duyệt',ClipboardCheck,'ProposeApprovals'],['/ops/knowledge','Tri thức AI',BookOpen,'DecideApprovals'],['/ops/assumptions','Giả định kinh tế',Landmark,'DecideApprovals'],['/ops/monitoring','Giám sát hệ thống',HeartPulse,'ViewMonitoring'],['/ops/canned-replies','Câu trả lời mẫu',MessageSquareText,'ManageCannedReplies'],['/ops/audit','Nhật ký vận hành',Activity,'ViewOpsAudit'],['/ops/ai-stats','Thống kê AI',BrainCircuit,'ViewAiStats']];
const subLabels:Record<string,string>={system:'Hệ thống',ai:'Trí tuệ nhân tạo',dictionary:'Từ điển',rules:'Luật',knowledge:'Kiến thức'};

export function AppShell({profile,caps,onLogout}:{profile:Profile;caps:string[];onLogout:()=>Promise<void>}){
  const location=useLocation(),navigate=useNavigate();
  const [collapsed,setCollapsed]=useState(()=>localStorage.getItem('finmate_sidebar')==='collapsed');
  const [mobile,setMobile]=useState(false),[searchOpen,setSearchOpen]=useState(false),[query,setQuery]=useState('');
  const [theme,setTheme]=useState(()=>localStorage.getItem('theme')==='dark'?'dark':'light');
  const searchRef=useRef<HTMLInputElement>(null);
  const sidebarRef=useRef<HTMLElement>(null);
  const [narrow,setNarrow]=useState(()=>window.matchMedia('(max-width:900px)').matches);
  const inOps=profile.role!=='Admin'||location.pathname.startsWith('/ops/');
  const ops:NavGroup[]=[{title:'Vận hành khách hàng',links:opsLinks.filter(link=>caps.includes(link[3])).map(([to,label,icon])=>[to,label,icon])}];
  const visibleOps=ops.filter(group=>group.links.length>0);
  const menu=profile.role==='Admin'?[...adminGroups.slice(0,3),...visibleOps,...adminGroups.slice(3)]:visibleOps;
  const allLinks=menu.flatMap(group=>group.links);
  const current=allLinks.find(([to])=>to==='/'?location.pathname==='/':location.pathname===to||location.pathname.startsWith(`${to}/`));
  const sections=location.pathname.split('/').filter(Boolean);
  const suffix=sections.length>2?(subLabels[sections.at(-1)!]||'Chi tiết'):null;
  useEffect(()=>{document.documentElement.classList.toggle('dark',theme==='dark');localStorage.setItem('theme',theme)},[theme]);
  useEffect(()=>{localStorage.setItem('finmate_sidebar',collapsed?'collapsed':'expanded')},[collapsed]);
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setSearchOpen(value=>!value)}if(event.key==='Escape'){setMobile(false);setSearchOpen(false)}};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[]);
  useEffect(()=>{if(searchOpen)searchRef.current?.focus()},[searchOpen]);
  useEffect(()=>{queueMicrotask(()=>{setMobile(false);setSearchOpen(false)})},[location.pathname]);
  useEffect(()=>{const media=window.matchMedia('(max-width:900px)');const changed=()=>setNarrow(media.matches);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed)},[]);
  useEffect(()=>{if(narrow&&!mobile)sidebarRef.current?.setAttribute('inert','');else sidebarRef.current?.removeAttribute('inert')},[narrow,mobile]);
  useEffect(()=>{if(!mobile)return;const previous=document.activeElement as HTMLElement;sidebarRef.current?.querySelector<HTMLElement>('button')?.focus();return()=>previous?.focus()},[mobile]);
  function go(to:string){const request=new CustomEvent('finmate-before-navigate',{cancelable:true,detail:to});if(!window.dispatchEvent(request)){setSearchOpen(false);setMobile(false);return}navigate(to);setMobile(false);setSearchOpen(false);setQuery('')}
  const results=allLinks.filter(([,label])=>label.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  return <div className={`shell ${collapsed?'shell--collapsed':''} ${mobile?'shell--mobile-open':''}`}>
    <a className="skip-link" href="#main-content">Đến nội dung chính</a>
    {mobile&&<button className="sidebar-backdrop" aria-label="Đóng điều hướng" onClick={()=>setMobile(false)}/>}
    <aside ref={sidebarRef} className="sidebar" aria-label="Điều hướng chính" aria-hidden={narrow&&!mobile} onKeyDown={event=>{if(!mobile||event.key!=='Tab')return;const items=Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')||[]).filter(item=>item.getClientRects().length);if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus()}else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus()}}}>
      <div className="brand"><span className="brand__icon"><Landmark size={20}/></span><div className="brand__wordmark"><strong>FinMate<span>Console</span></strong><small>Không gian làm việc nội bộ</small></div><button className="topbar__icon-btn mobile-close" aria-label="Đóng menu" onClick={()=>setMobile(false)}><X size={18}/></button></div>
      <div className="sidebar__inner"><nav className="nav">{menu.map(group=><div className="nav__group" key={group.title}><div className="nav__group-title">{group.title}</div>{group.links.map(([to,label,Icon])=><NavLink end={to==='/'} key={to} to={to} title={label} onClick={()=>setMobile(false)} className={({isActive})=>`nav__item ${isActive?'nav__item--active':''}`}><Icon size={18}/><span>{label}</span>{location.pathname===to&&<span className="nav__active-dot"/>}</NavLink>)}</div>)}</nav></div>
      <div className="sidebar__footer"><NavLink to="/profile" className="sidebar__user" onClick={()=>setMobile(false)}><div className="sidebar__avatar">{profile.displayName?.slice(0,2).toUpperCase()||'AD'}</div><div className="sidebar__user-info"><div className="sidebar__user-name">{profile.displayName}</div><div className="sidebar__user-role">{ROLE_LABEL[profile.role]||profile.role}</div></div></NavLink><button className="btn btn--ghost" title="Đăng xuất" onClick={()=>void onLogout()}><LogOut size={16}/><span>Đăng xuất</span></button></div>
    </aside>
    <main className="main"><header className="topbar"><div className="topbar__left"><button className="topbar__toggle desktop-toggle" aria-label={collapsed?'Mở rộng sidebar':'Thu gọn sidebar'} onClick={()=>setCollapsed(!collapsed)}><PanelLeftClose size={19}/></button><button className="topbar__toggle mobile-toggle" aria-label="Mở điều hướng" aria-expanded={mobile} onClick={()=>setMobile(true)}><Menu size={20}/></button><nav className="topbar__breadcrumb" aria-label="Đường dẫn"><button onClick={()=>go(inOps?ops[0].links[0]?.[0]||'/':'/')}>{inOps?'Vận hành':'Quản trị'}</button><ChevronRight size={13}/><span>{current?.[1]||'Hồ sơ'}</span>{suffix&&<><ChevronRight size={13}/><strong>{suffix}</strong></>}</nav></div><div className="topbar__right"><button className="command-trigger" onClick={()=>setSearchOpen(true)}><Search size={16}/><span>Tìm trang…</span><kbd>Ctrl K</kbd></button><button className="topbar__icon-btn" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Đổi chủ đề">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><button className="topbar-avatar" title="Hồ sơ" onClick={()=>go('/profile')}>{profile.displayName?.slice(0,2).toUpperCase()}</button></div></header><div className="content" id="main-content" tabIndex={-1}><Outlet/></div></main>
    {searchOpen&&<DialogOverlay onClose={()=>setSearchOpen(false)}><div className="command-dialog" role="dialog" aria-modal="true" aria-label="Tìm trang" onClick={event=>event.stopPropagation()}><div className="command-input"><Search size={20}/><input ref={searchRef} aria-label="Tên trang" placeholder="Bạn muốn mở trang nào?" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&results[0])go(results[0][0])}}/><button className="btn btn--small" onClick={()=>setSearchOpen(false)}>Esc</button></div><div className="command-results">{results.map(([to,label,Icon])=><button key={to} onClick={()=>go(to)}><Icon size={18}/><span>{label}<small>{to.startsWith('/ops')?'Vận hành':'Quản trị'}</small></span><ArrowRight size={16}/></button>)}{!results.length&&<p className="fm-empty">Không tìm thấy trang phù hợp</p>}</div></div></DialogOverlay>}
  </div>;
}
