import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import emailIcon from '../../assets/figma/login-email.svg';
import lockIcon from '../../assets/figma/login-lock.svg';
import { api, clearSession, errorText, getData, INTERNAL_ROLES, logout, needsOtp, saveSession, sendOtp, verifyOtp, type Envelope, type Profile, type Session } from '../../shared/api';
/** Bước 1: email + mật khẩu. Bước 2 (nếu backend yêu cầu 2FA): mã OTP gửi qua email. `pending` = phiên đã có token nhưng chưa xác thực OTP (tải lại trang). */
export function Login({onLogin,pending,onCancel}:{onLogin:(profile:Profile)=>void;pending:Profile|null;onCancel:()=>void}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[code,setCode]=useState(''),[me,setMe]=useState<Profile|null>(pending),[cooldown,setCooldown]=useState(0),[sent,setSent]=useState(false);
  const expired=sessionStorage.getItem('finmate_expired')==='1';
  useEffect(()=>{if(cooldown<=0)return;const t=setTimeout(()=>setCooldown(cooldown-1),1000);return()=>clearTimeout(t)},[cooldown]);
  async function sendCode() {
    setBusy(true);setError('');
    try{await sendOtp();setSent(true);setCooldown(60)}catch(e){setError(errorText(e))}finally{setBusy(false)}
  }
  async function submit(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');sessionStorage.removeItem('finmate_expired');clearSession();
    try {
      const result=await api.post<Envelope<Session>>('/auth/login',{email,password});
      const session=result.data.data;
      if (!session?.accessToken || !session?.refreshToken) throw new Error('Chưa xác nhận được phiên đăng nhập. Vui lòng thử lại.');
      saveSession(session);
      const profile=await getData<Profile>('/users/me');
      if (!INTERNAL_ROLES.includes(profile.role)) {await logout().catch(()=>{});throw new Error('Bạn không có quyền truy cập trang quản trị');}
      if (await needsOtp()) {setMe(profile);await sendCode();return}
      onLogin(profile);
    } catch(e){clearSession();setError(errorText(e))}finally{setBusy(false)}
  }
  async function verify(event:FormEvent) {
    event.preventDefault();if(!me)return;setBusy(true);setError('');
    try{await verifyOtp(code.trim());onLogin(me)}catch(e){setError(errorText(e))}finally{setBusy(false)}
  }
  function cancel(){clearSession();setMe(null);setCode('');setSent(false);setError('');onCancel()}
  const brand=<div className="auth-brand"><div><strong>FinMate</strong><span>Không gian quản trị</span></div></div>;
  const security=<div className="login-security"><ShieldCheck size={16} aria-hidden="true"/> Chỉ dành cho đội ngũ FinMate</div>;
  if (me) return <div className="login-screen"><div className="auth-shell">{brand}<header className="auth-heading"><span className="fm-eyebrow"><span aria-hidden="true"/>Bảo vệ tài khoản</span><h1>Xác thực hai lớp</h1><p>{sent?`Mã 6 số đã gửi tới ${me.email}.`:`Gửi mã xác thực tới ${me.email} để tiếp tục.`}</p></header><form className="login-card" onSubmit={verify}>
    <label>Mã OTP<input className="input otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} required disabled={!sent}/></label>
    {error&&<div className="error-box" role="alert">{error}</div>}
    <button className="btn btn--primary" disabled={busy||code.length<6||!sent}>{busy?'Đang xác thực...':'Xác nhận'}<ArrowRight size={18} aria-hidden="true"/></button>
    <button type="button" className="btn" disabled={busy||cooldown>0} onClick={()=>void sendCode()}>{cooldown>0?`Gửi lại sau ${cooldown}s`:sent?'Gửi lại mã':'Gửi mã'}</button>
    <button type="button" className="btn btn--ghost" onClick={cancel}>Dùng tài khoản khác</button>
  </form>{security}</div></div>;
  return <div className="login-screen"><div className="auth-shell">{brand}<header className="auth-heading"><h1>Chào mừng trở lại</h1><p>Đăng nhập để quản trị và vận hành FinMate.</p></header><form className="login-card" onSubmit={submit}>
    {expired&&<div className="error-box" role="alert">Phiên đăng nhập đã hết hạn</div>}
    <label htmlFor="login-email">Email</label><div className="auth-input"><img src={emailIcon} width="26.25" height="12.9166" alt=""/><input id="login-email" className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username" placeholder="Email nội bộ của bạn"/></div>
    <label htmlFor="login-password">Mật khẩu</label><div className="password-field auth-input"><img src={lockIcon} width="22.9166" height="16.875" alt=""/><input id="login-password" className="input" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" placeholder="Nhập mật khẩu"/><button type="button" aria-label={show?'Ẩn mật khẩu':'Hiện mật khẩu'} aria-pressed={show} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
    {error&&<div className="error-box" role="alert">{error}</div>}<button className="btn btn--primary" disabled={busy}>{busy?'Đang đăng nhập...':'Đăng nhập'}<ArrowRight size={18} aria-hidden="true"/></button>
  </form>{security}</div></div>;
}
