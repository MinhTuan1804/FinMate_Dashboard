export type DemoRow={id:string;[key:string]:unknown};
export type DemoPage<T>={items:T[];total:number;offset:number;limit:number;asOf:string};
export type DemoQuery={search?:string;status?:string;offset:number;limit:number;scenario?:string};
export const DEMO_AS_OF='2026-11-18T10:00:00+07:00';
export function filterDemo<T extends DemoRow>(rows:T[],query:DemoQuery):DemoPage<T>{
  if(query.scenario==='error')throw new Error('Lỗi kết nối minh họa. Chọn trạng thái bình thường rồi thử lại.');
  if(query.scenario==='empty')return {items:[],total:0,offset:query.offset,limit:query.limit,asOf:DEMO_AS_OF};
  const q=(query.search||'').trim().toLocaleLowerCase('vi');
  const filtered=rows.filter(r=>(!query.status||r.status===query.status)&&(!q||Object.values(r).some(value=>String(value??'').toLocaleLowerCase('vi').includes(q))));
  const limit=Math.max(1,Math.min(100,Number.isSafeInteger(query.limit)?query.limit:10));
  const requested=Number.isSafeInteger(query.offset)?Math.max(0,query.offset):0;
  const offset=Math.min(requested,Math.max(0,Math.ceil(filtered.length/limit)-1)*limit);
  return {items:filtered.slice(offset,offset+limit),total:filtered.length,offset,limit,asOf:DEMO_AS_OF};
}
export const syncFixtures:DemoRow[]=Array.from({length:48},(_,i)=>({id:`demo-device-${i+1}`,deviceAlias:`Thiết bị QA ${String(i+1).padStart(2,'0')}`,userAlias:`Tài khoản giả ${i%16+1}`,status:['healthy','offline','failed','unknown'][i%4],queueSize:i%4===0?0:3+i%28,lastSyncedAt:i%4===3?null:`2026-11-${String(18-i%5).padStart(2,'0')}T08:30:00+07:00`,appVersion:['1.2.0','1.3.0','1.3.1'][i%3],lastError:i%4===2?'Timeout khi tải hàng đợi lên':null,retries:i%4===2?3:0,reportedAt:'2026-11-18T09:50:00+07:00'}));
export const billFixtures:DemoRow[]=Array.from({length:42},(_,i)=>({id:`demo-bill-${i+1}`,merchant:['Cửa hàng minh họa A','Siêu thị minh họa B','Quán cà phê minh họa C'][i%3],total:25000+(i%9)*18000,category:['Ăn uống','Mua sắm','Di chuyển'][i%3],confidence:[.97,.81,.56][i%3],status:['pending','reviewed','excluded'][i%3],createdAt:`2026-11-${String(18-i%12).padStart(2,'0')}T09:15:00+07:00`,trainingConsent:true,retentionUntil:'2026-12-18',version:1,items:[{name:'Mặt hàng minh họa',quantity:1,amount:25000+(i%9)*18000}]}));
export type KpiDay={date:string;newUsers:number;totalUsers:number;transactions:number;confirmed:number;amount:number};
export const kpiFixtures:KpiDay[]=Array.from({length:90},(_,i)=>({date:new Date(Date.UTC(2026,7,21+i)).toISOString().slice(0,10),newUsers:8+i%13,totalUsers:1400+i*12,transactions:80+i%41,confirmed:68+i%29,amount:3500000+(i%17)*150000}));
export function summarizeKpis(rows:KpiDay[],from:string,to:string){
  const days=rows.filter(r=>r.date>=from&&r.date<=to).sort((a,b)=>a.date.localeCompare(b.date));
  return {days,hasData:days.length>0,newUsers:days.reduce((n,r)=>n+r.newUsers,0),totalUsers:days.at(-1)?.totalUsers??null,transactions:days.reduce((n,r)=>n+r.transactions,0),confirmed:days.reduce((n,r)=>n+r.confirmed,0),amount:days.reduce((n,r)=>n+r.amount,0)};
}
export function assertDemoVersion(scenario:string,expected:number,actual:number){if(scenario==='conflict'||expected!==actual)throw new Error('Xung đột phiên bản minh họa (409). Tải lại bản mới trước khi lưu.');}
