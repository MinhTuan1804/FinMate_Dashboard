const VN_OFFSET=7*60*60*1000;
export function vietnamDay(now=new Date()):string{return new Date(now.getTime()+VN_OFFSET).toISOString().slice(0,10);}
/** Both endpoints are inclusive calendar days in Vietnam, independent of browser timezone. */
export function calendarRange(preset:string,from:string,to:string,now=new Date()):{from:string;to:string;error:string}{
  const endDay=preset==='custom'?to:vietnamDay(now);
  const startDay=preset==='custom'?from:new Date(Date.parse(`${endDay}T00:00:00+07:00`)-(Math.max(1,Number(preset)||7)-1)*86400000+VN_OFFSET).toISOString().slice(0,10);
  const validDay=(day:string)=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T12:00:00Z'))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;
  if(!validDay(startDay)||!validDay(endDay))return {from:'',to:'',error:'Chọn đủ ngày bắt đầu và kết thúc.'};
  if(startDay>endDay)return {from:'',to:'',error:'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'};
  return {from:`${startDay}T00:00:00+07:00`,to:`${endDay}T23:59:59.999+07:00`,error:''};
}
