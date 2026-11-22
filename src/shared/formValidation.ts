export type InputRule={key:string;label:string;required?:boolean;type?:string;min?:number;max?:number;maxLength?:number;pattern?:string;disabled?:boolean};
export function validateFields(fields:InputRule[],draft:Record<string,unknown>):Record<string,string>{
  const errors:Record<string,string>={};
  for(const f of fields){if(f.disabled)continue;const value=draft[f.key],empty=value==null||String(value).trim()==='';
    if(empty){if(f.required)errors[f.key]=`${f.label} là bắt buộc.`;continue;}
    if(f.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)||(f.min!=null&&value<f.min)||(f.max!=null&&value>f.max)))errors[f.key]=`Nhập số hợp lệ${f.min!=null?` từ ${f.min}`:''}${f.max!=null?` đến ${f.max}`:''}.`;
    else if(f.maxLength&&String(value).length>f.maxLength)errors[f.key]=`Tối đa ${f.maxLength} ký tự.`;
    else if(f.pattern&&!new RegExp(`^(?:${f.pattern})$`).test(String(value)))errors[f.key]='Giá trị không đúng định dạng. Xem hướng dẫn của trường.';
    else if(f.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))errors[f.key]='Chọn ngày hợp lệ.';
    else if(f.type==='url'&&!/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(String(value)))errors[f.key]='Nhập liên kết http hoặc https hợp lệ.';
  }
  return errors;
}
