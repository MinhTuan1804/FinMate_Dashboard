import { useState } from 'react';
import { advancedGroups, configLabels } from '../../shared/configEditor';
import { displayValue } from '../../shared/labels';
import { presentationFieldLabel } from '../../shared/presentation';
const fieldName=(key:string)=>presentationFieldLabel(key)||configLabels[key]||advancedGroups[key];
function changes(before:unknown,after:unknown,path=''): {path:string;before:unknown;after:unknown}[]{
  if(JSON.stringify(before)===JSON.stringify(after))return [];
  if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after)){
    const a=before as Record<string,unknown>,b=after as Record<string,unknown>;
    return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>changes(a[key],b[key],path?`${path}.${key}`:key));
  }
  return [{path:path||'Nội dung',before,after}];
}
export function ReadableValue({value}:{value:unknown}){
  if(value==null)return <span>Chưa có</span>;
  if(typeof value==='boolean')return <span>{value?'Có':'Không'}</span>;
  if(typeof value==='number')return <span>{value.toLocaleString('vi-VN')}</span>;
  if(typeof value==='string')return <span className="readable-text">{displayValue(value)}</span>;
  if(Array.isArray(value))return value.length?<ol className="readable-list">{value.map((item,index)=><li key={index}><ReadableValue value={item}/></li>)}</ol>:<span>Chưa có mục nào</span>;
  const entries=Object.entries(value as Record<string,unknown>),known=entries.filter(([key])=>fieldName(key)),extra=entries.filter(([key])=>!fieldName(key));
  return <div className="readable-object">{known.length>0&&<dl className="result-kv">{known.map(([key,item])=><div key={key}><dt>{fieldName(key)}</dt><dd><ReadableValue value={item}/></dd></div>)}</dl>}{extra.length>0&&<details className="technical-details"><summary>Thông tin bổ sung ({extra.length} mục)</summary><dl className="result-kv">{extra.map(([key,item])=><div key={key}><dt><code>{key}</code></dt><dd><ReadableValue value={item}/></dd></div>)}</dl></details>}{!entries.length&&<span>Chưa có nội dung</span>}</div>;
}
export function JsonDiff({before,after}:{before:unknown;after:unknown}){
  const rows=changes(before,after);
  return <div className="json-review"><div className="review-heading"><strong>So sánh nội dung</strong><span className="fm-badge">{rows.length} mục thay đổi</span></div>{rows.length?<div className="fm-table-wrap"><table className="fm-table diff-table"><thead><tr><th>Thiết lập</th><th>Đang áp dụng</th><th>Bản đang xem</th></tr></thead><tbody>{rows.map(row=><tr key={row.path}><td>{row.path.split('.').map(key=>fieldName(key)||'Thiết lập bổ sung').join(' · ')}<details className="technical-details"><summary>Mã đối chiếu</summary><code>{row.path}</code></details></td><td><ReadableValue value={row.before}/></td><td><ReadableValue value={row.after}/></td></tr>)}</tbody></table></div>:<p className="fm-hint">Nội dung giống bản đang áp dụng.</p>}</div>;
}
export function JsonResult({value}:{value:unknown}){
  const [raw,setRaw]=useState(false);
  return <div className="json-review"><div className="review-heading"><strong>Kết quả kiểm tra</strong><button type="button" className="btn btn--small" onClick={()=>setRaw(!raw)}>{raw?'Xem tóm tắt':'Chi tiết kỹ thuật'}</button></div>{raw?<pre className="fm-json">{JSON.stringify(value,null,2)}</pre>:<ReadableValue value={value}/>}</div>;
}
