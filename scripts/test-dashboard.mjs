import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendarRange, vietnamDay } from '../src/shared/dateRange.ts';
import { unpackPage, lastOffset, nonNegativeInt, updateUrlValue } from '../src/shared/listState.ts';
import { validateFields } from '../src/shared/formValidation.ts';
import { hasAny, homeFor } from '../src/shared/permissions.ts';
import { assertDemoVersion, filterDemo, summarizeKpis } from '../src/shared/developmentData.ts';
import { configSchema, emptyConfigValue, validateConfigValue } from '../src/shared/configEditor.ts';
import { auditEventLabel, percentToBasisPoints } from '../src/shared/presentation.ts';

test('Percentage inputs retain basis-point precision across positive, zero and negative rates',()=>{
  for(const [percent,expected] of [[6.5,650],[0.29,29],[-2.75,-275],[0,0],[-100,-10000],[1000,100000]])assert.equal(percentToBasisPoints(percent),expected);
});

test('Audit summaries explain known actions and do not invent meanings for new event codes',()=>{
  assert.equal(auditEventLabel('Auth.Login.Success'),'Đăng nhập thành công');
  assert.equal(auditEventLabel('Admin.Assumption.Approved'),'Giả định kinh tế: Đã duyệt');
  assert.equal(auditEventLabel('Unknown.SomeNewAction'),'Hoạt động hệ thống');
});

test('Vietnam today changes at 17:00 UTC, independent of host timezone',()=>{
  assert.equal(vietnamDay(new Date('2026-11-17T16:59:59Z')),'2026-11-17');
  assert.equal(vietnamDay(new Date('2026-11-17T17:00:00Z')),'2026-11-18');
});
test('Today uses the full Vietnam calendar day rather than a rolling 24-hour window',()=>{
  assert.deepEqual(calendarRange('1','','',new Date('2026-11-18T12:00:00Z')),{from:'2026-11-18T00:00:00+07:00',to:'2026-11-18T23:59:59.999+07:00',error:''});
  assert.equal(calendarRange('7','','',new Date('2026-11-18T12:00:00Z')).from,'2026-11-12T00:00:00+07:00');
});
test('Custom range rejects missing, inverted and impossible dates',()=>{
  for(const [from,to] of [['','2026-11-18'],['2026-11-19','2026-11-18'],['2026-02-30','2026-03-01']])assert.ok(calendarRange('custom',from,to).error);
  assert.equal(calendarRange('custom','2024-02-29','2024-02-29').error,'');
});
test('Both real pagination envelope shapes retain server totals',()=>{
  assert.deepEqual(unpackPage([{id:1}],41),{rows:[{id:1}],total:41});
  assert.deepEqual(unpackPage({items:[{id:2}],total:52}),{rows:[{id:2}],total:52});
});
test('Invalid URL offsets are bounded; a removed last page returns to an existing page',()=>{
  for(const input of ['-1','1.5','Infinity','bad','999999999999999999999'])assert.equal(nonNegativeInt(input),0);
  assert.equal(lastOffset(41,20),40);assert.equal(lastOffset(40,20),20);assert.equal(lastOffset(0,20),0);
});
test('KPI totals add flows but take the final snapshot for stock counts',()=>{
  const result=summarizeKpis([{date:'2026-11-17',newUsers:2,totalUsers:102,transactions:4,confirmed:3,amount:10},{date:'2026-11-18',newUsers:3,totalUsers:105,transactions:5,confirmed:4,amount:20}],'2026-11-17','2026-11-18');
  assert.equal(result.newUsers,5);assert.equal(result.totalUsers,105);assert.equal(result.transactions,9);assert.equal(result.confirmed,7);assert.equal(result.amount,30);
});
test('KPI zero and absent data remain distinguishable',()=>{
  const none=summarizeKpis([],'2026-11-17','2026-11-18');assert.equal(none.hasData,false);assert.equal(none.totalUsers,null);
  const zero=summarizeKpis([{date:'2026-11-18',newUsers:0,totalUsers:0,transactions:0,confirmed:0,amount:0}],'2026-11-18','2026-11-18');assert.equal(zero.hasData,true);assert.equal(zero.totalUsers,0);
});
test('Demo filtering, pagination and explicit failure scenarios do not fabricate successful results',()=>{
  const rows=[{id:'1',merchant:'Quán A',status:'pending'},{id:'2',merchant:'Quán B',status:'pending'},{id:'3',merchant:'Shop C',status:'reviewed'}];
  const page=filterDemo(rows,{search:'quán',status:'pending',offset:1,limit:1});assert.equal(page.total,2);assert.deepEqual(page.items.map(r=>r.id),['2']);
  assert.equal(filterDemo(rows,{offset:0,limit:10,scenario:'empty'}).total,0);
  assert.throws(()=>filterDemo(rows,{offset:0,limit:10,scenario:'error'}));
});
test('Demo conflicts reject stale writes rather than updating the fixture',()=>{
  assert.throws(()=>assertDemoVersion('normal',1,2),/409/);assert.throws(()=>assertDemoVersion('conflict',1,1),/409/);assert.doesNotThrow(()=>assertDemoVersion('normal',2,2));
});
test('Forms reject whitespace-only required values and check numeric bounds and patterns',()=>{
  const rules=[{key:'name',label:'Tên',required:true},{key:'rate',label:'Tỷ lệ',type:'number',required:true,min:1,max:100},{key:'code',label:'Mã',pattern:'[a-z0-9_]+'}];
  assert.deepEqual(Object.keys(validateFields(rules,{name:'  ',rate:101,code:'a-b'})),['name','rate','code']);
  assert.deepEqual(validateFields(rules,{name:'Hợp lệ',rate:1,code:'a_b'}),{});
});
test('Effective capabilities control any-of gates and revoked-all accounts have a safe home',()=>{
  assert.equal(hasAny(['DecideApprovals'],['ProposeApprovals','DecideApprovals']),true);assert.equal(hasAny([],'ViewDashboard'),false);
  assert.equal(homeFor('Staff',[]),'/profile');assert.equal(homeFor('Staff',['HandleTickets']),'/ops/tickets');
});
test('Configuration schema covers all 24 groups and ten feature flags',()=>{
  assert.equal(Object.keys(configSchema.SystemConfigDocument).length,24);assert.equal(Object.keys(configSchema.FeatureSettings).length,10);
  assert.ok(validateConfigValue({notificationPipeline:{businessDuplicateWindowMinutes:0}}));
  assert.equal(validateConfigValue({notificationPipeline:{businessDuplicateWindowMinutes:10}}),'');
  assert.deepEqual(emptyConfigValue('AssistantSuggestion'),{key:'',text:'',when:'always'});
});

test('URL pagination writes its own key while filters reset pagination and preserve source mode',()=>{const initial=new URLSearchParams('source=demo&status=failed&offset=0');assert.equal(updateUrlValue(initial,'offset','10','0').get('offset'),'10');const filtered=updateUrlValue(new URLSearchParams('source=demo&offset=10&cursor=abc'),'status','pending');assert.equal(filtered.get('source'),'demo');assert.equal(filtered.get('status'),'pending');assert.equal(filtered.has('offset'),false);assert.equal(filtered.has('cursor'),false);});
