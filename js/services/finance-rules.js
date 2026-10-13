/* Shared payroll-cycle and financial-period eligibility rules */
window.ZenFinanceRules = (function () {
  'use strict';
  function clampDay(year, monthIndex, day) {
    return Math.min(Math.max(1, Number(day) || 1), new Date(year, monthIndex + 1, 0).getDate());
  }
  function cycleRange(monthKey) {
    const parts=String(monthKey||'').split('-').map(Number);
    if(parts.length!==2||!parts[0]||!parts[1]) return null;
    const y=parts[0], m=parts[1]-1, cfg=Object.assign({startDay:26,endDay:25},(ZenStore.settings||{}).payrollCycle||{});
    const startMonth=m+(Number(cfg.startDay)>Number(cfg.endDay)?-1:0);
    const startYear=y+Math.floor(startMonth/12), normalizedStartMonth=(startMonth%12+12)%12;
    const start=new Date(startYear,normalizedStartMonth,clampDay(startYear,normalizedStartMonth,cfg.startDay),0,0,0,0);
    const end=new Date(y,m,clampDay(y,m,cfg.endDay),23,59,59,999);
    return {start,end};
  }
  function localKey(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function overlaps(startA,endA,startB,endB) { return String(startA)<=String(endB) && String(endA)>=String(startB); }
  function applies(record, monthKey) {
    if(!record||record.status!=='active') return false;
    const cycle=cycleRange(monthKey); if(!cycle) return false;
    const periods=ZenStore.getCollection('financePeriods');
    if(record.periodId) {
      const p=periods.find(x=>x.id===record.periodId);
      return !!(p&&p.startDate&&p.endDate&&overlaps(p.startDate,p.endDate,localKey(cycle.start),localKey(cycle.end)));
    }
    if(!record.effectiveDate) return false;
    const d=new Date(record.effectiveDate+'T12:00:00');
    return d>=cycle.start&&d<=cycle.end;
  }
  function roundItem(record, amount) {
    const value=Number(amount)||0;
    if(record&&record.roundToFive) return Math.round(value/5)*5;
    return value;
  }
  return {cycleRange, applies, roundItem};
})();