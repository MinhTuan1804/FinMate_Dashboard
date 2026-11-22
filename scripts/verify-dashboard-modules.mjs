import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin=process.env.FINMATE_BACKEND_URL||'http://127.0.0.1:8081';
assert.equal(origin,'http://127.0.0.1:8081','This regression runner only targets the isolated QA backend.');
const password=process.env.FINMATE_ADMIN_PASSWORD;
assert.ok(password,'Set FINMATE_ADMIN_PASSWORD to the synthetic QA account password.');
const out=resolve(process.env.FINMATE_TEST_OUTPUT||'../outputs/finmate-dashboard-completion-2026-11-18');
await mkdir(out,{recursive:true});
const results=[],limits=[],sessions=[];
async function request(path,{session,method='GET',body,expected=200}={}){
  let response;
  for(let attempt=0;attempt<3;attempt++){
    response=await fetch(origin+'/api/v1'+path,{method,headers:{'content-type':'application/json',...(session?{authorization:`Bearer ${session.accessToken}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    if(response.status!==429)break;
    await new Promise(r=>setTimeout(r,Math.min(60000,Math.max(1000,Number(response.headers.get('retry-after')||60)*1000))));
  }
  const raw=await response.text();
  const data=raw?JSON.parse(raw):null;
  const expectedStatuses=Array.isArray(expected)?expected:[expected];
  assert.ok(expectedStatuses.includes(response.status),`${method} ${path}: expected ${expectedStatuses}, got ${response.status} ${data?.error?.message||''}`);
  results.push({method,path,status:response.status,passed:true});
  return {status:response.status,data:data?.data,envelope:data};
}
async function login(email){const response=await request('/auth/login',{method:'POST',body:{email,password}});assert.ok(response.data?.accessToken);sessions.push(response.data);return response.data;}
const readPaths=['/admin/knowledge/documents','/admin/knowledge/candidates','/admin/assumptions','/ops/forecast/accuracy?windowDays=30','/ops/forecast/feedback','/admin/market-sources','/admin/market-documents','/admin/market-events','/admin/fuel-prices','/admin/monitoring/provider-formats','/admin/monitoring/error-events','/ops/community/reports','/ops/community/images','/ops/legal/draft','/ops/legal/versions','/ops/subscriptions/features','/ops/subscriptions/plans','/ops/subscriptions/orders'];
try{
  const admin=await login('qa-admin@finmate.local');
  const otp=await request('/ops/auth/status',{session:admin});assert.equal(otp.data.required,false,'QA must already be configured for synthetic no-OTP testing.');
  for(const path of readPaths){const r=await request(path,{session:admin});assert.ok(r.data!==undefined,`${path} must have data`);}
  const config=(await request('/admin/system-config',{session:admin})).data;
  assert.equal(Object.keys(config.content).length,24);assert.equal(Object.keys(config.content.features).length,10);
  await writeFile(resolve(out,'qa-config-before.json'),JSON.stringify(config,null,2));
  const staff=await login('qa-staff@finmate.local');
  for(const path of ['/admin/knowledge/documents','/admin/assumptions','/ops/forecast/feedback','/ops/community/reports','/ops/community/images'])await request(path,{session:staff});
  for(const path of ['/ops/forecast/accuracy','/ops/subscriptions/plans','/ops/legal/draft','/admin/market-sources','/admin/monitoring/error-events'])await request(path,{session:staff,expected:403});
  const manager=await login('qa-manager@finmate.local');
  for(const path of ['/admin/knowledge/documents','/admin/assumptions','/ops/forecast/accuracy','/ops/community/reports','/ops/legal/draft','/ops/subscriptions/plans'])await request(path,{session:manager});
  await request('/admin/market-sources',{session:manager,expected:403});
  const user=await login('qa-demo@finmate.local');
  for(const path of ['/admin/knowledge/documents','/ops/forecast/feedback','/ops/community/reports','/ops/legal/draft','/ops/subscriptions/plans'])await request(path,{session:user,expected:403});
  if(process.env.FINMATE_QA_MUTATIONS==='1'){
    const stamp=Date.now().toString(36);
    const assumption=(await request('/admin/assumptions',{session:staff,method:'POST',expected:201,body:{key:`qa_fe_${stamp}`,rateBps:650,unit:'year',sourceName:'Synthetic QA source',sourceUrl:'https://example.org/qa',asOf:'2026-11-18T00:00:00+07:00'}})).data;
    await request(`/admin/assumptions/${assumption.id}/approve`,{session:staff,method:'POST',expected:403});
    const approved=(await request(`/admin/assumptions/${assumption.id}/approve`,{session:manager,method:'POST'})).data;assert.equal(approved.status,'approved');
    await request(`/admin/assumptions/${assumption.id}/approve`,{session:manager,method:'POST',expected:409});
    const retired=(await request(`/admin/assumptions/${assumption.id}/retire`,{session:manager,method:'POST'})).data;assert.equal(retired.status,'retired');
    const plan=(await request('/ops/subscriptions/plans',{session:manager,method:'POST',expected:201,body:{code:`qa_fe_${stamp}`,name:'QA FE browser plan',description:'Synthetic QA only',monthlyPriceCents:10000,yearlyPriceCents:null,sortOrder:90}})).data;
    await request(`/ops/subscriptions/plans/${plan.id}`,{session:manager,method:'PATCH',body:{name:'QA FE browser plan updated',monthlyPriceCents:12000,yearlyPriceCents:120000}});
    const catalog=(await request('/ops/subscriptions/features',{session:manager})).data;
    const updated=(await request(`/ops/subscriptions/plans/${plan.id}/features`,{session:manager,method:'PUT',body:catalog.map((f,i)=>({key:f.key,enabled:i===0,monthlyLimit:i===0?10:null}))})).data;
    assert.equal(updated.features.filter(f=>f.enabled).length,1);
    await request(`/ops/subscriptions/plans/${plan.id}`,{session:manager,method:'DELETE',expected:204});
    const plans=(await request('/ops/subscriptions/plans',{session:manager})).data;assert.equal(plans.find(p=>p.id===plan.id).isActive,false);
    const legal=(await request('/ops/legal/draft',{session:manager})).data;
    await writeFile(resolve(out,'qa-legal-before.json'),JSON.stringify(legal,null,2));
    const content={termsSections:legal.termsSections.map((s,i)=>i===0?{...s,title:'Synthetic QA terms draft'}:s),privacySections:legal.privacySections,baseUpdatedAt:legal.updatedAt};
    const saved=(await request('/ops/legal/draft',{session:manager,method:'PUT',body:content})).data;
    await request('/ops/legal/draft',{session:manager,method:'PUT',body:content,expected:409});
    await request('/ops/legal/draft',{session:manager,method:'PUT',body:{termsSections:legal.termsSections,privacySections:legal.privacySections,baseUpdatedAt:saved.updatedAt}});
    const knowledge=await request('/admin/knowledge/documents',{session:staff,method:'POST',expected:[201,503],body:{title:'Synthetic QA knowledge',source_name:'Synthetic QA source',source_url:'https://example.org/qa',as_of:'2026-11-18T00:00:00+07:00',effective_from:'2026-11-18T00:00:00+07:00',effective_to:null,text:'This document is synthetic test data for the dashboard. It is not financial advice.'}});
    if(knowledge.status===503)limits.push('Knowledge creation returned 503 because the QA embedding provider is unavailable. UI error handling and seeded read/review flows require separate verification.');
    else {await request(`/admin/knowledge/documents/${knowledge.data.id}`,{session:manager});await request(`/admin/knowledge/documents/${knowledge.data.id}/approve`,{session:manager,method:'POST'});await request(`/admin/knowledge/documents/${knowledge.data.id}/retire`,{session:manager,method:'POST'});}
  }
  await writeFile(resolve(out,'module-api-results.json'),JSON.stringify({origin,passed:results.length,results,limits},null,2));
  console.log(`Passed ${results.length} API checks; ${limits.length} integration limitations. Results: ${resolve(out,'module-api-results.json')}`);
}catch(error){await writeFile(resolve(out,'module-api-results.json'),JSON.stringify({origin,passed:results.length,results,limits,error:error.message},null,2));throw error;}
finally{for(const session of sessions)await fetch(origin+'/api/v1/auth/logout',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${session.accessToken}`},body:JSON.stringify({refreshToken:session.refreshToken})}).catch(()=>{});}
