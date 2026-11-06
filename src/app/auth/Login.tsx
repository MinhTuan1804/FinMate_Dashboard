import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Landmark, ShieldCheck } from 'lucide-react';
import { api, clearSession, errorText, getData, INTERNAL_ROLES, needsOtp, saveSession, sendOtp, verifyOtp, type Envelope, type Profile, type Session } from '../../shared/api';
/** Bước 1: email + mật khẩu. Bước 2 (nếu backend yêu cầu 2FA): mã OTP gửi qua email. `pending` = phiên đã có token nhưng chưa xác thực OTP (tải lại trang). */
export function Login({onLogin,pending,onCancel}:{onLogin:(profile:Profile)=>void;pending:Profile|null;onCancel:()=>void}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[code,setCode]=useState(''),[me,setMe]=useState<Profile|null>(pending),[cooldown,setCooldown]=useState(0),[sent,setSent]=useState(false);
  const navigate=useNavigate();
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
      if (!session?.accessToken || !session?.refreshToken) throw new Error('API không trả phiên đăng nhập hợp lệ');
      saveSession(session);
      const profile=await getData<Profile>('/users/me');
      if (!INTERNAL_ROLES.includes(profile.role)) throw new Error('Bạn không có quyền truy cập trang quản trị');
      if (await needsOtp()) {setMe(profile);await sendCode();return}
      onLogin(profile);navigate('/',{replace:true});
    } catch(e){clearSession();setError(errorText(e))}finally{setBusy(false)}
  }
  async function verify(event:FormEvent) {
    event.preventDefault();if(!me)return;setBusy(true);setError('');
    try{await verifyOtp(code.trim());onLogin(me);navigate('/',{replace:true})}catch(e){setError(errorText(e))}finally{setBusy(false)}
  }
  function cancel(){clearSession();setMe(null);setCode('');setSent(false);setError('');onCancel()}
  if (me) return <div className="login-screen"><form className="login-card" onSubmit={verify}>
    <div className="fin-logo"><Landmark size={24}/></div><h1>Xác thực hai lớp</h1><p>{sent?`Mã 6 số đã gửi tới ${me.email}.`:`Gửi mã xác thực tới ${me.email} để tiếp tục.`}</p>
    <label>Mã OTP<input className="input otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} required disabled={!sent}/></label>
    {error&&<div className="error-box" role="alert">{error}</div>}
    <button className="btn btn--primary" disabled={busy||code.length<6||!sent}>{busy?'Đang xác thực...':'Xác nhận'}</button>
    <button type="button" className="btn" disabled={busy||cooldown>0} onClick={()=>void sendCode()}>{cooldown>0?`Gửi lại sau ${cooldown}s`:sent?'Gửi lại mã':'Gửi mã'}</button>
    <button type="button" className="btn btn--ghost" onClick={cancel}>Dùng tài khoản khác</button>
  <div className="login-security"><ShieldCheck size={14}/> Chỉ dành cho đội ngũ FinMate</div></form></div>;
  return <div className="login-screen"><form className="login-card" onSubmit={submit}>
    <div className="fin-logo"><Landmark size={24}/></div><h1>FinMate Admin</h1><p>Quản trị hệ thống tài chính thông minh</p>
    {expired&&<div className="error-box">Phiên đăng nhập đã hết hạn</div>}
    <label>Email<input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username" /></label>
    <label>Mật khẩu<div className="password-field"><input className="input" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/><button type="button" aria-label={show?'Ẩn mật khẩu':'Hiện mật khẩu'} aria-pressed={show} onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
    {error&&<div className="error-box" role="alert">{error}</div>}<button className="btn btn--primary" disabled={busy}>{busy?'Đang đăng nhập...':'Đăng nhập'}</button>
  <div className="login-security"><ShieldCheck size={14}/> Chỉ dành cho đội ngũ FinMate</div></form></div>;
}


