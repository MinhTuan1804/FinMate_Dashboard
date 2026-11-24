export function fmtDate(value:unknown){if(value==null||value==='')return '—';const date=new Date(typeof value==='number'?value:String(value));return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date)}
/** Chỉ ngày (dd/mm/yyyy) cho giá trị vốn là một ngày, ví dụ ngày số liệu; tránh hiện "00:00" vô nghĩa. */
export function fmtDay(value:unknown){if(value==null||value==='')return '—';const text=String(value);const day=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text);if(day)return `${day[3]}/${day[2]}/${day[1]}`;const date=new Date(text);return Number.isNaN(date.getTime())?text:new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'}).format(date)}
export function money(value:number|null|undefined){return value==null?'—':new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(value);}
/** IPv4 đi qua socket IPv6 hiện dạng ::ffff:1.2.3.4; bỏ tiền tố cho dễ đọc. */
export const showIp = (ip: string | null) => ip ? ip.replace(/^::ffff:/i, '') : '—';
