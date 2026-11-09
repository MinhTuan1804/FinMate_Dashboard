import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const email=process.env.FINMATE_ADMIN_EMAIL,password=process.env.FINMATE_ADMIN_PASSWORD;
if(!email||!password)throw new Error('Cần FINMATE_ADMIN_EMAIL và FINMATE_ADMIN_PASSWORD');
const origin=process.env.FINMATE_FRONTEND_URL||'http://localhost:5173';
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile=path.resolve('.chrome-qa');
const port=await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();server.close(()=>resolve(address.port))})});
const child=spawn(chrome,['--headless=new','--incognito','--disable-gpu','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore',windowsHide:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try{
  let tabs;
  for(let attempt=0;attempt<100;attempt++){
    try{tabs=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();break}catch{await sleep(100)}
  }
  assert.ok(tabs,'Chrome không mở DevTools');
  const page=tabs.find(tab=>tab.type==='page');assert.ok(page,'Chrome không có tab');
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
  let id=0;const pending=new Map();let roleFixture=null,ticketFixture=null;
  socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Fetch.requestPaused'){const request=message.params;const data=request.request.url.includes('/tickets/ui-preview')?ticketFixture:request.request.url.includes('/ops/me')?roleFixture:{id:'ui-role-fixture',email:'ui@example.test',displayName:'UI role fixture',role:roleFixture.role};void send('Fetch.fulfillRequest',{requestId:request.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({success:true,data})).toString('base64')});return}if(!message.id)return;const task=pending.get(message.id);if(!task)return;pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result)};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}))});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value};
  const navigate=async route=>evaluate(`(()=>{history.pushState({},'',${JSON.stringify(route)});window.dispatchEvent(new PopStateEvent('popstate'))})()`);
  const waitFor=async(expression,timeout=15000)=>{const until=Date.now()+timeout;while(Date.now()<until){if(await evaluate(expression))return;await sleep(150)}const state=await evaluate("({path:location.pathname,error:document.querySelector('.error-box')?.textContent?.trim()||'',title:document.querySelector('h1')?.textContent||''})");throw new Error(`Không đạt điều kiện: ${expression}; trạng thái=${JSON.stringify(state)}`)};
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`${origin}/login`});
  await waitFor("document.querySelector('input[type=email]')!==null");
  const fill=`(()=>{const fields=[['email',${JSON.stringify(email)}],['password',${JSON.stringify(password)}]];for(const [type,value] of fields){const input=document.querySelector('input[type='+type+']');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('form').requestSubmit();return true})()`;
  await evaluate(fill);
  await waitFor("document.querySelector('h1')?.textContent==='Dashboard'||document.querySelector('h1')?.textContent==='Xác thực hai lớp'",20000);
  if(await evaluate("document.querySelector('h1')?.textContent==='Xác thực hai lớp'")){
    assert.ok(process.env.FINMATE_ADMIN_OTP,'Backend yêu cầu OTP. Cần FINMATE_ADMIN_OTP hợp lệ để tiếp tục; không tắt 2FA khi kiểm tra.');
    await evaluate(`(()=>{const input=document.querySelector('input[autocomplete=one-time-code]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(process.env.FINMATE_ADMIN_OTP)});input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('form').requestSubmit()})()`);
  }
  await waitFor("location.pathname==='/' && document.querySelector('h1')?.textContent==='Dashboard'",20000);
  await evaluate("sessionStorage.setItem('finmate_token','expired-test-token')");
  await send('Page.navigate',{url:`${origin}/users`});
  await waitFor("location.pathname==='/users' && sessionStorage.getItem('finmate_token')!=='expired-test-token' && document.querySelector('h1')?.textContent==='Người dùng'",20000);
  assert.equal(await evaluate("document.querySelector('.workspace-switch')!==null"),false,'Sidebar không dùng bộ chuyển không gian');
  assert.ok(await evaluate("document.querySelector('.nav a[href=\"/users\"]')!==null && document.querySelector('.nav a[href=\"/ops/tickets\"]')!==null"),'Admin phải thấy cả hai nhóm trong cùng sidebar');
  const routes=['/users','/roles','/audit-logs','/data-deletion','/categories','/providers','/finance-methods','/goal-templates','/survey','/settings/system','/settings/ai/dictionary','/settings/ai/rules','/settings/ai/knowledge','/sync','/ai-learning','/profile'];
  for(const route of routes){
    await navigate(route);
    await waitFor(`location.pathname===${JSON.stringify(route)} && document.querySelector('h1')!==null`,20000);
    await sleep(350);
    const error=await evaluate("document.querySelector('.error-box')?.textContent?.trim()||''");
    assert.equal(error,'',`${route} hiển thị lỗi: ${error}`);
  }
  const opsCaps=await evaluate("fetch('/api/v1/ops/me',{headers:{Authorization:'Bearer '+sessionStorage.getItem('finmate_token')}}).then(r=>r.json()).then(r=>r.data?.capabilities||[])");
  const opsRoutes=[['/ops/dashboard','ViewDashboard'],['/ops/tickets','HandleTickets'],['/ops/approvals','ProposeApprovals'],['/ops/canned-replies','ManageCannedReplies'],['/ops/monitoring','ViewMonitoring'],['/ops/audit','ViewOpsAudit'],['/ops/ai-stats','ViewAiStats']].filter(([,cap])=>opsCaps.includes(cap));
  for(const [route] of opsRoutes){await navigate(route);await waitFor(`location.pathname===${JSON.stringify(route)}&&document.querySelector('h1')!==null`,20000);await sleep(400);assert.equal(await evaluate("document.querySelector('.error-box')?.textContent?.trim()||''"),'',`${route} hiển thị lỗi`)}
  await navigate('/users');
  await waitFor("Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Chi tiết')");
  await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Chi tiết').click()");
  await waitFor("document.querySelector('[role=dialog]')!==null");
  assert.ok(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"),'Focus phải ở trong drawer');
  await navigate('/categories');
  await waitFor("Array.from(document.querySelectorAll('button')).some(button=>button.textContent?.includes('Thêm mới'))");
  await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent?.includes('Thêm mới')).click()");
  await waitFor("document.querySelector('[role=dialog]')!==null");
  await evaluate("(()=>{const input=document.querySelector('[role=dialog] input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'UI draft');input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-dialog-close]').click()})()");
  await waitFor("document.querySelector('[role=alertdialog]')!==null");
  await evaluate("Array.from(document.querySelectorAll('[role=alertdialog] button')).find(button=>button.textContent==='Bỏ thay đổi').click()");
  await waitFor("document.querySelector('[role=dialog]')===null");
  await navigate('/finance-methods');
  await waitFor("document.querySelector('tbody button')!==null");
  await evaluate("document.querySelector('tbody button').click()");
  await waitFor("document.querySelector('[role=dialog] select')!==null");
  assert.ok(await evaluate("Array.from(document.querySelectorAll('[role=dialog] select')).every(select=>select.value!=='')"),'Enum của phương pháp phải giữ đúng giá trị khi mở form');
  await evaluate("Array.from(document.querySelectorAll('[role=dialog] button')).find(button=>button.textContent==='Tham số').click()");
  await waitFor("document.querySelector('.catalog-field')!==null");
  if(process.env.FINMATE_UI_REVIEW==='1'){await mkdir('.ui-review',{recursive:true});await sleep(300);const image=await send('Page.captureScreenshot',{format:'png'});await writeFile('.ui-review/finance-editor.png',Buffer.from(image.data,'base64'))}
  await evaluate("document.querySelector('[role=dialog] [data-dialog-close]').click()");
  await waitFor("document.querySelector('[role=dialog]')===null");
  await navigate('/settings?tab=ai');
  await waitFor("location.pathname==='/settings/ai/dictionary' && document.body.textContent.includes('Từ điển và từ vựng')");
  await sleep(500);
  assert.equal(await evaluate("document.querySelector('.error-box')?.textContent?.trim()||''"),'','Tab AI hiển thị lỗi');
  // Menu rendering fixtures only: backend authorization is not mocked or claimed as tested here.
  if(process.env.FINMATE_UI_REVIEW==='1'){
    console.log('Đã kiểm tra route và form; chờ cửa sổ rate limit trước lượt chụp giao diện.');
    await sleep(60000);
    await mkdir('.ui-review',{recursive:true});
    for(const [name,url,width,dark] of [['users-desktop','/users',1440,false],['ai-desktop','/settings/ai/dictionary',1440,false],['finance-desktop','/finance-methods',1280,false],['system-wide','/settings/system?section=limits',1920,false],['users-dark','/users',1440,true],['users-tablet','/users',768,false]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate(`document.documentElement.classList.toggle('dark',${dark});localStorage.setItem('theme',${JSON.stringify(dark?'dark':'light')})`);await navigate(url);await waitFor("document.querySelector('h1')!==null");await sleep(700);
      assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),`${name} tràn ngang trang`);
      if(width<900){await evaluate("document.querySelector('[aria-label=\"Mở điều hướng\"]').click()");await waitFor("document.querySelector('.shell--mobile-open')!==null && document.querySelector('.sidebar').getBoundingClientRect().left>=-1");await sleep(220)}
      const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join('.ui-review',name+'.png'),Buffer.from(shot.data,'base64'));
    }
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await navigate('/profile');await waitFor("document.querySelector('h1')!==null");
    const me=await evaluate("fetch('/api/v1/users/me',{headers:{Authorization:'Bearer '+sessionStorage.getItem('finmate_token')}}).then(r=>r.json()).then(r=>r.data)");
    const now=new Date().toISOString();
    ticketFixture={ticket:{id:'ui-preview',requesterUserId:'ui-customer',requesterName:'Khách thử giao diện',assigneeUserId:me.id,assigneeName:'Nhân viên hỗ trợ',parentTicketId:null,category:'Transaction',priority:'P2',status:'InProgress',subject:'Cần kiểm tra giao dịch từ thông báo ngân hàng',firstResponseDueAt:now,resolveDueAt:new Date(Date.now()+3600000).toISOString(),firstRespondedAt:now,firstResponseOverdue:false,resolutionOverdue:false,rating:null,createdAt:now,updatedAt:now,resolvedAt:null,closedAt:null},messages:[{id:'m1',kind:'Customer',authorUserId:'ui-customer',authorName:'Khách thử giao diện',body:'Mình nhận thông báo ngân hàng nhưng chưa thấy giao dịch trong app. Nhờ đội hỗ trợ kiểm tra giúp.',createdAt:now,attachments:[]},{id:'m2',kind:'Staff',authorUserId:me.id,authorName:'Nhân viên hỗ trợ',body:'Mình đã nhận ca. Bạn cho biết thời điểm nhận thông báo để mình kiểm tra hướng xử lý nhé.',createdAt:now,attachments:[]},{id:'m3',kind:'InternalNote',authorUserId:me.id,authorName:'Nhân viên hỗ trợ',body:'Ghi chú thử giao diện, không phải dữ liệu khách thực.',createdAt:now,attachments:[]}]};
    await send('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/ops/tickets/ui-preview'}]});await navigate('/ops/tickets/ui-preview');await waitFor("document.querySelector('.fm-thread')!==null");
    await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Ghi chú nội bộ').click()");assert.ok(await evaluate("document.body.textContent.includes('Chỉ đội vận hành đọc được')"),'Chế độ ghi chú phải có nhãn riêng');
    await sleep(200);const ticketShot=await send('Page.captureScreenshot',{format:'png'});await writeFile('.ui-review/ticket-fixture.png',Buffer.from(ticketShot.data,'base64'));await send('Fetch.disable');
  }
  for(const [role,capabilities,home] of [['Staff',['HandleTickets','ProposeApprovals'],'/ops/tickets'],['OpsManager',['HandleTickets','ViewDashboard','ViewMonitoring','ManageTickets'],'/ops/dashboard']]){
    roleFixture={id:'ui-role-fixture',displayName:'UI role fixture',role,capabilities};
    await send('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/users/me'},{urlPattern:'*/api/v1/ops/me'}]});
    await send('Page.navigate',{url:origin+'/'});await waitFor(`location.pathname===${JSON.stringify(home)}&&document.querySelector('h1')!==null`);
    assert.equal(await evaluate("document.querySelector('.nav a[href=\"/users\"]')!==null"),false,`${role} thấy menu quản trị`);
    assert.equal(await evaluate("document.querySelector('.workspace-switch')!==null"),false,`${role} thấy bộ chuyển quản trị`);
    await send('Fetch.disable');
  }
  await send('Page.navigate',{url:origin+'/profile'});await waitFor("document.querySelector('h1')?.textContent==='Hồ sơ admin'");
  await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent?.includes('Đăng xuất')).click()");
  await waitFor("location.pathname==='/login' && sessionStorage.getItem('finmate_token')===null");
  console.log(`Đạt: đăng nhập, refresh token, ${routes.length} trang quản trị, ${opsRoutes.length} trang vận hành, focus/dirty form, 2 fixture menu vai trò, tab AI và đăng xuất`);
}finally{socket?.close();child.kill()}
