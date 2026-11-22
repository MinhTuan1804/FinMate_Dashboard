import { useId, useState } from 'react';
import { advancedGroups, configLabel, configSchema, emptyConfigValue, type FieldSpec } from '../shared/configEditor';
import { useUrlState } from './ui/useUrlState';

export function AdvancedConfigEditor({value,onChange}:{value:Record<string,unknown>;onChange:(value:Record<string,unknown>)=>void}){
  const [chosen,setChosen]=useUrlState('group','notificationPipeline');
  const key=Object.hasOwn(advancedGroups,chosen)?chosen:'notificationPipeline';
  const type=configSchema.SystemConfigDocument[key]?.type||'';
  return <div className="fm-card advanced-config"><div className="fm-toolbar"><label>Nhóm cấu hình<select value={key} onChange={e=>setChosen(e.target.value)}>{Object.entries(advancedGroups).map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></label><span className="fm-hint">Chọn nhóm cần điều chỉnh. Các thiết lập chung nằm ở phần Ứng dụng, Ngưỡng và Giao diện ứng dụng.</span></div>
    <h2>{advancedGroups[key]}</h2><p className="fm-hint">Thay đổi chỉ có hiệu lực sau khi lưu và nhập lý do. Kiểm tra phần so sánh trước khi xác nhận.</p>
    <ConfigValue value={value[key]} spec={{type}} onChange={next=>onChange({...value,[key]:next})} label={advancedGroups[key]}/>
  </div>;
}
function ConfigValue({value,spec,onChange,label}:{value:unknown;spec:FieldSpec;onChange:(next:unknown)=>void;label:string}){
  const id=useId();const [open,setOpen]=useState(false),[newKey,setNewKey]=useState('');
  const type=spec.type.replace(/\?$/,'');
  const listType=type.match(/(?:IReadOnlyList|List)<(.+)>/)?.[1]||(type.endsWith('[]')?type.slice(0,-2):'');
  if(Array.isArray(value)||listType){const rows=Array.isArray(value)?value:[];return <details className="config-array" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{label} · {rows.length} mục</summary>{open&&<><div>{rows.map((row,index)=><div className="config-array-row" key={index}><div className="fm-toolbar"><strong>Mục {index+1}</strong><span className="fm-actions"><button type="button" className="btn btn--small" disabled={index===0} onClick={()=>{const next=[...rows];[next[index-1],next[index]]=[next[index],next[index-1]];onChange(next);}}>Lên</button><button type="button" className="btn btn--small" disabled={index===rows.length-1} onClick={()=>{const next=[...rows];[next[index+1],next[index]]=[next[index],next[index+1]];onChange(next);}}>Xuống</button><button type="button" className="btn btn--small" onClick={()=>onChange(rows.filter((_,i)=>i!==index))}>Bỏ mục {index+1}</button></span></div><ConfigValue label={`${label} ${index+1}`} value={row} spec={{type:listType||typeof row}} onChange={next=>onChange(rows.map((v,i)=>i===index?next:v))}/></div>)}</div><button type="button" className="btn" onClick={()=>onChange([...rows,emptyConfigValue(listType||'string')])}>Thêm mục</button></>}</details>;}
  if(value&&typeof value==='object'||configSchema[type]||type.includes('Dictionary')){
    const object=(value&&typeof value==='object'?value:{}) as Record<string,unknown>,fields=configSchema[type]||{};
    const dictionary=type.includes('Dictionary'),dictionaryType=type.match(/Dictionary<string,\s*(.+)>/)?.[1]||'string';
    return <div className="config-fields">{Object.entries(object).map(([key,item])=><div className={item&&typeof item==='object'?'config-field config-field--wide':'config-field'} key={key}><ConfigValue label={configLabel(key)} value={item} spec={fields[key]||{type:dictionary?dictionaryType:typeof item}} onChange={next=>onChange({...object,[key]:next})}/>{dictionary&&<button type="button" className="btn btn--small" onClick={()=>onChange(Object.fromEntries(Object.entries(object).filter(([k])=>k!==key)))}>Bỏ {configLabel(key)}</button>}</div>)}
      {dictionary&&<div className="fm-toolbar config-field--wide"><label>Thêm mã<input value={newKey} onChange={e=>setNewKey(e.target.value)} pattern="[a-z0-9_]+"/></label><button type="button" className="btn" disabled={!/^[a-z0-9_]+$/.test(newKey)||Object.hasOwn(object,newKey)} onClick={()=>{onChange({...object,[newKey]:emptyConfigValue(dictionaryType)});setNewKey('');}}>Thêm mã</button></div>}
    </div>;
  }
  const nullable=spec.type.endsWith('?'),numeric=/^(int|long|double|decimal|number)$/.test(type),isBoolean=type==='bool'||typeof value==='boolean';
  return <div className="module-field"><label htmlFor={id}>{label}</label>
    {nullable&&<label className="fm-inline"><input type="checkbox" checked={value===null} onChange={e=>onChange(e.target.checked?null:emptyConfigValue(type))}/>Dùng mặc định / bỏ giá trị</label>}
    {isBoolean?<input id={id} type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)}/>:
      type==='DateOnly'?<input id={id} type="date" value={String(value??'')} onChange={e=>onChange(e.target.value)}/>:
      !numeric&&String(value??'').length>140?<textarea id={id} disabled={nullable&&value===null} rows={7} value={String(value??'')} maxLength={spec.maxLength} onChange={e=>onChange(e.target.value)}/>:
      <input id={id} disabled={nullable&&value===null} type={numeric?'number':label.includes('Liên kết')?'url':'text'} min={spec.min} max={spec.max} maxLength={spec.maxLength} step={type==='int'||type==='long'?1:'any'} value={value==null?'':String(value)} onChange={e=>onChange(numeric?(e.target.value===''?'':Number(e.target.value)):e.target.value)}/>}
    {(spec.min!=null||spec.max!=null)&&<small>Khoảng cho phép: {spec.min??'không giới hạn'} → {spec.max??'không giới hạn'}</small>}
  </div>;
}
