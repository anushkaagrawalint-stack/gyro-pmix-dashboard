// Gyro Republic Product Mix dashboard engine - ported from Gyro_PMIX_Prototype (25).html.
// Same rendering code; the embedded Toast export data is replaced by the payload from /api/dashboard (Neon).
/* eslint-disable */
var __started=false;
export function startDashboard(payload){
 if(__started)return; __started=true;

'use strict';
var LOGO='/kutlerri-logo.webp';
var GLOGO='/gyro-logo.webp';

/* ───────── utils ───────── */
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function sum(a,f){var s=0;for(var i=0;i<a.length;i++)s+=f(a[i]);return s;}
function group(rows,kf){var m=new Map();rows.forEach(function(r){var k=kf(r),a=m.get(k);if(!a){a=[];m.set(k,a);}a.push(r);});return m;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function fN(n){return Math.round(n).toLocaleString('en-US');}
function f$(n){return '$'+Math.round(n).toLocaleString('en-US');}
function f$2(n){return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fC(n){var a=Math.abs(n);return a>=1e6?'$'+(n/1e6).toFixed(2)+'M':a>=1e3?'$'+(n/1e3).toFixed(1)+'K':'$'+Math.round(n);}
function fP(x,d){return (x*100).toFixed(d==null?1:d)+'%';}
var BLANK='<span class="blank" title="Cost data not connected yet">—</span>';
function parseD(s){var p=s.split('-').map(Number);return new Date(Date.UTC(p[0],p[1]-1,p[2]));}
function toS(d){return d.toISOString().slice(0,10);}
function addDays(s,n){var d=parseD(s);d.setUTCDate(d.getUTCDate()+n);return toS(d);}
function addYears(s,n){var d=parseD(s);d.setUTCFullYear(d.getUTCFullYear()+n);return toS(d);}
function diffDays(a,b){return Math.round((parseD(b)-parseD(a))/864e5);}
function weekStart(s){var d=parseD(s),dow=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-dow);return toS(d);} /* Monday-start weeks (assumption) */
/* Fiscal: calendar-month periods (Jan=P1, Feb=P2…). Week label mirrors the RASA logic: weeks counted from the period start. */
var FISCAL=((payload.meta&&payload.meta.fiscal)||[]).map(function(f){return {fy:+f.fiscal_year,p:+f.period,q:+f.quarter,s:f.s,e:f.e};});
function fiscalOf(d){if(typeof S!=='undefined'&&S&&S.cal==='month')return null;for(var i=0;i<FISCAL.length;i++)if(d>=FISCAL[i].s&&d<=FISCAL[i].e)return FISCAL[i];return null;}
/* week range for a week key: fiscal keys look like F2026-11-2 (FY, period, week); calendar keys like 2026-11-2 */
function weekRange(k){if(k.charAt(0)==='F'){var p=k.slice(1).split('-'),f=FISCAL.filter(function(x){return x.fy===+p[0]&&x.p===+p[1];})[0],s=addDays(f.s,(+p[2]-1)*7);return [s,addDays(s,6)];}
 var c=k.split('-'),y=+c[0],m=+c[1],n=+c[2];return [c[0]+'-'+c[1]+'-'+pad2((n-1)*7+1),n===4?monthEnd(y,m):c[0]+'-'+c[1]+'-'+pad2(n*7)];}
function weekLabel(ws){var f=fiscalOf(ws);if(f)return 'P'+f.p+'W'+(Math.floor(diffDays(f.s,ws)/7)+1);var ps=ws.slice(0,8)+'01',n=Math.floor(diffDays(ps,ws)/7)+1;return MON[(+ws.slice(5,7))-1]+' W'+n;}
function pweek(d){var f=fiscalOf(d);if(f){var w=Math.floor(diffDays(f.s,d)/7)+1;return {k:'F'+f.fy+'-'+pad2(f.p)+'-'+w,l:'P'+f.p+'W'+w};}var m=+d.slice(5,7),day=+d.slice(8,10),w=Math.min(4,Math.floor((day-1)/7)+1);return {k:d.slice(0,7)+'-'+w,l:MON[m-1]+' W'+w};}
function monthEnd(y,m){return toS(new Date(Date.UTC(y,m,0)));}
function dShort(s){var p=s.split('-');return MON[+p[1]-1]+' '+(+p[2]);}
function isSupply(n){n=String(n||'').toLowerCase();return n==='bag'||n.indexOf('fee')>=0||n.indexOf('guarantee')>=0||n.indexOf('surcharge')>=0||n.indexOf('utensil')>=0||n.indexOf('chafing kit')>=0;}
function isBYO(n){return /build.your.own|\bbyo\b/i.test(n||'');}

/* ───────── embedded Toast data (Gyro Republic) ───────── */
var EMB_ITEMS=payload.items;
var EMB_MODS=payload.mods;
var EMB_PAYS=payload.pays;
var EMB_ATT=payload.att;
var EMB_HOURS=payload.hours||[]; /* [isoDate, hour(0-23), location, net] — order-level net by hour, for the Daily time-of-day chart */
var SALESDAILY=(payload.salesDaily||[]).map(function(r){return {d:r[0],loc:r[1],net:r[2]};}); /* [date, location, net] over FULL history — for vs-previous / vs-last-year comparisons */
/* Modifier data is heavy (~25MB) and only the modifier views need it, so it is lazy-loaded from /api/mods on first open. */
var MODS_STATE=(payload.mods&&payload.mods.rows&&payload.mods.rows.length)?'loaded':'none'; /* none | loading | loaded | error */
function ensureMods(){
 if(MODS_STATE==='loaded')return true;
 if(MODS_STATE==='loading')return false;
 MODS_STATE='loading';var m=payload.meta;
 fetch('/api/mods?start='+encodeURIComponent(m.start)+'&end='+encodeURIComponent(m.end)).then(function(r){return r.json();}).then(function(j){
  if(j&&j.mods){DATA.mods=decodeMods(j.mods);computeAnchors();MODS_STATE='loaded';}else{MODS_STATE='error';}render();
 }).catch(function(){MODS_STATE='error';render();});
 return false;
}
function modsLoading(){return MODS_STATE==='error'?'<div class="cc" style="text-align:center;padding:46px 20px"><div class="ks" style="font-size:13px;margin-bottom:10px">Could not load modifier data.</div><button class="btn" data-a="modsretry">Retry</button></div>':'<div class="cc" style="text-align:center;padding:46px 20px"><svg width="26" height="26" viewBox="0 0 24 24" style="display:block;margin:0 auto 12px"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--s2)" stroke-width="3"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#7c3aed" stroke-width="3" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path></svg><div class="ks" style="font-size:13px">Loading modifier data…</div><div class="ks" style="font-size:11px;margin-top:3px">one-time for this date range · ~15–20s</div></div>';}
/* Weekly net sales by location (supplied by Harsh; weeks = Sep 1–7, 8–14, 15–21, 22–30). Sums tie to the item-sheet net per location (Pearland: −$0.20). */
var EMB_WEEKLY=null; /* weekly figures are computed from the daily item data (weeklyFromItems) */
var PERIOD={start:payload.meta.start,end:payload.meta.end,label:payload.meta.start?dtext(payload.meta.start,payload.meta.end):''}; /* loaded date window */ /* item-report period (confirmed by Harsh); item sheets themselves carry no dates */
function normG(s){s=String(s).trim();var t=s.replace(/^choo+se\s*:?\s*/i,'').replace(/^add\s*:\s*/i,'').trim();return t?t.charAt(0).toUpperCase()+t.slice(1):s;}
/* Payment sources: collapse case/spacing variants of the same source (e.g. “Doordash” / “DoorDash”, “Ez Cater” / “EZ Cater”) */
function canonSrc(s){if(s==='Card')return 'Card';var k=String(s).toLowerCase().replace(/[^a-z]/g,'');var M={doordash:'DoorDash',ubereats:'Uber Eats',grubhub:'Grubhub',ezcater:'EZ Cater',cash:'Cash',inkind:'In-Kind',giftcard:'Gift Card',appfrontgiftcardpayment:'Gift Card'};return M[k]||String(s).replace(/\b\w/g,function(c){return c.toUpperCase();});}
/* Dining options: collapse spelling/spacing variants of the same Toast option (e.g. “UberEats Delivery”, “Uber Eats - Delivery”, “UberEats - Delivery”) */
function canonDn(s){s=String(s).replace(/\s+/g,' ').trim();var k=s.toLowerCase().replace(/[^a-z]/g,'');var M={ubereatsdelivery:'UberEats - Delivery',ubereatstakeout:'UberEats - Takeout',doordashdelivery:'DoorDash - Delivery',doordashtakeout:'DoorDash - Takeout',grubhubdelivery:'Grubhub - Delivery',grubhubtakeout:'Grubhub - Takeout'};return M[k]||s;}
var ROLEOF={};
function setRoles(r){ROLEOF={};['main','drink','side','sweet'].forEach(function(k){(r[k]||[]).forEach(function(g){ROLEOF[g]=k;});});}
function decodeAtt(o){setRoles(o.roles);return {roles:o.roles,
 c:o.c.map(function(r){return {d:o.days[r[0]],loc:o.locs[r[1]],menu:o.menus[r[2]],n:r[3],dr:r[4],sd:r[5],sw:r[6],any:r[7],na:r[8]||0};}),
 i:o.i.map(function(r){return {d:o.days[r[0]],loc:o.locs[r[1]],menu:o.menus[r[2]],item:o.items[r[3]],grp:o.groups[r[4]],n:r[5],dr:r[6],sd:r[7],sw:r[8],any:r[9],na:r[10]||0};}),
 x:(o.x||[]).map(function(r){return {d:o.days[r[0]],loc:o.locs[r[1]],menu:o.menus[r[2]],item:o.items[r[3]],grp:o.groups[r[4]],cat:r[5],checks:r[6]};})};}
function decodePays(o){return o.map(function(r){return {d:r[0],loc:r[1],grp:r[2],src:r[3],kind:r[4],n:r[5],a:r[6],t:r[7],fee:r[8],ref:r[9]};});}
function decodeMods(o){return o.rows.map(function(r){var g=o.groups[r[4]];return {d:o.dates[r[0]],loc:o.locs[r[1]],dn:canonDn(o.dining[r[2]]),p:o.parents[r[3]],g:g,gn:normG(g),m:o.mods[r[5]],q:r[6],rev:r[7],menu:(o.menus||[])[r[8]]||''};});}
/* Toast location names (as in the Toast modifier exports); item-sheet tab names are mapped onto them */
function canonLoc(n){var k=String(n).toLowerCase().replace(/[^a-z0-9]/g,'');var M={fronden:'Fondren',fondren:'Fondren',springklein:'Spring - Klein',sugarland:'Sugar Land',missouricity:'Missouri City'};return M[k]||String(n).trim();}

/* ───────── CSV upload (Toast exports) ───────── */
function parseCSV(t){var rows=[],row=[],cur='',q=false,i,c;
 for(i=0;i<t.length;i++){c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}
  else if(c==='"')q=true;
  else if(c===','){row.push(cur);cur='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cur);cur='';if(row.length>1||row[0]!=='')rows.push(row);row=[];}
  else cur+=c;}
 if(cur!==''||row.length){row.push(cur);rows.push(row);}return rows;}
function normH(h){return String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
function num(v){if(v==null||v==='')return 0;var x=parseFloat(String(v).replace(/[$,%\s]/g,'').replace(/^\((.*)\)$/,'-$1'));return isNaN(x)?0:x;}
function pDate(v){v=String(v).trim();var m=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);if(m){var y=m[3].length===2?'20'+m[3]:m[3];return y+'-'+('0'+m[1]).slice(-2)+'-'+('0'+m[2]).slice(-2);}
 m=v.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:null;}
function detect(hdr){var h=hdr.map(normH);if(h.indexOf('check_id')>=0&&h.indexOf('menu_item')>=0&&h.indexOf('menu_group')>=0)return 'att';if(h.indexOf('receipt')>=0&&h.indexOf('amount')>=0&&h.indexOf('order_date')>=0&&h.indexOf('tip')>=0)return 'pays';if(h.indexOf('parent_menu_selection')>=0&&h.indexOf('modifier')>=0)return 'mods';if(h.indexOf('item_open_item')>=0&&h.indexOf('qty_sold')>=0)return 'items';return null;}
function locFromFile(n){var s=n.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').replace(/^\s*items?\s*details?\s*/i,'').trim();return canonLoc(s||n);}
function buildItems(rows,loc){var h=rows[0].map(normH),ix=function(k){return h.indexOf(k);},out=[],c={t:ix('type'),m:ix('menu'),g:ix('menu_group'),i:ix('item_open_item'),sc:ix('sales_category'),tg:ix('item_tags'),q:ix('qty_sold'),gr:ix('gross_item_amt'),d:ix('discount_amt'),r:ix('refund_amt'),v:ix('void_amt'),n:ix('net_item_amt'),tx:ix('tax_amt'),wq:ix('waste_count'),wa:ix('waste_amt'),vg:ix('voided_gross_item_amt'),vq:ix('voided_qty_sold'),qi:ix('item_qty_incl_voids'),gi:ix('gross_item_amt_incl_voids')};
 var G=function(r,k){return k<0?0:num(r[k]);};
 rows.slice(1).forEach(function(r){var t=String(r[c.t]||'').trim();if(t!=='menuItem'&&t!=='openItem')return;
  out.push({loc:loc,menu:r[c.m],grp:r[c.g],type:t,item:String(r[c.i]),sc:c.sc<0?'':String(r[c.sc]||''),tags:c.tg<0?'':String(r[c.tg]||''),q:G(r,c.q),g:G(r,c.gr),disc:G(r,c.d),ref:G(r,c.r),vd:G(r,c.v),n:G(r,c.n),tax:G(r,c.tx),wq:G(r,c.wq),wa:G(r,c.wa),vg:G(r,c.vg),vq:G(r,c.vq),qi:G(r,c.qi),gi:G(r,c.gi)});});
 return out;}
function buildMods(rows){var h=rows[0].map(normH),ix=function(k){return h.indexOf(k);},c={l:ix('location'),d:ix('order_date'),dn:ix('dining_option'),g:ix('option_group_name'),m:ix('modifier'),p:ix('parent_menu_selection'),q:ix('qty'),np:ix('net_price'),v:ix('void')};
 var agg=new Map(),skipped=0;
 rows.slice(1).forEach(function(r){var d=pDate(r[c.d]);if(!d){skipped++;return;}if(c.v>=0&&/^true$/i.test(String(r[c.v]).trim()))return;
  var loc=c.l>=0?canonLoc(r[c.l]):'Unknown',dn=canonDn(r[c.dn]||''),p=String(r[c.p]||'').trim(),g=String(r[c.g]||'')||'(No option group)',m=String(r[c.m]||'').trim(),k=[d,loc,dn,p,g,m].join('|'),a=agg.get(k);
  if(!a){a={d:d,loc:loc,dn:dn,p:p,g:g,gn:normG(g),m:m,q:0,rev:0};agg.set(k,a);}a.q+=num(r[c.q])||0;a.rev+=num(r[c.np]);});
 return {rows:Array.from(agg.values()),skipped:skipped};}

function buildPays(rows){var h=rows[0].map(normH),ix=function(k){return h.indexOf(k);},c={l:ix('location'),d:ix('order_date'),a:ix('amount'),t:ix('tip'),ty:ix('type'),v:ix('void_date')};
 var agg=new Map(),skipped=0;
 rows.slice(1).forEach(function(r){var d=pDate(r[c.d]);if(!d){skipped++;return;}var loc=c.l>=0?canonLoc(r[c.l]):'Unknown',ty=String(r[c.ty]||'').trim()||'Other',v=c.v>=0&&String(r[c.v]||'').trim()!==''?1:0,k=[d,loc,ty,v].join('|'),a=agg.get(k);
  if(!a){a={d:d,loc:loc,ty:ty,v:v,n:0,a:0,t:0};agg.set(k,a);}a.n++;a.a+=num(r[c.a]);a.t+=num(r[c.t]);});
 return {rows:Array.from(agg.values()),skipped:skipped};}

/* Attachment from a Toast Item Selection Details CSV: a “main check” is a check with ≥1 main item; drink / side / sweet = the check also has one (voided lines ignored). */
function buildAtt(rows){var h=rows[0].map(normH),ix=function(k){return h.indexOf(k);},c={l:ix('location'),d:ix('order_date'),k:ix('check_id'),o:ix('order_id'),it:ix('menu_item'),g:ix('menu_group'),m:ix('menu'),v:ix('void')};
 var checks=new Map(),skipped=0;
 rows.slice(1).forEach(function(r){if(c.v>=0&&/^true$/i.test(String(r[c.v]).trim()))return;var d=pDate(r[c.d]);if(!d){skipped++;return;}
  var role=ROLEOF[String(r[c.g]).trim()]||'other',id=/^\d{15,}$/.test(String(r[c.k]).trim())?String(r[c.k]).trim():'O'+(c.o>=0?String(r[c.o]).trim():String(r[c.k])),ck=checks.get(id); /* a Check Id mangled to scientific notation (e.g. 5E+17) falls back to the Order Id */if(!ck){ck={mains:[],dr:0,sd:0,sw:0};checks.set(id,ck);}
  if(role==='main')ck.mains.push({d:d,loc:canonLoc(r[c.l]),menu:String(r[c.m]).trim(),item:String(r[c.it]).trim(),grp:String(r[c.g]).trim()});else if(role==='drink')ck.dr=1;else if(role==='side')ck.sd=1;else if(role==='sweet')ck.sw=1;});
 var C=new Map(),I=new Map();
 checks.forEach(function(ck){if(!ck.mains.length)return;var any=(ck.dr||ck.sd||ck.sw)?1:0,f=ck.mains[0],kc=[f.d,f.loc,f.menu].join('|'),a=C.get(kc);if(!a){a={d:f.d,loc:f.loc,menu:f.menu,n:0,dr:0,sd:0,sw:0,any:0};C.set(kc,a);}a.n++;a.dr+=ck.dr;a.sd+=ck.sd;a.sw+=ck.sw;a.any+=any;
  var seen={};ck.mains.forEach(function(m){var k0=[m.item,m.grp,m.menu].join('|');if(seen[k0])return;seen[k0]=1;var ki=[m.d,m.loc,m.menu,m.item,m.grp].join('|'),b=I.get(ki);if(!b){b={d:m.d,loc:m.loc,menu:m.menu,item:m.item,grp:m.grp,n:0,dr:0,sd:0,sw:0,any:0};I.set(ki,b);}b.n++;b.dr+=ck.dr;b.sd+=ck.sd;b.sw+=ck.sw;b.any+=any;});});
 return {c:Array.from(C.values()),i:Array.from(I.values()),skipped:skipped};}

/* ───────── state ───────── */
var DATA={items:[],mods:[],pays:[],att:{c:[],i:[],x:[],roles:{}},weekly:null,embedded:true,files:[]};
var ANCH={},PNAME={}; /* anchor option group per modifier parent; parent → Toast item-sheet name */
var META={locs:[],menus:[],groups:[],dining:[],min:'',max:'',byo:{},amb:{}};
var S={tab:'overview',cal:'fiscal',dr:null,ch:[],cat:[],loc:[],dn:[],real:false,open:null,sort:{},q:{},t:{},col:{},ie:{},em:{sel:{},col:{}},ce:{},custom:{s:'',e:''},hideBanner:false,focus:null};
/* monochrome palette — purple / grey / light, interleaved so neighbours differ (segregation also shown by borders) */
var PAL=['#6d4bd0','#9b96a8','#9f7cef','#5b5566','#c3b0f2','#4c3a7a','#bdb8c8','#7a6fb0','#8b8694','#d8d4e0'];
var LOCC=['#6d4bd0','#8b8694','#9f7cef','#5b5566','#c3b0f2','#aba6b5','#4c3a7a','#bdb8c8','#7a6fb0','#d8d4e0'];
var TABS=[['overview','Overview'],['itemmix','Item Mix'],['entreemix','Entree Mix'],['loccompare','Locations'],['chanmenu','Channels'],['payment','Payment Source'],['meoverall','Menu Engineering'],['attachment','Analytics']];
/* which global filters apply per tab (item tabs: Toast Menu / Menu group / Location; modifier tabs: date + Dining Option, Sugar Land only) */
var TF={overview:{ch:1,cat:1,loc:1},itemmix:{ch:1,cat:1,loc:1},entreemix:{ch:1,loc:1,nr:1},loccompare:{ch:1,cat:1,loc:1},chanmenu:{ch:1,cat:1,loc:1},payment:{loc:1,date:1},meoverall:{loc:1},attachment:{ch:1,loc:1,nr:1}};
/* items that Toast lists under more than one menu group (e.g. Rice Bowl: BYO Bowl / Individual Bowls) are shown as “Item · Group” so every row ties to a Toast row */
function iLabel(item,grp){return META.amb[item]?item+' · '+grp:item;}

/* ───────── channel categories (Harsh's mapping of Toast menus / dining options) ───────── */
/* admin/owner grouping overrides (channel & category), from settings; empty = built-in mapping unchanged */
var CFG=(payload&&payload.config)?payload.config:{};
if(!CFG.channelByMenu)CFG.channelByMenu={};if(!CFG.channelByDining)CFG.channelByDining={};if(!CFG.categoryByGroup)CFG.categoryByGroup={};
function cfgDistinct(map,field){var s={};Object.keys(map).forEach(function(k){var v=map[k]&&map[k][field];if(v)s[v]=1;});return Object.keys(s);}
var CHAN_BASE=['In-store','App & Website','Delivery','Catering','3PD Catering'];
var CHAN_ORDER=CHAN_BASE.concat(Array.from(new Set(cfgDistinct(CFG.channelByMenu,'channel').concat(cfgDistinct(CFG.channelByDining,'channel')))).filter(function(c){return CHAN_BASE.indexOf(c)<0&&c!=='Other';})).concat(['Other']);
var CHAN_MENU={'NEW Dine In Menu':'In-store','NEW Online Menu':'App & Website','NEW 3RD Party Menu (BOGO)':'Delivery','NEW 3RD Party Menu':'Delivery','Gyro Republic - Catering Menu':'Catering','NEW Catering Menu':'Catering','NEW EZCATER Menu':'3PD Catering'};
var CHAN_COLOR={'In-store':'#6d4bd0','App & Website':'#9f7cef','Delivery':'#8b8694','Catering':'#c3b0f2','3PD Catering':'#5b5566','Other':'#aba6b5'};
function chanOf(menu){var o=CFG.channelByMenu[menu];return (o&&o.channel)||CHAN_MENU[menu]||'Other';}
function subChanOf(menu){var o=CFG.channelByMenu[menu];return (o&&o.sub)||menu;}
function chanColor(c){return CHAN_COLOR[c]||'#8b8694';}
function chanChip(c){return '<span class="chd"><i style="background:'+chanColor(c)+'"></i><b>'+esc(c)+'</b></span>';}
/* dining options → the same categories */
function dnChan(dn){var ov=CFG.channelByDining[dn];if(ov&&ov.channel)return ov.channel;var s=String(dn);if(/ez\s?cater/i.test(s))return '3PD Catering';if(/catering/i.test(s))return 'Catering';if(/doordash|uber|grubhub|deliverthat/i.test(s))return 'Delivery';if(/^app\b/i.test(s))return 'App & Website';if(/dine in|take out|phone/i.test(s))return 'In-store';return 'Other';}
function chanGroups(list,fn,ord){var m={};list.forEach(function(x){var c=fn(x);(m[c]||(m[c]=[])).push(x);});return (ord||CHAN_ORDER).filter(function(c){return m[c];}).map(function(c){return {cat:c,items:m[c]};});}
function chanTree(rows){var cats={};rows.forEach(function(r){var c=chanOf(r.menu),o=cats[c]||(cats[c]={cat:c,n:0,q:0,g:0,menus:{}});o.n+=r.n;o.q+=r.q;o.g+=r.g;var m=o.menus[r.menu]||(o.menus[r.menu]={menu:r.menu,n:0,q:0,g:0});m.n+=r.n;m.q+=r.q;m.g+=r.g;});
 return CHAN_ORDER.filter(function(c){return cats[c];}).map(function(c){var o=cats[c];o.menus=Object.keys(o.menus).map(function(k){return o.menus[k];}).sort(function(a,b){return b.n-a.n;});return o;});}
/* menu groups → combined categories (Category filter) */
var CATG_BASE=['Bowls','Pita & Gyrito','Sides','Drinks','Desserts','Deals','Catering'];
var CATG_ORDER=CATG_BASE.concat(Array.from(new Set(cfgDistinct(CFG.categoryByGroup,'category'))).filter(function(c){return CATG_BASE.indexOf(c)<0&&c!=='Other';})).concat(['Other']);
var CATG_MAP={'BYO Bowl':'Bowls','Individual Bowls':'Bowls','Bowls':'Bowls','Pita & Gyrito':'Pita & Gyrito','Sides & Extras':'Sides','Loaded Fries':'Sides','Drinks':'Drinks','Beverages':'Drinks','Dessert':'Desserts','Desserts':'Desserts','Deals':'Deals','Catering Packages':'Catering','Catering Menu':'Catering','NEW EZCATER Menu':'Catering','Group Tray':'Catering','A La Carte Sides':'Catering','A La Carte Protein Trays':'Catering'};
var CATG_COLOR={'Bowls':'#6d4bd0','Pita & Gyrito':'#9f7cef','Sides':'#8b8694','Drinks':'#c3b0f2','Desserts':'#6f6a7e','Deals':'#4c3a7a','Catering':'#aba6b5','Other':'#bdb8c8'};
function grpCat(g){var o=CFG.categoryByGroup[g];return (o&&o.category)||CATG_MAP[g]||'Other';}
function subCatOf(g){var o=CFG.categoryByGroup[g];return (o&&o.sub)||g;}
function grpColor(c){return CATG_COLOR[c]||'#8b8694';}
/* label for a channel / dining-option filter: whole categories show by name, partial ones by item */
function chanDisp(c){return String(c);}
function chanLabel(key,sel,all,unit){if(!sel.length)return all;var list=key==='ch'?META.menus:key==='cat'?META.groups:META.dining,fn=key==='ch'?chanOf:key==='cat'?grpCat:dnChan,parts=[];
 chanGroups(list,fn,key==='cat'?CATG_ORDER:null).forEach(function(g){var s=g.items.filter(function(x){return sel.indexOf(x)>=0;});if(!s.length)return;if(s.length===g.items.length)parts.push(key==='cat'?g.cat:chanDisp(g.cat));else s.forEach(function(x){parts.push(x);});});
 var lbl=parts.join(' + ');return (parts.length===1||lbl.length<=30)?lbl:sel.length+' '+unit;}
function meLabel(v){return v==='ALL'?'Overall':v==='BL'?'Blended':String(v).indexOf('cat:')===0?chanDisp(String(v).slice(4)):v;}


/* donut parts for a channel breakdown: channel categories, or — when everything in view belongs to ONE category — its sub-channels (Toast menus) */
function tint(hex,t){var n=parseInt(hex.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,bl=n&255,m=function(x){return Math.round(x+(255-x)*t);};return '#'+((1<<24)+(m(r)<<16)+(m(g)<<8)+m(bl)).toString(16).slice(1);}
function chanDonut(rows){var tree=chanTree(rows);
 if(tree.length===1){var c=tree[0],k=c.menus.length;return {title:'Net revenue by sub-channel · '+c.cat,parts:c.menus.map(function(m,i){return {l:m.menu,v:m.n,c:tint(chanColor(c.cat),k>1?i*Math.min(.22,.6/(k-1)):0)};})};}
 return {title:'Net revenue by channel',parts:tree.map(function(c){return {l:c.cat,v:c.n,c:chanColor(c.cat)};})};}
/* category breakdown (same logic as channels): combined categories, or — when everything in view belongs to ONE combined category — its menu groups */
function catBreak(rows){var net={},cs={};rows.forEach(function(r){var c=grpCat(r.grp);cs[c]=1;net[r.grp]=(net[r.grp]||0)+r.n;});var ck=Object.keys(cs);
 if(ck.length===1)return {sub:true,cat:ck[0],keys:Object.keys(net).sort(function(a,b){return net[b]-net[a];}),keyf:function(r){return r.grp;}};
 return {sub:false,cat:null,keys:CATG_ORDER.filter(function(c){return cs[c];}),keyf:function(r){return grpCat(r.grp);}};}
function catDonut(rows){var b=catBreak(rows),net={};rows.forEach(function(r){var k=b.keyf(r);net[k]=(net[k]||0)+r.n;});
 if(b.sub){var k=b.keys.length;return {title:'Net revenue by sub-category · '+b.cat,parts:b.keys.map(function(g,i){return {l:g,v:net[g],c:tint(grpColor(b.cat),k>1?i*Math.min(.22,.6/(k-1)):0)};})};}
 return {title:'Net revenue by category',parts:b.keys.map(function(c){return {l:c,v:net[c],c:grpColor(c)};})};}

function chColor(c){var i=META.menus.indexOf(c);return PAL[(i<0?0:i)%PAL.length];}
function locColor(l){var i=META.locs.indexOf(l);return LOCC[(i<0?0:i)%LOCC.length];}
function locShade(l){var i=META.locs.indexOf(l);return purpleShade(i<0?0:i,Math.max(META.locs.length,1));}
function catColor(c,i){return PAL[i%PAL.length];}
function isReal(r){return r.type!=='openItem'&&r.menu!=='Open items'&&!/\btest\b/i.test(r.item);} /* "Real Menu Items": drops Toast open items and test items */

function computeMeta(){
 var locs=new Set(),menuNet=new Map(),groups=new Set(),dn=new Set(),min='9999',max='0000',byo={};
 var ig={};DATA.items.forEach(function(r){(ig[r.item]||(ig[r.item]={}))[r.grp]=1;});META.amb={};Object.keys(ig).forEach(function(n){if(Object.keys(ig[n]).length>1)META.amb[n]=1;});
 DATA.items.forEach(function(r){locs.add(r.loc);menuNet.set(r.menu,(menuNet.get(r.menu)||0)+r.n);groups.add(r.grp);if(r.grp==='BYO Bowl')byo[r.item]=1;if(r.d&&r.d<min)min=r.d;if(r.d&&r.d>max)max=r.d;});
 DATA.mods.forEach(function(r){locs.add(r.loc);dn.add(r.dn);if(r.d<min)min=r.d;if(r.d>max)max=r.d;});
 DATA.att.c.forEach(function(r){locs.add(r.loc);});
 DATA.pays.forEach(function(r){locs.add(r.loc);if(!DATA.mods.length){if(r.d<min)min=r.d;if(r.d>max)max=r.d;}});
 META.locs=Array.from(locs).sort(function(a,b){return a.localeCompare(b,undefined,{numeric:true});});
 META.menus=Array.from(menuNet.entries()).sort(function(a,b){return b[1]-a[1];}).map(function(e){return e[0];});
 META.groups=Array.from(groups).sort();META.dining=Array.from(dn).sort();META.byo=byo;
 META.min=min==='9999'?'':min;META.max=max==='0000'?'':max;
}
/* Date-range options. “Today” = the latest date in the data (Sep 30, 2026), so every preset resolves to real dates shown next to its name. */
function pad2(n){return ('0'+n).slice(-2);}
function dtext(s,e){return dShort(s)+' – '+dShort(e)+', '+e.slice(0,4);}
function dateOptions(){
 var ref0=META.max||PERIOD.end,fr=fiscalOf(ref0);
 if(fr){var o2=[],mk2=function(id,label,s,e){return {id:id,label:label,start:s,end:e,text:dtext(s,e)};},prev=FISCAL.filter(function(x){return x.e<fr.s;}).slice(-1)[0],fys=FISCAL.filter(function(x){return x.fy===fr.fy;});
  o2.push(mk2('l7','Last 7 days',addDays(ref0,-6),ref0));
  o2.push(mk2('tm','This period (P'+fr.p+')',fr.s,ref0));
  if(prev)o2.push(mk2('lm','Last period (P'+prev.p+')',prev.s,prev.e));
  o2.push(mk2('ytd','Fiscal YTD (FY'+fr.fy+')',fys[0].s,ref0));
  fys.forEach(function(x){o2.push(mk2('p'+x.p,'P'+x.p+' · '+dShort(x.s)+' – '+dShort(x.e),x.s,x.e));});
  return o2;}
 var ref=META.max||PERIOD.end,y=+ref.slice(0,4),m=+ref.slice(5,7),o=[];
 var mk=function(id,label,s,e){return {id:id,label:label,start:s,end:e,text:dtext(s,e)};};
 var ps=y+'-'+pad2(m)+'-01',lm=m===1?[y-1,12]:[y,m-1];
 o.push(mk('l7','Last 7 days',addDays(ref,-6),ref));
 o.push(mk('tm','This month',ps,ref));
 o.push(mk('lm','Last month',lm[0]+'-'+pad2(lm[1])+'-01',monthEnd(lm[0],lm[1])));
 o.push(mk('ytd','YTD',y+'-01-01',ref));
 for(var k=1;k<=12;k++)o.push(mk('p'+k,MON[k-1]+' '+y,y+'-'+pad2(k)+'-01',monthEnd(y,k)));
 return o;
}
function findOpt(id){return dateOptions().filter(function(x){return x.id===id;})[0];}
function defaultRange(){var ref=META.max||PERIOD.end,f=fiscalOf(ref);return findOpt('p'+(f?f.p:+ref.slice(5,7)))||findOpt('l7');}
function periodBadge(dr){var fa=fiscalOf(dr.start),fb=fiscalOf(dr.end);if(fa||fb)return fa&&fb&&fa===fb?'P'+fa.p:null;var a=dr.start.slice(0,7),b=dr.end.slice(0,7);return a===b?MON[(+a.slice(5,7))-1]:null;}
/* item reports are period-level (no dates): they can only be shown for ranges that contain the whole period */
var ITEMTABS={overview:1,itemmix:1,loccompare:1,chanmenu:1,meoverall:1};
function itemRange(){return 'full';var d=S.dr;if(d.start<=PERIOD.start&&d.end>=PERIOD.end)return 'full';if(d.end<PERIOD.start||d.start>PERIOD.end)return 'none';return 'partial';}
function eff(tab){var t=TF[tab]||{};return {ch:t.ch?S.ch:[],cat:t.cat?S.cat:[],loc:t.loc?S.loc:[],real:t.ch?S.real:false};}
function getItems(F){var D_=S.dr;return DATA.items.filter(function(r){return (!r.d||(r.d>=D_.start&&r.d<=D_.end))&&(!F.ch.length||F.ch.indexOf(r.menu)>=0)&&(!F.cat.length||F.cat.indexOf(r.grp)>=0)&&(!F.loc.length||F.loc.indexOf(r.loc)>=0)&&(!F.real||isReal(r));});}
function getAtt(kind,F){var d=S.dr;return DATA.att[kind].filter(function(r){return r.d>=d.start&&r.d<=d.end&&(!F.loc.length||F.loc.indexOf(r.loc)>=0)&&(!F.ch.length||F.ch.indexOf(r.menu)>=0);});}
function getPays(){var d=S.dr;return DATA.pays.filter(function(r){return r.d>=d.start&&r.d<=d.end&&(!S.loc.length||S.loc.indexOf(r.loc)>=0);});}
function getMods(){var d=S.dr;return DATA.mods.filter(function(r){return r.d>=d.start&&r.d<=d.end&&(!S.dn.length||S.dn.indexOf(r.dn)>=0)&&(!S.loc.length||S.loc.indexOf(r.loc)>=0);});}
/* ── modifier parents ↔ item sheets ── */
function pkey(s){return String(s).toLowerCase().replace(/bogo/g,'').replace(/bowls/g,'bowl').replace(/[^a-z0-9]/g,'');}
function computeAnchors(){
 ANCH={};PNAME={};var names=new Set(),byKey={},iq={},parents=new Set(),tot={},pg={};
 DATA.items.forEach(function(r){names.add(r.item);byKey[pkey(r.item)]=r.item;iq[r.loc+'|'+r.item]=(iq[r.loc+'|'+r.item]||0)+r.q;});
 DATA.mods.forEach(function(r){parents.add(r.p);var k=r.p+'|'+r.loc+'|'+r.gn;tot[k]=(tot[k]||0)+r.q;(pg[r.p]||(pg[r.p]={}))[r.gn]=1;});
 parents.forEach(function(p){var n=names.has(p)?p:byKey[pkey(p)];if(n)PNAME[p]=n;});
 /* anchor = the option group whose total qty equals the item-sheet qty sold in every location where the parent sells (e.g. Rice Bowl ↔ “Rice”) */
 parents.forEach(function(p){var n=PNAME[p];if(!n)return;var present=0,sumq=0;
  META.locs.forEach(function(l){var q=iq[l+'|'+n]||0;if(q>=1){present++;sumq+=q;}});
  if(!present||sumq<20)return;
  Object.keys(pg[p]).forEach(function(g){if(ANCH[p])return;var ok=true;META.locs.forEach(function(l){var q=iq[l+'|'+n]||0;if(q>=1&&(tot[p+'|'+l+'|'+g]||0)!==q)ok=false;});if(ok)ANCH[p]=g;});});
}
/* parent quantities for the current filters: anchored → exact from modifier export; otherwise item-sheet qty scaled by modifier activity */
/* Entree Mix channel = same segregation as Item Mix (chanOf, by the item's menu).
   "Sold" is the actual item quantity in the selected date range / channel / locations, taken straight from the item layer, so it ties out exactly with Item Mix & the Product Mix report (no modifier-count estimate). */
function modCtx(){
 var rows=getMods(),q={},est={};
 var chSel=[];S.ch.forEach(function(m){var c=chanOf(m);if(chSel.indexOf(c)<0)chSel.push(c);});
 rows=rows.filter(function(r){return !chSel.length||chSel.indexOf(chanOf(r.menu))>=0;});
 /* sold = actual item qty via the SAME filter path Item Mix uses (getItems with the global channel/category/location/real filters), so Entree's "sold" ties out exactly with Item Mix & the Product Mix report. */
 var soldByName={};
 getItems({ch:S.ch,cat:S.cat,loc:S.loc,real:S.real}).forEach(function(r){soldByName[r.item]=(soldByName[r.item]||0)+r.q;});
 Object.keys(PNAME).forEach(function(p){q[p]=soldByName[PNAME[p]]||0;est[p]=false;});
 return {rows:rows,q:q,est:est};
}
function aggI(a){return {q:sum(a,function(r){return r.q;}),g:sum(a,function(r){return r.g;}),disc:sum(a,function(r){return r.disc;}),ref:sum(a,function(r){return r.ref;}),vd:sum(a,function(r){return r.vd;}),n:sum(a,function(r){return r.n;}),tax:sum(a,function(r){return r.tax;}),wq:sum(a,function(r){return r.wq;}),wa:sum(a,function(r){return r.wa;}),vq:sum(a,function(r){return r.vq;})};}
/* ───────── small UI helpers ───────── */
function empty(msg){return '<div class="empty">'+msg+'</div>';}
function kpi(cls,label,val,sub,extra,sm){return '<div class="kc '+cls+'"><div class="kl">'+label+'</div><div class="'+(sm?'kv-sm':'kv')+'">'+val+'</div>'+(sub?'<div class="ks">'+sub+'</div>':'')+(extra||'')+'</div>';}
function delta(cur,prev,invert){if(!prev)return '';var p=(cur-prev)/prev,up=p>=0,good=invert?!up:up;return '<div class="kd '+(good?'up':'dn')+'">'+(up?'▲':'▼')+' '+Math.abs(p*100).toFixed(1)+'% vs prior period</div>';}
function tgl(name,opts,cur){return '<div class="tgl-g">'+opts.map(function(o){return '<button class="tgl'+(cur===o[0]?' on':'')+'" data-a="tog" data-k="'+name+'" data-v="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>';}
function chip(c){return '<span class="chd"><i style="background:'+chColor(c)+'"></i>'+esc(c)+'</span>';}
function T(k,d){return S.t[k]==null?d:S.t[k];}
function niceMax(v){var p=Math.pow(10,Math.floor(Math.log10(v))),m=v/p,s=[1,1.2,1.5,2,2.5,3,4,5,6,8,10],i;for(i=0;i<s.length;i++)if(m<=s[i]+1e-9)return s[i]*p;return 10*p;}

/* ───────── charts (inline SVG / CSS — no external libs) ───────── */
function donut(parts,fv){
 /* Only positive slices can be drawn as an arc. A negative net slice (e.g. a channel
    whose refunds exceed sales in a short period) would make stroke-dasharray negative and
    corrupt the dashoffset of every following slice — the "spilled" ring. Drop non-positive
    slices from the ring; surface them separately in the legend so the data isn't hidden. */
 var drawn=(parts||[]).filter(function(p){return p&&p.v>0;}),hidden=(parts||[]).filter(function(p){return p&&p.v<=0;});
 var tot=sum(drawn,function(p){return p.v;});if(!tot)return empty('No data');
 var Rr=80,C=2*Math.PI*Rr,off=0,segs='',tip=function(p){return esc(p.l+'||'+fv(p.v)+'||'+(p.v>0?fP(p.v/tot)+' of total':'excluded from ring'));};
 var gap=(drawn.length>1)?2:0;/* monochrome palette: separate slices with a thin gap (shows the card behind) */
 drawn.forEach(function(p){var len=Math.max(0,Math.min(C,p.v/tot*C)),dl=Math.max(0,len-gap);segs+='<circle r="'+Rr+'" cx="100" cy="100" fill="none" stroke="'+p.c+'" stroke-width="34" stroke-dasharray="'+dl.toFixed(2)+' '+(C-dl).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 100 100)" data-tip="'+tip(p)+'"></circle>';off+=len;});
 parts=drawn.concat(hidden);
 return '<div class="donut"><div class="dsv"><svg viewBox="0 0 200 200">'+segs+'</svg></div><div class="lgs">'+
  parts.map(function(p){return '<div class="lg" data-tip="'+tip(p)+'"><span class="sw" style="background:'+p.c+'"></span><span class="ln" style="color:'+p.c+'">'+esc(p.l)+'</span></div>';}).join('')+'</div></div>';
}
function hbars(items,fv,fill){
 if(!items.length)return empty('No data');var max=Math.max.apply(null,items.map(function(i){return i.v;}).concat([1e-9]));
 return '<div class="hb'+(fill?' fill':'')+'">'+items.map(function(i){return '<div class="hbr" data-tip="'+esc(i.tip||(i.l+'||'+fv(i.v)))+'"><div class="hbl">'+esc(i.l)+'</div><div class="hbb"><div class="hbf" style="width:'+Math.max(0,i.v/max*100).toFixed(1)+'%;background:'+(i.c||'var(--accent)')+'"></div></div><div class="hbv">'+fv(i.v)+'</div></div>';}).join('')+'</div>';
}
/* monochrome purple ramp: rank 0 (largest share) darkest → lighter as share falls */
function purpleShade(i,n){var l=n>1?44+(i/(n-1))*38:60;return 'hsl(262 72% '+l.toFixed(0)+'%)';}
function columns(items,fv,opt){
 opt=opt||{};if(!items.length)return empty('No data');
 var series=opt.series||null,stacked=!!(series&&opt.stacked),ns=series?series.length:1;
 var W=opt.w||760,H=opt.h||220,pl=opt.pl||52,pb=opt.sub?44:34,pt=12,pr=opt.line?66:8,n=items.length,ph=H-pt-pb,
  allv=stacked?items.map(function(it){return it.vals.reduce(function(a,b){return a+(b||0);},0);}):(series?items.reduce(function(a,it){return a.concat(it.vals);},[]):items.map(function(i){return i.v;})),
  max=niceMax(Math.max.apply(null,allv.concat([1e-9]))*1.05),iw=(W-pl-pr)/n,
  bw=(series&&!stacked)?Math.min(88,(iw*.76)/ns):((opt.wide||stacked)?Math.min(88,iw*.6):Math.min(30,iw*.5)),
  bgap=(series&&!stacked)?Math.min(7,bw*.16):0,groupW=(series&&!stacked)?bw*ns+bgap*(ns-1):bw,svg='',k,
  lmax=opt.line?niceMax(Math.max.apply(null,opt.line.vals.concat([1e-9]))*1.05):0,tipOf=function(it){return esc(it.tip||(it.l+'||'+fv(it.v)));};
 for(k=0;k<=4;k++){var y=pt+ph*(1-k/4);svg+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#eee9fb"/><text x="'+(pl-6)+'" y="'+(y+3)+'" text-anchor="end" font-size="9" fill="#6b7280">'+fv(max*k/4)+'</text>';
  if(opt.line)svg+='<text x="'+(W-pr+8)+'" y="'+(y+3)+'" text-anchor="start" font-size="9" fill="#6b7280">'+opt.line.fmt(lmax*k/4)+'</text>';}
 var lblEvery=Math.max(1,Math.round(n/16));
 if(stacked){
  items.forEach(function(it,i){var x=pl+iw*i+(iw-bw)/2,acc=0;
   series.forEach(function(se,si){var v=it.vals[si]||0;if(v<=0)return;var h=ph*(v/max),y=H-pb-acc-h;acc+=h;
    svg+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+se.color+'" stroke="var(--card)" stroke-width="1.25" data-tip="'+esc((it.tips&&it.tips[si])||it.l)+'"></rect>';});
   if(i%lblEvery===0){svg+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-pb+15)+'" text-anchor="middle" font-size="10" fill="#4b5563">'+esc(it.l)+'</text>';if(opt.sub&&it.s)svg+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-pb+28)+'" text-anchor="middle" font-size="9" fill="#9ca3af">'+esc(it.s)+'</text>';}});
 } else if(series){
  items.forEach(function(it,i){var x0=pl+iw*i+(iw-groupW)/2;
   series.forEach(function(se,si){var v=(it.vals[si]||0),h=ph*(v/max),x=x0+si*(bw+bgap),y=H-pb-h;
    svg+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(h,0).toFixed(1)+'" rx="2.5" fill="'+se.color+'" stroke="var(--card)" stroke-width="1" data-tip="'+esc((it.tips&&it.tips[si])||it.l)+'"></rect>';});
   if(i%lblEvery===0){svg+='<text x="'+(x0+groupW/2).toFixed(1)+'" y="'+(H-pb+15)+'" text-anchor="middle" font-size="10" fill="#4b5563">'+esc(it.l)+'</text>';if(opt.sub&&it.s)svg+='<text x="'+(x0+groupW/2).toFixed(1)+'" y="'+(H-pb+28)+'" text-anchor="middle" font-size="9" fill="#9ca3af">'+esc(it.s)+'</text>';}});
  if(opt.line){var pts=opt.line.vals.map(function(v,i){var gx=pl+iw*i+(iw-groupW)/2;return [gx+bw/2,pt+ph*(1-v/lmax)];});
   svg+='<polyline fill="none" stroke="'+opt.line.color+'" stroke-width="2.5" stroke-linejoin="round" points="'+pts.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ')+'"/>';
   pts.forEach(function(q,i){svg+='<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="4" fill="#fff" stroke="'+opt.line.color+'" stroke-width="2.2" data-tip="'+esc((items[i].tips&&items[i].tips[0])||items[i].l)+'"></circle>';});}
 } else {
  items.forEach(function(it,i){var h=ph*(it.v/max),x=pl+iw*i+(iw-bw)/2,y=H-pb-h;
   svg+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(h,0).toFixed(1)+'" rx="3" fill="'+(it.c||opt.color||'#9f7cef')+'" stroke="var(--card)" stroke-width="1" data-tip="'+tipOf(it)+'"></rect>';
   if(i%lblEvery===0){svg+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-pb+15)+'" text-anchor="middle" font-size="10" fill="#4b5563">'+esc(it.l)+'</text>';if(opt.sub&&it.s)svg+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-pb+28)+'" text-anchor="middle" font-size="9" fill="#9ca3af">'+esc(it.s)+'</text>';}});
  if(opt.line){var pts2=opt.line.vals.map(function(v,i){return [pl+iw*i+iw/2,pt+ph*(1-v/lmax)];});
   svg+='<polyline fill="none" stroke="'+opt.line.color+'" stroke-width="2.5" stroke-linejoin="round" points="'+pts2.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ')+'"/>';
   pts2.forEach(function(q,i){svg+='<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="4.5" fill="#fff" stroke="'+opt.line.color+'" stroke-width="2.2" data-tip="'+tipOf(items[i])+'"></circle>';});}
  items.forEach(function(it,i){svg+='<rect x="'+(pl+iw*i).toFixed(1)+'" y="'+pt+'" width="'+iw.toFixed(1)+'" height="'+ph+'" fill="transparent" data-tip="'+tipOf(it)+'"></rect>';});
 }
 return '<div class="chart"><svg viewBox="0 0 '+W+' '+H+'">'+svg+'</svg></div>';
}
function lineChart(items,fv,color,w){
 if(items.length<2)return empty('Not enough weeks in range for a trend');
 var W=w||760,H=200,pl=52,pb=30,pt=12,pr=14,n=items.length,vals=items.map(function(i){return i.v;}),mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),pad=(mx-mn)*.2||mx*.1||1,lo=Math.max(0,mn-pad),hi=mx+pad,svg='',pts=[],k;
 for(k=0;k<=4;k++){var y=pt+(H-pt-pb)*(1-k/4);svg+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#eee9fb"/><text x="'+(pl-6)+'" y="'+(y+3)+'" text-anchor="end" font-size="9" fill="#6b7280">'+fv(lo+(hi-lo)*k/4)+'</text>';}
 items.forEach(function(it,i){var x=pl+(W-pl-pr)*i/(n-1),y=pt+(H-pt-pb)*(1-(it.v-lo)/(hi-lo));pts.push([x,y]);});
 svg+='<polyline fill="none" stroke="'+color+'" stroke-width="2.2" points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'"/>';
 items.forEach(function(it,i){svg+='<circle cx="'+pts[i][0].toFixed(1)+'" cy="'+pts[i][1].toFixed(1)+'" r="3.2" fill="'+color+'"><title>'+esc(it.l)+': '+fv(it.v)+'</title></circle>';if(n<=14||i%2===0)svg+='<text x="'+pts[i][0].toFixed(1)+'" y="'+(H-pb+14)+'" text-anchor="middle" font-size="9" fill="#6b7280">'+esc(it.l)+'</text>';});
 return '<div class="chart"><svg viewBox="0 0 '+W+' '+H+'">'+svg+'</svg></div>';
}

/* ───────── generic sortable table ───────── */
function tbl(id,title,cols,rows,o){
 o=o||{};var st=S.sort[id]||o.def||null,data=rows.slice(),q=(S.q[id]||'').toLowerCase().trim();
 if(q&&o.sfn)data=data.filter(function(r){return o.sfn(r).toLowerCase().indexOf(q)>=0;});
 if(st){var c=cols.filter(function(c){return c.k===st.k;})[0];if(c){var vf=c.v||function(r){return r[c.k];};data.sort(function(a,b){var x=vf(a),y=vf(b),r;if(typeof x==='string'||typeof y==='string')r=String(x==null?'':x).localeCompare(String(y==null?'':y));else r=(x==null?-1e18:x)-(y==null?-1e18:y);return st.d==='asc'?r:-r;});}}
 var max=o.max||250,shown=data.slice(0,max);
 var head=cols.map(function(c){return '<th data-a="sort" data-t="'+id+'" data-k="'+c.k+'" data-s="'+(c.a==='l'?'asc':'desc')+'" class="'+(c.a==='l'?'l':'')+'" title="'+esc(c.t||'')+'" style="'+(c.w?'min-width:'+c.w+'px':'')+'">'+c.l+(st&&st.k===c.k?(st.d==='asc'?' ▲':' ▼'):'')+'</th>';}).join('');
 var body=shown.map(function(r){return '<tr>'+cols.map(function(c){return '<td class="'+(c.a==='l'?'l':'')+'">'+(c.f?c.f(r):esc(r[c.k]))+'</td>';}).join('')+'</tr>';}).join('');
 var tools=(o.sfn?'<input class="srch" id="q_'+id+'" data-a="q" data-t="'+id+'" placeholder="Search…" value="'+esc(S.q[id]||'')+'">':'')+(o.extra||'');
 return '<div class="tw"><div class="th2"><h3>'+title+'</h3><div class="tools">'+tools+'</div></div><div class="tscroll"><table'+(o.fit?' style="width:auto"':'')+'><thead><tr>'+head+'</tr></thead><tbody>'+(body||'<tr><td colspan="'+cols.length+'" class="l" style="color:var(--muted);padding:20px">No rows match.</td></tr>')+'</tbody>'+(o.foot?'<tfoot><tr>'+o.foot+'</tr></tfoot>':'')+'</table></div>'+(data.length>max?'<div class="ks" style="padding:8px 14px">Showing top '+max+' of '+fN(data.length)+' rows'+(o.csv?' — use Download CSV for the full set':'')+'.</div>':'')+'</div>';
}
function csvDownload(name,heads,rows){
 var esc2=function(v){v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
 var txt=[heads.join(',')].concat(rows.map(function(r){return r.map(esc2).join(',');})).join('\n'),b=new Blob([txt],{type:'text/csv'}),a=document.createElement('a');
 a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
}

function multiLine(series,labels,fv,w,subs){
 var W=w||1280,H=subs?260:240,pl=66,pb=subs?44:30,pt=14,pr=24,n=labels.length,ph=H-pt-pb,mx=niceMax(Math.max.apply(null,series.map(function(s){return Math.max.apply(null,s.vals);}).concat([1e-9]))*1.05),svg='',k,iw=(W-pl-pr)/n;
 for(k=0;k<=4;k++){var y=pt+ph*(1-k/4);svg+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#eee9fb"/><text x="'+(pl-6)+'" y="'+(y+3)+'" text-anchor="end" font-size="9" fill="#6b7280">'+fv(mx*k/4)+'</text>';}
 var X=function(i){return pl+iw*(i+.5);},Y=function(v){return pt+ph*(1-v/mx);};   /* points sit at the centre of each week, like the bars */
 series.forEach(function(s){svg+='<polyline fill="none" stroke="'+s.color+'" stroke-width="2.2" stroke-linejoin="round" points="'+s.vals.map(function(v,i){return X(i).toFixed(1)+','+Y(v).toFixed(1);}).join(' ')+'"/>';s.vals.forEach(function(v,i){svg+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3.6" fill="#fff" stroke="'+s.color+'" stroke-width="2" data-tip="'+esc(s.name+' · '+labels[i]+(subs?' · '+subs[i]:'')+'||'+fv(v))+'"></circle>';});});
 labels.forEach(function(l,i){svg+='<text x="'+X(i).toFixed(1)+'" y="'+(H-pb+15)+'" text-anchor="middle" font-size="10" fill="#4b5563">'+esc(l)+'</text>';if(subs)svg+='<text x="'+X(i).toFixed(1)+'" y="'+(H-pb+28)+'" text-anchor="middle" font-size="9" fill="#9ca3af">'+esc(subs[i])+'</text>';});
 return '<div class="chart"><svg viewBox="0 0 '+W+' '+H+'">'+svg+'</svg></div><div style="display:flex;flex-wrap:wrap;gap:4px 14px;padding:4px 2px 0">'+series.map(function(s){return '<span class="chd" style="font-size:10.5px"><i style="background:'+s.color+'"></i>'+esc(s.name)+'</span>';}).join('')+'</div>';
}

/* ───────── item-based views (7 locations, Toast "All levels" item reports) ───────── */
function note(txt){return '<div class="banner p"><span>'+txt+'</span></div>';}
function ph(title,msg){return '<div class="cc" style="border:1px dashed var(--ln);box-shadow:none;background:var(--s2)"><h3>'+title+'</h3><div class="ks" style="font-size:11px">'+msg+'</div></div>';}
var NOCOST='Cost columns fill in once item costs are connected.';


/* Weekly sales trend (weekly net sales by location, supplied separately because the item reports carry no dates) */
function weeklyFromItems(){var d=S.dr,rows=DATA.items.filter(function(r){return r.d&&r.d>=d.start&&r.d<=d.end;});if(!rows.length)return null;
 var keys={};rows.forEach(function(r){var w=pweek(r.d);if(!keys[w.k]){var r0=weekRange(w.k),s0=r0[0],e0=r0[1];keys[w.k]={k:w.k,l:w.l,s:s0<d.start?d.start:s0,e:e0>d.end?d.end:e0};}});
 var ws=Object.keys(keys).sort().map(function(k){return keys[k];}),idx={};ws.forEach(function(w,i){idx[w.k]=i;});
 var v={},q={};rows.forEach(function(r){var i=idx[pweek(r.d).k];if(!v[r.loc]){v[r.loc]=ws.map(function(){return 0;});q[r.loc]=ws.map(function(){return 0;});}v[r.loc][i]+=r.n;q[r.loc][i]+=r.q;});
 return {weeks:ws.map(function(w){return [w.l,w.s,w.e];}),v:v,q:q};}
function signPct(cur,prv){if(!prv)return cur?'▲ new':'—';var p=(cur-prv)/prv*100;return (p>=0?'▲ +':'▼ ')+p.toFixed(1)+'%';}
/* bucket the selected range's items by granularity (day | week | period); net + qty per location per bucket */
function trendBuckets(gran){var dr=S.dr,rows=DATA.items.filter(function(r){return r.d&&r.d>=dr.start&&r.d<=dr.end;});if(!rows.length)return null;
 function meta(d){if(gran==='day')return {k:d,l:dShort(d),s:d,e:d};
  if(gran==='period'){var f=fiscalOf(d);return f?{k:'P'+f.fy+'-'+pad2(f.p),l:'P'+f.p,s:(f.s<dr.start?dr.start:f.s),e:(f.e>dr.end?dr.end:f.e)}:{k:d.slice(0,7),l:d.slice(0,7),s:d,e:d};}
  var w=pweek(d),rr=weekRange(w.k);return {k:w.k,l:w.l,s:(rr[0]<dr.start?dr.start:rr[0]),e:(rr[1]>dr.end?dr.end:rr[1])};}
 var keys={};rows.forEach(function(r){var m=meta(r.d);if(!keys[m.k])keys[m.k]=m;});
 var cols=Object.keys(keys).sort().map(function(k){return keys[k];}),idx={};cols.forEach(function(c,i){idx[c.k]=i;});
 var v={},q={};rows.forEach(function(r){var i=idx[meta(r.d).k];if(v[r.loc]===undefined){v[r.loc]=cols.map(function(){return 0;});q[r.loc]=cols.map(function(){return 0;});}v[r.loc][i]+=r.n;q[r.loc][i]+=r.q;});
 return {cols:cols,v:v,q:q};}
/* net per bucket for an arbitrary range (used for last-year comparison), same granularity ordering */
function bucketNetRange(start,end,locs,gran){var rows=DATA.items.filter(function(r){return r.d&&r.d>=start&&r.d<=end&&locs.indexOf(r.loc)>=0;});if(!rows.length)return [];
 function key(d){if(gran==='day')return d;if(gran==='period'){var f=fiscalOf(d);return f?'P'+f.fy+'-'+pad2(f.p):d.slice(0,7);}return pweek(d).k;}
 var by={};rows.forEach(function(r){var k=key(r.d);by[k]=(by[k]||0)+r.n;});return Object.keys(by).sort().map(function(k){return by[k];});}
function hourLabel(h){var ap=h<12?'AM':'PM',hh=h%12;if(hh===0)hh=12;return hh+' '+ap;}
var DOWC={Mon:'#6d4bd0',Tue:'#8172b5',Wed:'#9f7cef',Thu:'#8b8694',Fri:'#a39ead',Sat:'#bdb8c8',Sun:'#5b5566'};
function dowColor(d){return DOWC[d]||'#9f7cef';}
function dowTotals(cols,B,locs){var nm=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],t=[0,0,0,0,0,0,0];cols.forEach(function(c,i){var k=(parseD(c.s).getUTCDay()+6)%7;t[k]+=sum(locs,function(l){return B.v[l][i];});});return nm.map(function(n,k){return {l:n,v:t[k]};});}
function todTotals(locs){var by={};EMB_HOURS.forEach(function(r){if(r[0]>=S.dr.start&&r[0]<=S.dr.end&&locs.indexOf(r[2])>=0)by[r[1]]=(by[r[1]]||0)+r[3];});var hs=Object.keys(by).map(Number);if(!hs.length)return [];var lo=Math.min.apply(null,hs),hi=Math.max.apply(null,hs),out=[];for(var h=lo;h<=hi;h++)out.push({l:hourLabel(h),v:by[h]||0});return out;}
/* table under the by-location bars: a row per location (matching its shade), net per bucket + total */
function locTrendTable(cols,B,locs){var n=locs.length,sw=function(i){return '<span style="display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:7px;background:'+purpleShade(i,n)+'"></span>';};
 var head='<th class="l">Location</th>'+cols.map(function(c){return '<th>'+esc(c.l)+'</th>';}).join('')+'<th>Total</th>';
 var rows=locs.map(function(l,i){var tot=0,cells=cols.map(function(c,j){var v=B.v[l][j];tot+=v;return '<td>'+f$(v)+'</td>';}).join('');return '<tr><td class="l">'+sw(i)+esc(l)+'</td>'+cells+'<td><b>'+f$(tot)+'</b></td></tr>';}).join('');
 var gt=0,tc=cols.map(function(c,j){var s=sum(locs,function(l){return B.v[l][j];});gt+=s;return '<td>'+f$(s)+'</td>';}).join('');
 return '<div class="tw" style="margin-top:12px"><div class="tscroll" style="max-height:none"><table><thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td class="l">Total</td>'+tc+'<td><b>'+f$(gt)+'</b></td></tr></tfoot></table></div></div>';}
function trendCard(F){
 var dr=S.dr,pB=trendBuckets('period'),multiPeriod=!!(pB&&pB.cols.length>1),mode=T('ovTrend','tot');
 if(mode==='day')mode='tot';
 if(mode==='periodic'&&!multiPeriod)mode='tot';
 var gran=mode==='daily'?'day':mode==='periodic'?'period':'week';
 var B=gran==='period'?pB:trendBuckets(gran);
 if(!B)return ph('Sales trend','Not available for this range yet.');
 var locs=(F.loc.length?F.loc:META.locs).filter(function(l){return B.v[l];});if(!locs.length)return ph('Sales trend','No figures for the selected locations.');
 var cols=B.cols,labels=cols.map(function(c){return c.l;}),
  rng=cols.map(function(c){return c.s===c.e?dShort(c.s):dShort(c.s)+'–'+(c.s.slice(5,7)===c.e.slice(5,7)?(+c.e.slice(8,10)):dShort(c.e));}),
  days=cols.map(function(c){return diffDays(c.s,c.e)+1;}),
  rev=cols.map(function(c,i){return sum(locs,function(l){return B.v[l][i];});}),
  qty=cols.map(function(c,i){return sum(locs,function(l){return B.q[l][i];});}),chart,leg='',body='';
 if(mode==='loc'){
  var lseries=locs.map(function(l,i){return {color:purpleShade(i,locs.length),label:l};});
  var git=cols.map(function(c,i){var tot=rev[i];return {l:c.l,s:rng[i],vals:locs.map(function(l){return B.v[l][i];}),tips:locs.map(function(l){return l+' · '+c.l+'||'+f$(B.v[l][i])+(tot?'||'+fP(B.v[l][i]/tot,1)+' of this bar':'');})};});
  leg='<div class="tr-leg">'+lseries.map(function(se){return '<span class="chd" style="font-size:10.5px;margin-right:4px"><i style="background:'+se.color+'"></i>'+esc(se.label)+'</span>';}).join('')+'</div>';
  body=leg+columns(git,f$,{w:1280,h:210,pl:66,sub:1,series:lseries})+locTrendTable(cols,B,locs);
 } else if(mode==='daily'){
  var dCmp=SALESDAILY.length?trendCompare(cols):null;
  var dLeg=dCmp?('<div class="tr-leg">'+TREND_SERIES.map(function(se){return '<span class="chd" style="font-size:10.5px;margin-right:4px"><i style="background:'+se.color+'"></i>'+esc(se.label)+'</span>';}).join('')+'<span class="lk"></span> Qty (this)</div>'):'<div class="tr-leg"><i style="background:#9f7cef"></i>Net revenue<span class="lk"></span> Qty</div>';
  var byDay=dCmp?columns(rev.map(function(v,i){return {l:labels[i],vals:[v,dCmp.pv[i]||0,dCmp.ly[i]||0],tips:[labels[i]+' · This||Net revenue: '+f$(v)+'||'+fN(qty[i])+' items sold',labels[i]+' · Previous period||'+f$(dCmp.pv[i]||0),labels[i]+' · Last year||'+f$(dCmp.ly[i]||0)]};}),f$,{w:1280,h:175,pl:66,series:TREND_SERIES,line:{vals:qty,color:'#55505f',fmt:fN}}):columns(rev.map(function(v,i){return {l:labels[i],v:v,tip:labels[i]+'||Net revenue: '+f$(v)+'||'+fN(qty[i])+' items sold'};}),f$,{w:1280,h:175,pl:66,color:'#9f7cef',line:{vals:qty,color:'#55505f',fmt:fN}});
  var dw=dowTotals(cols,B,locs),td=todTotals(locs);
  var dwChart=columns(dw.map(function(x){return {l:x.l,v:x.v,tip:x.l+'||Net revenue: '+f$(x.v)};}),f$,{w:620,h:200,pl:56,color:'#9f7cef'});
  var tdChart=td.length?columns(td.map(function(x){return {l:x.l,v:x.v,tip:x.l+'||Net revenue: '+f$(x.v)};}),f$,{w:620,h:200,pl:56,color:'#9f7cef'}):empty('No hourly data for this range.');
  body=dLeg+'<div class="sub-h">Sales by day</div>'+byDay+'<div class="gr22" style="margin:14px 0 0"><div class="sub-blk"><div class="sub-h">Day of week (totals)</div>'+dwChart+'</div><div class="sub-blk"><div class="sub-h">Time of day (totals)</div>'+tdChart+'</div></div>';
 } else {
  var isAvg=mode==='day',rv=isAvg?rev.map(function(v,i){return v/days[i];}):rev,qv=isAvg?qty.map(function(v,i){return v/days[i];}):qty;
  if(!isAvg&&SALESDAILY.length){
   var cmp=trendCompare(cols),series=TREND_SERIES;
   var gitems=cols.map(function(c,i){var cur=rev[i],pvv=cmp.pv[i]||0,lyv=cmp.ly[i]||0;return {l:c.l,s:rng[i],vals:[cur,pvv,lyv],tips:[c.l+' · This||Net revenue: '+f$(cur)+(pvv?'||'+signPct(cur,pvv)+' vs previous':'')+(lyv?'||'+signPct(cur,lyv)+' vs last year':''),c.l+' · Previous period||Net revenue: '+f$(pvv),c.l+' · Last year||Net revenue: '+f$(lyv)]};});
   leg='<div class="tr-leg">'+series.map(function(se){return '<span class="chd" style="font-size:10.5px;margin-right:4px"><i style="background:'+se.color+'"></i>'+esc(se.label)+'</span>';}).join('')+(qv?'<span class="lk"></span> Qty (this)':'')+'</div>';
   chart=columns(gitems,f$,{w:1280,h:185,pl:66,sub:1,series:series,line:qv?{vals:qv,color:'#55505f',fmt:fN}:null});
  } else {
   leg='<div class="tr-leg"><i></i>Net revenue'+(qv?'<span class="lk"></span>Qty':'')+(isAvg?' · per day':'')+'</div>';
   chart=columns(rv.map(function(v,i){return {l:labels[i],s:rng[i],v:v,tip:labels[i]+' · '+rng[i]+' ('+days[i]+' day'+(days[i]>1?'s':'')+')||'+(isAvg?'Net revenue / day: ':'Net revenue: ')+f$(v)+(qv?'||'+(isAvg?'Qty / day: ':'Qty: ')+fN(qv[i]):'')};}),f$,{w:1280,h:185,pl:66,wide:1,color:'#c4b5fd',sub:1,line:qv?{vals:qv,color:'#55505f',fmt:fN}:null});
  }
  body=leg+chart;
 }
 var opts=[['daily','Daily'],['tot','Weekly']];if(multiPeriod)opts.push(['periodic','Periodic']);opts.push(['loc','By location']);
 var sel='<select class="fb-sel" data-a="sel" data-k="ovTrend">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(mode===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>';
 var pw=S.cal==='month'?'Calendar week':'Fiscal week',pp=S.cal==='month'?'Month':'Fiscal period';
 var granName=mode==='daily'?'Daily · time-of-day uses order open time':mode==='periodic'?pp:mode==='loc'?pw+' · share by location':mode==='day'?pw+' · avg per day':pw;
 var filt=(S.ch.length||S.cat.length||S.real)?' · Channel, category and “Real Menu Items” filters don’t apply to the trend.':'';
 return '<div class="cc"><div class="cc-h"><h3>Sales trend'+(mode==='daily'?'s':'')+'</h3><div style="display:flex;gap:8px;align-items:center">'+sel+'</div></div>'+body+'<div class="ax-t">'+granName+' · '+(F.loc.length?F.loc.length+' location'+(F.loc.length>1?'s':''):'all '+locs.length+' locations')+filt+'</div></div>';
}


/* channel table: channel category rows (expandable) with their Toast menus underneath */
function chanHier(rows,tot,id,title,wide){
 var tree=chanTree(rows),uniq=function(rs){return new Set(rs.map(function(r){return r.item;})).size;};
 var tail=function(n,q,rs){return '<td>'+f$(n)+'</td><td>'+fP(tot?n/tot:0)+'</td><td>'+fN(q)+'</td>'+(wide?'<td>'+(q?f$2(n/q):'—')+'</td><td>'+fN(uniq(rs))+'</td>':'');};
 var body=tree.map(function(c){var cr=rows.filter(function(r){return chanOf(r.menu)===c.cat;}),key=id+'|'+c.cat,closed=S.ce[key];
  return '<tr class="cr" data-a="ce" data-k="'+esc(key)+'"><td class="l"><span class="arr">'+(closed?'▶':'▼')+'</span>'+chanChip(c.cat)+'</td>'+tail(c.n,c.q,cr)+'</tr>'+
   (closed?'':c.menus.map(function(m,mi){var mr=cr.filter(function(r){return r.menu===m.menu;}),kk=c.menus.length;return '<tr class="mr"><td class="l"><span class="chd" style="padding-left:34px"><i style="background:'+tint(chanColor(c.cat),kk>1?mi*Math.min(.22,.6/(kk-1)):0)+'"></i>'+esc(m.menu)+'</span></td>'+tail(m.n,m.q,mr)+'</tr>';}).join(''));}).join('');
 var tq=sum(rows,function(r){return r.q;}),head='<th class="l" style="min-width:230px">Channel</th><th>Net Revenue</th><th>Revenue Mix (%)</th><th>Items Sold</th>'+(wide?'<th>Avg Item Price</th><th>Unique Items</th>':'');
 var foot='<td>Total</td><td>'+f$(tot)+'</td><td>'+(tot?'100.0%':'—')+'</td><td>'+fN(tq)+'</td>'+(wide?'<td>'+(tq?f$2(tot/tq):'—')+'</td><td>'+fN(uniq(rows))+'</td>':'');
 return '<div class="tw"><div class="th2"><h3>'+title+'</h3><span class="ks" style="margin:0">Click a channel to collapse its menus</span></div><div class="tscroll" style="max-height:none"><table><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody><tfoot><tr>'+foot+'</tr></tfoot></table></div></div>';}

/* full-history daily net sales → net for an arbitrary date range (location filter applies; channel/category do not) */
function netForRange(start,end){var loc=S.loc,s=0;for(var i=0;i<SALESDAILY.length;i++){var r=SALESDAILY[i];if(r.d<start||r.d>end)continue;if(loc.length&&loc.indexOf(r.loc)<0)continue;s+=r.net;}return s;}
/* net per location for a date range (for the Location Compare vs-previous / vs-last-year bars) */
function netByLoc(start,end){var m={};for(var i=0;i<SALESDAILY.length;i++){var r=SALESDAILY[i];if(r.d<start||r.d>end)continue;m[r.loc]=(m[r.loc]||0)+r.net;}return m;}
/* grey comparison series for the sales trend: per current bucket, net for the same bucket a period earlier (PY/previous) and a year earlier (LY) */
var TREND_SERIES=[{color:'#9f7cef',label:'This'},{color:'#b4afc0',label:'Previous'},{color:'#d8d4e0',label:'Last year'}];
function trendCompare(cols){var dr=S.dr,len=diffDays(dr.start,dr.end)+1;
 return {pv:cols.map(function(c){return netForRange(addDays(c.s,-len),addDays(c.e,-len));}),ly:cols.map(function(c){return netForRange(addYears(c.s,-1),addYears(c.e,-1));})};}
function vOverview(){
 var F=eff('overview'),rows=getItems(F);if(!rows.length)return empty('No items match the selected filters.');
 var A=aggI(rows),byItem=Array.from(group(rows,function(r){return r.item+'||'+r.grp;})).map(function(e){return {l:iLabel(e[1][0].item,e[1][0].grp),v:sum(e[1],function(r){return r.n;}),q:sum(e[1],function(r){return r.q;})};});
 var top=byItem.slice().sort(function(a,b){return b.v-a.v;})[0];
 var k='<div class="krow k6">'+kpi('a','Items Sold',fN(A.q),'Qty sold')+kpi('g','Net Revenue',f$(A.n),'Gross '+f$(A.g)+' · Discounts '+f$(A.disc))+kpi('r','Refunds',f$(A.ref),'Voids '+f$(A.vd)+' (reported separately)')+kpi('p','Avg Margin',BLANK,'Awaiting cost data')+kpi('b','Unique Items',fN(byItem.length),'')+kpi('o','Top Item',esc(top.l),f$(top.v)+' · '+fN(top.q)+' sold',null,true)+'</div>';
 var trend=trendCard(F);
 var cd=chanDonut(rows);
 var cdc=catDonut(rows);
 var dn='<div class="gr22"><div class="cc"><h3>'+esc(cd.title)+'</h3>'+donut(cd.parts,f$)+'</div><div class="cc"><h3>'+esc(cdc.title)+'</h3>'+donut(cdc.parts,f$)+'</div></div>';
 var bb=T('ovBB','top'),sorted=byItem.filter(function(x){return x.v>0;}).sort(function(a,b){return (bb==='top'?b.v-a.v:a.v-b.v)||String(a.l).localeCompare(String(b.l));}).slice(0,8);
 var byL=Array.from(group(rows,function(r){return r.loc;})).map(function(e){return {l:e[0],v:sum(e[1],function(r){return r.n;})};}).sort(function(a,b){return b.v-a.v;});byL.forEach(function(x,i){x.c=purpleShade(i,byL.length);});
 var two='<div class="gr22"><div class="cc"><div class="cc-h"><h3>'+(bb==='top'?'Top':'Bottom')+' 8 items by net revenue'+(F.cat.length?' · '+esc(chanLabel('cat',F.cat,'All Categories','Categories')):'')+'</h3>'+'<button class="btn-sel" data-a="tog" data-k="ovBB" data-v="'+(bb==='top'?'bottom':'top')+'">'+(bb==='top'?'Bottom':'Top')+'</button>'+'</div>'+hbars(sorted,f$)+'</div><div class="cc"><h3>Net revenue by location</h3>'+hbars(byL,f$)+'</div></div>';
 return k+trend+dn+two+chanHier(rows,A.n,'ov','Channel breakdown',false);
}



/* ───────── Item Mix: Toast Menu (channel) → Menu group → Item, collapsible, like the RASA dashboard ───────── */
var IMCOLS=[['item','ITEM',0,'l'],['grp','MENU GROUP',0,'l'],['qty','QTY',1,'','Total quantity sold'],['qmix','MIX % (QTY)',1,'','This channel’s qty ÷ this item’s total qty across channels'],['gross','GROSS SALES',1,'','Pre-discount revenue (ties to Toast gross sales)'],['gmix','MIX % REVENUE BY CATEGORY',1,'','Item gross ÷ its menu group’s gross'],['net','NET SALES',1,'','Gross − discounts'],['ref','REFUNDS',1,'','Refunded amount'],['nar','NET AFTER REFUNDS',1,'','Net sales − refunds (matches Toast Net item amt)'],['omix','MIX % REVENUE OVERALL',1,'','Item gross ÷ total gross across all items'],['ap','AVG PRICE',1,'','Gross ÷ Qty'],['ac','AVG COST',1,'','Needs item cost data (not connected yet)'],['cg','COGS %',1,'','Needs item cost data (not connected yet)']];
function vItemMix(){
 if(!S.imh)S.imh={items:true,open:true,mods:true,special:false};
 var F=eff('itemmix'),rows=getItems(F);if(!rows.length)return empty('No items match the selected filters.');
 var grpF=T('imGrp','all');if(grpF!=='all')rows=rows.filter(function(r){return r.grp===grpF;});if(!rows.length)return empty('No items in this menu group.');
 var sk=T('imSort','gross'),dir=T('imDir','desc'),q=(S.q.itemmix||'').toLowerCase().trim(),tot=aggI(rows);
 var itemAll=new Map(),catAll=new Map();rows.forEach(function(r){var k=r.item+'||'+r.grp;itemAll.set(k,(itemAll.get(k)||0)+r.q);catAll.set(r.grp,(catAll.get(r.grp)||0)+r.g);});
 var disp=q?rows.filter(function(r){return (r.item+' '+r.grp+' '+r.menu+' '+r.sc).toLowerCase().indexOf(q)>=0;}):rows;
 /* modifiers by parent item (date range + selected locations), like Toast Product Mix nesting */
 var modMap=new Map();DATA.mods.forEach(function(r){if(r.d<S.dr.start||r.d>S.dr.end)return;if(S.loc.length&&S.loc.indexOf(r.loc)<0)return;var sp=(!r.g||r.g==='(No option group)'),bp=modMap.get(r.p);if(!bp){bp=new Map();modMap.set(r.p,bp);}var kk=r.gn+'||'+r.m,e=bp.get(kk);if(!e){e={grp:r.gn||'(no group)',mod:r.m,q:0,rev:0,sp:sp};bp.set(kk,e);}e.q+=r.q;e.rev+=r.rev;});
 var val=function(a){switch(sk){case 'qty':case 'qmix':return a.q;case 'net':return a.g-a.disc;case 'nar':return a.g-a.disc-a.ref;case 'ref':return a.ref;case 'ap':return a.q?a.g/a.q:0;case 'ac':case 'cg':return 0;default:return a.g;}};
 var order=function(arr){return arr.sort(function(x,y){return dir==='asc'?val(x)-val(y):val(y)-val(x);});};
 var view=T('imView','hier');
 var menus=order(Array.from(group(disp,function(r){return r.menu;})).map(function(me){
  var grps=order(Array.from(group(me[1],function(r){return r.grp;})).map(function(ge){
   var items=order(Array.from(group(ge[1],function(r){return r.item;})).map(function(ie){var a=aggI(ie[1]),sc='';ie[1].forEach(function(r){if(!sc&&r.sc)sc=r.sc;});a.item=ie[0];a.grp=ge[0];a.sc=sc;a.type=ie[1][0].type;return a;}));
   var ga=aggI(ge[1]);ga.grp=ge[0];ga.items=items;return ga;}));
  var ma=aggI(me[1]);ma.menu=me[0];ma.grps=grps;return ma;}));
 var cats=CHAN_ORDER.filter(function(k){return disp.some(function(r){return chanOf(r.menu)===k;});}).map(function(k){var cr=disp.filter(function(r){return chanOf(r.menu)===k;}),a=aggI(cr);a.cat=k;a.menus=menus.filter(function(m){return chanOf(m.menu)===k;});return a;});
 var N=IMCOLS.length,z=function(v,f){return v?f(v):'—';},pc=function(a,b){return b?fP(a/b):'—';};
 var td=function(h,l){return '<td'+(l?' class="l"':'')+'>'+h+'</td>';};
 var cells=function(a,mix){var ns=a.g-a.disc,nar=ns-a.ref;return td(fN(a.q))+td(mix?pc(a.q,mix.iq):'—')+td('<b>'+f$2(a.g)+'</b>')+td(mix?pc(a.g,mix.cg):'—')+td('<span style="color:var(--mu)">'+f$2(ns)+'</span>')+td(a.ref?'<span style="color:var(--bd)">'+f$2(a.ref)+'</span>':'—')+td('<b>'+f$2(nar)+'</b>')+td('<span style="color:var(--ai);font-weight:600">'+pc(a.g,tot.g)+'</span>')+td(a.q?f$2(a.g/a.q):'—')+td(BLANK)+td(BLANK);};
 var body='',nKeys=new Set(),nRows=0;
 if(view==='flat'){
  /* flat, one row per item name (summed across channels/menus) = Toast Product Mix "Items" sheet */
  var flatItems=order(Array.from(group(disp,function(r){return r.item;})).map(function(e){var a=aggI(e[1]);a.item=e[0];var gq={};e[1].forEach(function(r){gq[r.grp]=(gq[r.grp]||0)+r.q;});var dg='',dgq=-1;Object.keys(gq).forEach(function(k){if(gq[k]>dgq){dgq=gq[k];dg=k;}});a.grp=dg;a.sc='';e[1].forEach(function(r){if(!a.sc&&r.sc)a.sc=r.sc;});a.type=e[1][0].type;return a;}));
  flatItems.forEach(function(a){
   if(a.type==='openItem'&&!S.imh.open)return;if(a.type!=='openItem'&&!S.imh.items)return;
   var md=S.imh.mods?modMap.get(a.item):null,mlist=md?Array.from(md.values()).filter(function(x){return S.imh.special||!x.sp;}).sort(function(x,y){return y.rev-x.rev;}):[],hasM=mlist.length>0;
   var ik='f|'+a.item,open=S.ie[ik];nKeys.add(a.item);nRows++;
   var mix={iq:tot.q,cg:catAll.get(a.grp)};
   body+='<tr class="ir"'+(hasM?' data-a="ie" data-k="'+esc(ik)+'" style="cursor:pointer"':'')+'>'+td((hasM?'<span class="arr">'+(open?'▼':'▶')+'</span>':'<span class="arr"></span>')+esc(a.item)+(a.type==='openItem'?' <span class="mb mb-pend" style="font-size:8px">open item</span>':''),1)+td(esc(a.grp||'—'),1)+cells(a,mix)+'</tr>';
   if(open&&hasM)mlist.forEach(function(x){body+='<tr class="lr">'+td('<span class="arr"></span>'+esc(x.mod),1)+td(esc(x.grp),1)+cells({q:x.q,g:x.rev,disc:0,ref:0},null)+'</tr>';});});
 } else {
 cats.forEach(function(ct){var ck='c|'+ct.cat,cc=S.col[ck];
  body+='<tr class="b0" data-a="cm" data-k="'+esc(ck)+'"><td colspan="'+N+'"><span class="arr">'+(cc?'▶':'▼')+'</span><span class="chd" style="color:#fff"><i style="background:'+chanColor(ct.cat)+'"></i>'+esc(ct.cat)+'</span><span class="sub">'+f$(ct.g)+' gross · '+f$(ct.g-ct.disc)+' net · '+pc(ct.g,tot.g)+' of gross · '+f$2(ct.ref)+' refunds</span></td></tr>';
  if(cc)return;
  ct.menus.forEach(function(m){var mk='m|'+m.menu,mc=S.col[mk];
  body+='<tr class="b1" data-a="cm" data-k="'+esc(mk)+'"><td colspan="'+N+'"><span class="arr">'+(mc?'▶':'▼')+'</span>'+chip(m.menu).replace('class="chd"','class="chd" style="color:#fff;font-weight:700"')+'<span class="sub">'+fN(m.q)+' qty · '+f$(m.g)+' gross</span></td></tr>';
  if(mc)return;
  m.grps.forEach(function(g){var gk='g|'+m.menu+'|'+g.grp,gc=S.col[gk];
   body+='<tr class="b2" data-a="cm" data-k="'+esc(gk)+'"><td colspan="'+N+'"><span class="arr">'+(gc?'▶':'▼')+'</span>'+esc(g.grp)+'<span class="sub">'+fN(g.q)+' qty · '+f$(g.g)+' gross</span></td></tr>';
   if(gc)return;
   g.items.forEach(function(a){
    if(a.type==='openItem'&&!S.imh.open)return;if(a.type!=='openItem'&&!S.imh.items)return;
    var md=S.imh.mods?modMap.get(a.item):null,mlist=md?Array.from(md.values()).filter(function(x){return S.imh.special||!x.sp;}).sort(function(x,y){return y.rev-x.rev;}):[],hasM=mlist.length>0;
    var ik='i|'+m.menu+'|'+g.grp+'|'+a.item,open=S.ie[ik];nKeys.add(a.item+'||'+g.grp);nRows++;
    var mix={iq:itemAll.get(a.item+'||'+g.grp),cg:catAll.get(g.grp)};
    body+='<tr class="ir"'+(hasM?' data-a="ie" data-k="'+esc(ik)+'" style="cursor:pointer"':'')+'>'+td((hasM?'<span class="arr">'+(open?'▼':'▶')+'</span>':'<span class="arr"></span>')+esc(a.item)+(a.type==='openItem'?' <span class="mb mb-pend" style="font-size:8px">open item</span>':''),1)+td(esc(a.grp||'—'),1)+cells(a,mix)+'</tr>';
    if(open&&hasM)mlist.forEach(function(x){body+='<tr class="lr">'+td('<span class="arr"></span>'+esc(x.mod),1)+td(esc(x.grp),1)+cells({q:x.q,g:x.rev,disc:0,ref:0},null)+'</tr>';});});});});});
 }
 var tns=tot.g-tot.disc,tnar=tns-tot.ref;
 var foot='<td>Total</td><td></td><td>'+fN(tot.q)+'</td><td></td><td>'+f$2(tot.g)+'</td><td></td><td>'+f$2(tns)+'</td><td>'+f$2(tot.ref)+'</td><td>'+f$2(tnar)+'</td><td></td><td></td><td></td><td></td>';
 var head=IMCOLS.map(function(c){var sortable=c[2],on=sortable&&sk===c[0];return '<th'+(sortable?' data-a="isort" data-k="'+c[0]+'"':'')+' class="'+(c[3]==='l'?'l':'')+'" title="'+esc(c[4]||'')+'" style="'+(on?'color:var(--accent);':'')+(c[0]==='item'?'min-width:200px':'')+'">'+c[1]+(on?(dir==='desc'?' ↓':' ↑'):'')+'</th>';}).join('');
 var hierBody=[['items','Items'],['open','Open items'],['mods','Modifiers'],['special','Special requests']].map(function(o){return '<label class="dr-it" style="justify-content:flex-start;gap:8px"><input type="checkbox" data-a="imh" data-k="'+o[0]+'"'+(S.imh[o[0]]?' checked':'')+' style="accent-color:var(--accent)"> '+o[1]+(o[0]==='special'?'<span class="dr-sub" style="white-space:normal;max-width:150px">free text a guest typed; no option group</span>':'')+'</label>';}).join('');
 var hierDd=dropdown('imh','Menu hierarchy',150,hierBody,230);
 var grps=Array.from(new Set(rows.map(function(r){return r.grp;}))).sort();
 var grpSel='<select class="fb-sel" data-a="sel" data-k="imGrp"><option value="all">All groups</option>'+grps.map(function(g){return '<option value="'+esc(g)+'"'+(grpF===g?' selected':'')+'>'+esc(g||'(blank)')+'</option>';}).join('')+'</select>';
 var SOPTS=[['qty','Qty'],['qmix','Mix % (Qty)'],['gross','Gross Sales'],['gmix','Mix % Rev by Category'],['net','Net Sales'],['ref','Refunds'],['nar','Net after Refunds'],['omix','Mix % Rev Overall'],['ap','Avg Price'],['ac','Avg Cost'],['cg','COGS %']];
 var sortSel='<select class="fb-sel" data-a="sel" data-k="imSort">'+SOPTS.map(function(o){return '<option value="'+o[0]+'"'+(sk===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select><button class="btn" data-a="imdir" title="Toggle sort direction">'+(dir==='desc'?'↓':'↑')+'</button>';
 var cogsBtn='<button class="btn" disabled title="Needs item cost data (not connected yet)" style="opacity:.45;cursor:not-allowed">COGS Outliers</button>';
 var viewTgl=tgl('imView',[['hier','Hierarchy'],['flat','Flat (by item)']],view);
 var expCol=view==='flat'?'':'<button class="btn" data-a="expall">Expand all</button><button class="btn" data-a="colall">Collapse all</button>';
 var tools=viewTgl+hierDd+'<input class="srch" id="q_itemmix" data-a="q" data-t="itemmix" placeholder="Search items…" value="'+esc(S.q.itemmix||'')+'">'+grpSel+cogsBtn+expCol+'<span class="ks" style="margin:0">'+fN(nKeys.size)+' items · '+fN(nRows)+' rows</span><button class="btn" data-a="csv" data-t="itemmix">Export CSV</button>';
 return note(view==='flat'?'<b>Flat view</b> — one row per item, summed across every channel and menu (matches Toast Product Mix → <b>Items</b> sheet). Switch to <b>Hierarchy</b> for the Channel → Menu → Menu group breakdown (Toast → All levels). Click an item to see its modifiers.':'Hierarchy: <b>Channel</b> → Toast <b>Menu</b> → <b>Menu group</b> → item → <b>modifiers</b> (matches Toast Product Mix → <b>All levels</b>). Switch to <b>Flat</b> for one total row per item (Toast → Items). Click a header to collapse it; click an item to see its modifiers.')+'<div class="tw"><div class="th2"><h3>Item mix</h3><div class="tools">'+tools+'</div></div><div class="tscroll" style="max-height:calc(100vh - 188px)"><table class="imx"><colgroup><col style="width:16%"><col style="width:9%"><col style="width:6%"><col style="width:7%"><col style="width:8%"><col style="width:8%"><col style="width:7%"><col style="width:6%"><col style="width:8%"><col style="width:7%"><col style="width:6%"><col style="width:6%"><col style="width:6%"></colgroup><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody><tfoot><tr>'+foot+'</tr></tfoot></table></div></div>';
}


/* Location Compare: top / bottom items per location (like the RASA dashboard) */
function topItemsByLoc(rows,locs){
 var mode=T('lcTM','pct'),tb=T('lcTop','top'),N=10;
 var head='<div class="lt-head"><div style="display:flex;align-items:center;gap:12px"><h3 style="font-size:14px;font-weight:700;text-transform:none;letter-spacing:0">'+(tb==='top'?'Top':'Bottom')+' items by location</h3>'+tgl('lcTop',[['top','Top'],['bottom','Bottom']],tb)+'</div>'+tgl('lcTM',[['pct','%'],['cnt','#']],mode)+'</div>';
 var cards=locs.map(function(l){
  var lr=rows.filter(function(r){return r.loc===l;}),tn=sum(lr,function(r){return r.n;}),tq=sum(lr,function(r){return r.q;});
  var items=Array.from(group(lr,function(r){return r.item+'||'+r.grp;})).map(function(e){return {name:iLabel(e[1][0].item,e[1][0].grp),n:sum(e[1],function(r){return r.n;}),q:sum(e[1],function(r){return r.q;})};}).filter(function(x){return x.n>0;});
  items.sort(function(a,b){return (tb==='top'?b.n-a.n:a.n-b.n)||String(a.name).localeCompare(String(b.name));});
  var body=items.slice(0,N).map(function(x,i){var pr=tn?x.n/tn:0,pq=tq?x.q/tq:0;
   return '<tr data-tip="'+esc(x.name+'||'+l+'||Net '+f$(x.n)+' ('+fP(pr,1)+' of location revenue)||Qty '+fN(x.q)+' ('+fP(pq,1)+' of location qty)')+'"><td class="rk">'+(i+1)+'</td><td class="nm">'+esc(x.name)+'</td><td class="b">'+(mode==='pct'?fP(pr,1):f$(x.n))+'</td><td>'+(mode==='pct'?fP(pq,1):fN(x.q))+'</td></tr>';}).join('');
  return '<div class="lt-card"><div class="lt-t"><i style="background:'+locShade(l)+'"></i>'+esc(l)+'</div><table class="ltt"><thead><tr><th></th><th>Item</th><th>'+(mode==='pct'?'% Rev':'Rev')+'</th><th>'+(mode==='pct'?'% Qty':'Qty')+'</th></tr></thead><tbody>'+body+'</tbody></table></div>';}).join('');
 return head+'<div class="lt-grid">'+cards+'</div>';
}

function vLoc(){
 var level=T('lcLevel','item'),lvlHead='<div class="lt-head" style="margin:0 2px 12px"><div style="display:flex;align-items:center;gap:12px"><h3 style="font-size:14px;font-weight:700;text-transform:none;letter-spacing:0">Locations</h3>'+tgl('lcLevel',[['item','Items'],['modifier','Modifiers']],level)+'</div></div>';
 if(level==='modifier')return vLocMods(lvlHead);
 var F=eff('loccompare'),rows=getItems(F);if(!rows.length)return lvlHead+empty('No items match the selected filters.');
 var metric=T('lcMetric','rev'),val=function(a){return metric==='rev'?sum(a,function(r){return r.n;}):sum(a,function(r){return r.q;});},fv=metric==='rev'?f$:fN;
 var locs=META.locs.filter(function(l){return rows.some(function(r){return r.loc===l;});}),byL=group(rows,function(r){return r.loc;}),tn=sum(rows,function(r){return r.n;});
 var cards='<div class="loc-grid">'+locs.map(function(l){var a=byL.get(l),n=sum(a,function(r){return r.n;}),q=sum(a,function(r){return r.q;});return '<div class="kc" style="border-left-color:'+locShade(l)+'"><div class="kl" style="color:'+locShade(l)+'">'+esc(l)+'</div><div class="kv" style="font-size:19px">'+f$(n)+'</div><div class="ks">'+fN(q)+' items · '+fP(n/tn,0)+' of total</div></div>';}).join('')+'</div>';
 var chart;
 if(metric==='rev'&&SALESDAILY.length){
  var lcLen=diffDays(S.dr.start,S.dr.end)+1,thL=netByLoc(S.dr.start,S.dr.end),pvL=netByLoc(addDays(S.dr.start,-lcLen),addDays(S.dr.end,-lcLen)),lyL=netByLoc(addYears(S.dr.start,-1),addYears(S.dr.end,-1));
  var lcGi=locs.map(function(l){var cur=thL[l]||0,pv=pvL[l]||0,ly=lyL[l]||0;return {l:l,vals:[cur,pv,ly],tips:[l+' · This||Net revenue: '+f$(cur)+(pv?'||'+signPct(cur,pv)+' vs previous':'')+(ly?'||'+signPct(cur,ly)+' vs last year':''),l+' · Previous period||Net revenue: '+f$(pv),l+' · Last year||Net revenue: '+f$(ly)]};});
  var lcLeg='<div class="tr-leg">'+TREND_SERIES.map(function(se){return '<span class="chd" style="font-size:10.5px;margin-right:4px"><i style="background:'+se.color+'"></i>'+esc(se.label)+'</span>';}).join('')+'</div>';
  chart='<div class="cc"><div class="cc-h"><h3>Net revenue by location · vs previous &amp; last year</h3>'+tgl('lcMetric',[['rev','Revenue'],['qty','Qty']],metric)+'</div>'+lcLeg+columns(lcGi,f$,{w:1280,h:230,series:TREND_SERIES})+'</div>';
 } else {
  chart='<div class="cc"><div class="cc-h"><h3>'+(metric==='rev'?'Net revenue':'Items sold')+' by location</h3>'+tgl('lcMetric',[['rev','Revenue'],['qty','Qty']],metric)+'</div>'+columns(locs.map(function(l){return {l:l,v:val(byL.get(l)),c:locShade(l)};}),fv,{w:1280,h:230})+'</div>';
 }
 var cb=catBreak(rows),cats=cb.keys,showAmt=T('lcCat','pct')==='amt';
 var catRows=cats.map(function(c){var o={cat:c};locs.forEach(function(l){o[l]=val(byL.get(l).filter(function(r){return cb.keyf(r)===c;}));o['t_'+l]=val(byL.get(l));});return o;});
 var cCols=[{k:'cat',l:(cb.sub?'Sub-category · '+cb.cat:'Category'),a:'l',w:180,f:function(r){return esc(r.cat);}}].concat(locs.map(function(l){return {k:l,l:'<span style="color:'+locShade(l)+'">'+esc(l)+'</span>',f:function(r){return showAmt?fv(r[l]):fP(r['t_'+l]?r[l]/r['t_'+l]:0);}};}));
 var catTbl=tbl('lccat','Category mix by location ('+(showAmt?(metric==='rev'?'USD':'qty'):'% of '+(metric==='rev'?'revenue':'qty'))+')',cCols,catRows,{extra:tgl('lcCat',[['pct','%'],['amt','Amount']],showAmt?'amt':'pct')});
 var items=Array.from(group(rows,function(r){return r.item+'||'+r.grp;})).map(function(e){var o={item:iLabel(e[1][0].item,e[1][0].grp),grp:e[1][0].grp},bl=group(e[1],function(r){return r.loc;});locs.forEach(function(l){o[l]=bl.has(l)?val(bl.get(l)):0;});o.avg=sum(locs,function(l){return o[l];})/locs.length;return o;});
 var iCols=[{k:'item',l:'Item',a:'l',w:190,f:function(r){return esc(r.item);}}].concat(locs.map(function(l){return {k:l,l:'<span style="color:'+locShade(l)+'">'+esc(l)+'</span>',f:function(r){return r[l]?fv(r[l]):'—';}};})).concat([{k:'avg',l:'Avg / location',f:function(r){return '<b>'+fv(r.avg)+'</b>';}}]);
 return lvlHead+cards+chart+topItemsByLoc(rows,locs)+catTbl+tbl('lcitem','Item comparison · '+(metric==='rev'?'Net revenue':'Qty'),iCols,items,{def:{k:'avg',d:'desc'},sfn:function(r){return r.item+' '+r.grp;},max:250});
}
/* top / bottom modifiers per location (monochrome) */
function topModsByLoc(mrows,locs){
 var mode=T('lcMTM','pct'),tb=T('lcMTop','top'),N=10;
 var head='<div class="lt-head"><div style="display:flex;align-items:center;gap:12px"><h3 style="font-size:14px;font-weight:700;text-transform:none;letter-spacing:0">'+(tb==='top'?'Top':'Bottom')+' modifiers by location</h3>'+tgl('lcMTop',[['top','Top'],['bottom','Bottom']],tb)+'</div>'+tgl('lcMTM',[['pct','%'],['cnt','#']],mode)+'</div>';
 var cards=locs.map(function(l){
  var lr=mrows.filter(function(r){return r.loc===l;}),tp=sum(lr,function(r){return r.q;});
  var items=Array.from(group(lr,function(r){return r.m+'||'+r.gn;})).map(function(e){return {name:e[1][0].m,grp:e[1][0].gn,q:sum(e[1],function(r){return r.q;})};}).filter(function(x){return x.q>0;});
  items.sort(function(a,b){return (tb==='top'?b.q-a.q:a.q-b.q)||String(a.name).localeCompare(String(b.name));});
  var body=items.slice(0,N).map(function(x,i){var pq=tp?x.q/tp:0;return '<tr data-tip="'+esc(x.name+'||'+l+' · '+x.grp+'||'+fN(x.q)+' picks ('+fP(pq,1)+' of location)')+'"><td class="rk">'+(i+1)+'</td><td class="nm">'+esc(x.name)+'</td><td class="b">'+(mode==='pct'?fP(pq,1):fN(x.q))+'</td></tr>';}).join('');
  return '<div class="lt-card"><div class="lt-t"><i style="background:'+locShade(l)+'"></i>'+esc(l)+'</div><table class="ltt"><thead><tr><th></th><th>Modifier</th><th>'+(mode==='pct'?'% Picks':'Picks')+'</th></tr></thead><tbody>'+body+'</tbody></table></div>';}).join('');
 return head+'<div class="lt-grid">'+cards+'</div>';
}
/* Location Compare — modifier level: modifiers compared across locations */
function vLocMods(head){
 if(!ensureMods())return head+modsLoading();
 var mrows=getMods();if(!mrows.length)return head+empty('No modifier data for '+esc(S.dr.text)+' with the selected filters.');
 var metric='picks',val=function(a){return sum(a,function(r){return r.q;});},fv=fN;
 var locs=META.locs.filter(function(l){return mrows.some(function(r){return r.loc===l;});}),byL=group(mrows,function(r){return r.loc;}),tq=sum(mrows,function(r){return r.q;});
 var cards='<div class="loc-grid">'+locs.map(function(l){var a=byL.get(l),picks=sum(a,function(r){return r.q;});return '<div class="kc" style="border-left-color:'+locShade(l)+'"><div class="kl" style="color:'+locShade(l)+'">'+esc(l)+'</div><div class="kv" style="font-size:19px">'+fN(picks)+'</div><div class="ks">picks · '+fP(tq?picks/tq:0,0)+' of total</div></div>';}).join('')+'</div>';
 var chart='<div class="cc"><div class="cc-h"><h3>Modifier picks by location</h3></div>'+columns(locs.map(function(l){return {l:l,v:val(byL.get(l)),c:locShade(l)};}),fv,{w:1280,h:230})+'</div>';
 var grps=Array.from(new Set(mrows.map(function(r){return r.gn;}))).sort(),showAmt=T('lcMG','pct')==='amt';
 var gRows=grps.map(function(gnm){var o={grp:gnm};locs.forEach(function(l){var lr=byL.get(l);o[l]=val(lr.filter(function(r){return r.gn===gnm;}));o['t_'+l]=val(lr);});return o;});
 var gCols=[{k:'grp',l:'Modifier group',a:'l',w:180,f:function(r){return esc(r.grp);}}].concat(locs.map(function(l){return {k:l,l:'<span style="color:'+locShade(l)+'">'+esc(l)+'</span>',f:function(r){return showAmt?fv(r[l]):fP(r['t_'+l]?r[l]/r['t_'+l]:0);}};}));
 var gTbl=tbl('lcmg','Modifier group mix by location ('+(showAmt?'qty':'% of qty')+')',gCols,gRows,{extra:tgl('lcMG',[['pct','%'],['amt','Qty']],showAmt?'amt':'pct'),fit:1});
 var mods=Array.from(group(mrows,function(r){return r.m+'||'+r.gn;})).map(function(e){var o={mod:e[1][0].m,grp:e[1][0].gn},bl=group(e[1],function(r){return r.loc;});locs.forEach(function(l){o[l]=bl.has(l)?val(bl.get(l)):0;});o.avg=sum(locs,function(l){return o[l];})/locs.length;return o;});
 var mCols=[{k:'mod',l:'Modifier',a:'l',w:180,f:function(r){return esc(r.mod);}},{k:'grp',l:'Group',a:'l',w:140,f:function(r){return esc(r.grp);}}].concat(locs.map(function(l){return {k:l,l:'<span style="color:'+locShade(l)+'">'+esc(l)+'</span>',f:function(r){return r[l]?fv(r[l]):'—';}};})).concat([{k:'avg',l:'Avg / location',f:function(r){return '<b>'+fv(r.avg)+'</b>';}}]);
 var mTbl=tbl('lcmod','Modifier comparison · Picks',mCols,mods,{def:{k:'avg',d:'desc'},sfn:function(r){return r.mod+' '+r.grp;},max:300,fit:1});
 return head+cards+chart+topModsByLoc(mrows,locs)+gTbl+mTbl;
}

function vChannels(){
 var level=T('chLevel','item'),lvlHead='<div class="lt-head" style="margin:0 2px 12px"><div style="display:flex;align-items:center;gap:12px"><h3 style="font-size:14px;font-weight:700;text-transform:none;letter-spacing:0">Channels</h3>'+tgl('chLevel',[['item','Items'],['modifier','Modifiers']],level)+'</div></div>';
 if(level==='modifier')return vChanMods(lvlHead);
 var F=eff('chanmenu'),rows=getItems(F);if(!rows.length)return lvlHead+empty('No items match the selected filters.');
 var tn=sum(rows,function(r){return r.n;}),tree=chanTree(rows),locs=META.locs.filter(function(l){return rows.some(function(r){return r.loc===l;});});
 var cards='<div class="loc-grid">'+tree.map(function(c){var sub=c.menus.length>1?c.menus.map(function(m){return esc(m.menu)+' '+f$(m.n);}).join(' · '):esc(c.menus[0].menu);
  return '<div class="kc" style="border-left-color:'+chanColor(c.cat)+'"><div class="kl">'+esc(c.cat)+'</div><div class="kv" style="font-size:19px">'+f$(c.n)+'</div><div class="ks">'+fP(c.n/tn)+' mix · '+fN(c.q)+' items</div><div class="ks" style="margin-top:3px;line-height:1.4">'+sub+'</div></div>';}).join('')+'</div>';
 var cd=chanDonut(rows),top='<div class="gr2"><div class="cc"><h3>'+esc(cd.title)+'</h3>'+donut(cd.parts,f$)+'</div>'+chanHier(rows,tn,'ch','Channel summary',true)+'</div>';
 var clM=T('clMetric','net'),clVal=function(a){return clM==='qty'?sum(a,function(r){return r.q;}):clM==='gross'?sum(a,function(r){return r.g;}):sum(a,function(r){return r.n;});},clF=clM==='qty'?fN:f$,clLbl=clM==='qty'?'qty':clM==='gross'?'gross':'net revenue';
 var chcols=tree.map(function(c){return c.cat;});
 /* stacked channel-mix-by-location chart */
 var clData=locs.map(function(l){var lr=rows.filter(function(r){return r.loc===l;}),totl=clVal(lr);return {l:l,vals:chcols.map(function(c){return clVal(lr.filter(function(r){return chanOf(r.menu)===c;}));}),tips:chcols.map(function(c){var v=clVal(lr.filter(function(r){return chanOf(r.menu)===c;}));return c+' · '+l+'||'+clF(v)+(totl?'||'+fP(v/totl,1)+' of location':'');})};});
 var clSeries=chcols.map(function(c){return {color:chanColor(c),label:c};});
 var clLeg='<div class="tr-leg" style="flex-wrap:wrap">'+clSeries.map(function(se){return '<span class="chd" style="font-size:10.5px;margin-right:6px"><i style="background:'+se.color+'"></i>'+esc(se.label)+'</span>';}).join('')+'</div>';
 var clChart='<div class="cc"><div class="cc-h"><h3>Channel mix by location</h3>'+tgl('clMetric',[['net','Net revenue'],['gross','Gross'],['qty','Qty']],clM)+'</div>'+clLeg+columns(clData,clF,{w:1280,h:260,pl:66,series:clSeries,stacked:1})+'</div>';
 var clRows=tree.map(function(c){var cr=rows.filter(function(r){return chanOf(r.menu)===c.cat;}),bl=group(cr,function(r){return r.loc;});var o={chan:c.cat,tot:clVal(cr)};locs.forEach(function(l){o[l]=bl.has(l)?clVal(bl.get(l)):0;});return o;});
 var clCols=[{k:'chan',l:'Channel',a:'l',w:160,f:function(r){return chanChip(r.chan);}},{k:'tot',l:'Total',f:function(r){return '<b>'+clF(r.tot)+'</b>';}}].concat(locs.map(function(l){return {k:l,l:esc(l),f:function(r){return r[l]?clF(r[l]):'—';}};}));
 var clTbl=tbl('chloc','Channel × location ('+clLbl+')',clCols,clRows,{def:{k:'tot',d:'desc'}});
 var tb=T('chTop','top');
 var per='<div class="lt-head"><div style="display:flex;align-items:center;gap:12px"><h3 style="font-size:14px;font-weight:700;text-transform:none;letter-spacing:0">'+(tb==='top'?'Top':'Bottom')+' items by channel</h3>'+tgl('chTop',[['top','Top'],['bottom','Bottom']],tb)+'</div></div><div class="gr22">'+tree.map(function(c){var cr=rows.filter(function(r){return chanOf(r.menu)===c.cat;}),it=Array.from(group(cr,function(r){return r.item+'||'+r.grp;})).map(function(e){return {l:iLabel(e[1][0].item,e[1][0].grp),v:sum(e[1],function(r){return r.n;}),c:chanColor(c.cat)};}).filter(function(x){return x.v>0;}).sort(function(a,b){return (tb==='top'?b.v-a.v:a.v-b.v)||String(a.l).localeCompare(String(b.l));}).slice(0,8);
  return '<div class="cc" style="border-top:3px solid '+chanColor(c.cat)+'"><h3>'+esc(c.cat)+' · '+(tb==='top'?'top':'bottom')+' items</h3>'+hbars(it,f$)+'</div>';}).join('')+'</div>';
 var cats=tree.map(function(c){return c.cat;});
 var items=Array.from(group(rows,function(r){return r.item+'||'+r.grp;})).map(function(e){var o={item:iLabel(e[1][0].item,e[1][0].grp),grp:e[1][0].grp,total:sum(e[1],function(r){return r.n;})};cats.forEach(function(k){o[k]=sum(e[1].filter(function(r){return chanOf(r.menu)===k;}),function(r){return r.n;});});return o;});
 var iCols=[{k:'item',l:'Item',a:'l',w:190,f:function(r){return esc(r.item);}},{k:'total',l:'Total',f:function(r){return '<b>'+f$(r.total)+'</b>';}}].concat(cats.map(function(k){return {k:k,l:'<span style="color:'+chanColor(k)+'">'+esc(k)+'</span>',f:function(r){return r[k]?f$(r[k]):'—';}};}));
 return lvlHead+cards+top+clChart+clTbl+per+tbl('chitem','Net revenue by item across all channels',iCols,items,{def:{k:'total',d:'desc'},sfn:function(r){return r.item+' '+r.grp;},max:250});
}
/* Channels — modifier level: modifiers by channel (dining option → channel), channel × location, top/bottom */
function vChanMods(head){
 if(!ensureMods())return head+modsLoading();
 var mrows=getMods();if(!mrows.length)return head+empty('No modifier data for '+esc(S.dr.text)+' with the selected filters.');
 var metric='picks',val=function(a){return sum(a,function(r){return r.q;});},fv=fN;
 var locs=META.locs.filter(function(l){return mrows.some(function(r){return r.loc===l;});});
 var byC=group(mrows,function(r){return chanOf(r.menu);}),chans=CHAN_ORDER.filter(function(c){return byC.has(c);}),tq=sum(mrows,function(r){return r.q;});
 var cards='<div class="loc-grid">'+chans.map(function(c){var a=byC.get(c),picks=sum(a,function(r){return r.q;});return '<div class="kc" style="border-left-color:'+chanColor(c)+'"><div class="kl">'+esc(c)+'</div><div class="kv" style="font-size:19px">'+fN(picks)+'</div><div class="ks">picks · '+fP(tq?picks/tq:0)+' mix</div></div>';}).join('')+'</div>';
 var clRows=chans.map(function(c){var cr=byC.get(c),bl=group(cr,function(r){return r.loc;});var o={chan:c,tot:val(cr)};locs.forEach(function(l){o[l]=bl.has(l)?val(bl.get(l)):0;});return o;});
 var clCols=[{k:'chan',l:'Channel',a:'l',w:160,f:function(r){return chanChip(r.chan);}},{k:'tot',l:'Total',f:function(r){return '<b>'+fv(r.tot)+'</b>';}}].concat(locs.map(function(l){return {k:l,l:esc(l),f:function(r){return r[l]?fv(r[l]):'—';}};}));
 var clTbl=tbl('chmloc','Channel × location (picks)',clCols,clRows,{def:{k:'tot',d:'desc'},fit:1});
 var clData=locs.map(function(l){var lr=mrows.filter(function(r){return r.loc===l;}),totl=val(lr);return {l:l,vals:chans.map(function(c){return val(lr.filter(function(r){return chanOf(r.menu)===c;}));}),tips:chans.map(function(c){var v=val(lr.filter(function(r){return chanOf(r.menu)===c;}));return c+' · '+l+'||'+fv(v)+(totl?'||'+fP(v/totl,1)+' of location':'');})};});
 var clSeries=chans.map(function(c){return {color:chanColor(c),label:c};});
 var clLeg='<div class="tr-leg" style="flex-wrap:wrap">'+clSeries.map(function(se){return '<span class="chd" style="font-size:10.5px;margin-right:6px"><i style="background:'+se.color+'"></i>'+esc(se.label)+'</span>';}).join('')+'</div>';
 var clChart='<div class="cc"><div class="cc-h"><h3>Channel mix by location</h3></div>'+clLeg+columns(clData,fv,{w:1280,h:260,pl:66,series:clSeries,stacked:1})+'</div>';
 var tb=T('chMTop','top');
 var per='<div class="lt-head"><div style="display:flex;align-items:center;gap:12px"><h3 style="font-size:14px;font-weight:700;text-transform:none;letter-spacing:0">'+(tb==='top'?'Top':'Bottom')+' modifiers by channel</h3>'+tgl('chMTop',[['top','Top'],['bottom','Bottom']],tb)+'</div></div><div class="gr22">'+chans.map(function(c){var cr=byC.get(c),it=Array.from(group(cr,function(r){return r.m+'||'+r.gn;})).map(function(e){return {l:e[1][0].m,v:sum(e[1],function(r){return r.q;}),c:chanColor(c)};}).filter(function(x){return x.v>0;}).sort(function(a,b){return (tb==='top'?b.v-a.v:a.v-b.v)||String(a.l).localeCompare(String(b.l));}).slice(0,8);
  return '<div class="cc" style="border-top:3px solid '+chanColor(c)+'"><h3>'+esc(c)+' · '+(tb==='top'?'top':'bottom')+' modifiers</h3>'+hbars(it,fN)+'</div>';}).join('')+'</div>';
 var mods=Array.from(group(mrows,function(r){return r.m+'||'+r.gn;})).map(function(e){var o={mod:e[1][0].m,grp:e[1][0].gn,total:val(e[1])};chans.forEach(function(c){o[c]=val(e[1].filter(function(r){return chanOf(r.menu)===c;}));});return o;});
 var mCols=[{k:'mod',l:'Modifier',a:'l',w:180,f:function(r){return esc(r.mod);}},{k:'grp',l:'Group',a:'l',w:130,f:function(r){return esc(r.grp);}},{k:'total',l:'Total',f:function(r){return '<b>'+fv(r.total)+'</b>';}}].concat(chans.map(function(c){return {k:c,l:'<span style="color:'+chanColor(c)+'">'+esc(c)+'</span>',f:function(r){return r[c]?fv(r[c]):'—';}};}));
 var mTbl=tbl('chmod','Modifier by channel (picks)',mCols,mods,{def:{k:'total',d:'desc'},sfn:function(r){return r.mod+' '+r.grp;},max:300,fit:1});
 return head+cards+clChart+clTbl+per+mTbl;
}

function vME(){
 var F=eff('meoverall'),all=getItems({ch:[],cat:[],loc:F.loc,real:false});if(!all.length)return empty('No items match the selected filters.');
 var sel=T('meCh','ALL'),catSel=null;
 if(String(sel).indexOf('cat:')===0){var cn=sel.slice(4),ms=META.menus.filter(function(m){return chanOf(m)===cn;});if(ms.length===1)sel=ms[0];else if(ms.length>1){catSel=cn;sel='CAT';}else sel='ALL';}
 if(sel!=='ALL'&&sel!=='BL'&&sel!=='CAT'&&META.menus.indexOf(sel)<0)sel='ALL';
 var mixF=T('meMix','all'),single=(sel!=='ALL'&&sel!=='BL'&&sel!=='CAT'),merged=(sel==='BL'||sel==='CAT');
 var rows=single?all.filter(function(r){return r.menu===sel;}):sel==='CAT'?all.filter(function(r){return chanOf(r.menu)===catSel;}):all;if(!rows.length)return empty('No items for the selected channel.');
 /* Overall = one row per item × menu (percentages vs ALL channels, High/Low flag inside the row's own menu);
    Blended / a channel category = one SKU per item added up across the menus in scope (everything vs that scope);
    a single menu = that menu only. */
 var keyf=sel==='ALL'?function(r){return r.item+'||'+r.menu+'||'+r.grp;}:merged?function(r){return r.item;}:function(r){return r.item+'||'+r.grp;};
 var scopeName=sel==='BL'?'Blended (all menus)':sel==='CAT'?catSel:single?sel:'';
 var groups=Array.from(group(rows,keyf)).map(function(e){var f=e[1][0],a=aggI(e[1]),sc='',pg=f.grp,more=null;
  if(merged){var gm={};e[1].forEach(function(r){gm[r.grp]=(gm[r.grp]||0)+r.n;});var gs=Object.keys(gm).sort(function(x,y){return gm[y]-gm[x];});pg=gs[0];e[1].forEach(function(r){if(!sc&&r.grp===pg&&r.sc)sc=r.sc;});if(gs.length>1)more=gs.slice(1).map(function(x){return x+' '+f$(gm[x]);});}
  else e[1].forEach(function(r){if(!sc&&r.sc)sc=r.sc;});
  return {item:f.item,grp:pg,sc:sc,menu:f.menu,q:a.q,g:a.g,n:a.n,more:more};});
 var Tq=sum(groups,function(x){return x.q;}),Tn=sum(groups,function(x){return x.n;}),catN={};groups.forEach(function(x){catN[x.grp]=(catN[x.grp]||0)+x.n;});
 var chQ={},chCnt={};if(sel==='ALL')groups.forEach(function(x){chQ[x.menu]=(chQ[x.menu]||0)+x.q;chCnt[x.menu]=(chCnt[x.menu]||0)+1;});
 groups.forEach(function(r){r.mix=Tq?r.q/Tq:0;r.sls=Tn?r.n/Tn:0;r.slsCat=catN[r.grp]?r.n/catN[r.grp]:0;r.ap=r.q?r.g/r.q:0;
  if(sel==='ALL'){var cm=chQ[r.menu]?r.q/chQ[r.menu]:0;r.hiMix=cm>=(1/chCnt[r.menu])*.7;}else r.hiMix=r.mix>=(1/groups.length)*.7;});
 var data=groups.filter(function(r){return mixF==='all'||(mixF==='hi'?r.hiMix:!r.hiMix);});
 var quad='<div class="me-quad-grid"><div class="mqc star"><div class="mql">Star</div><div class="mqn">—</div><div class="mqr">High margin · High mix</div></div><div class="mqc plow"><div class="mql">Plow Horse</div><div class="mqn">—</div><div class="mqr">Low margin · High mix</div></div><div class="mqc puzzle"><div class="mql">Puzzle</div><div class="mqn">—</div><div class="mqr">High margin · Low mix</div></div><div class="mqc dog"><div class="mql">Dog</div><div class="mqn">—</div><div class="mqr">Low margin · Low mix</div></div></div>';
 var base=single?'this menu ('+esc(sel)+')':sel==='CAT'?'the '+esc(catSel)+' channel (all its menus)':'all menus combined';
 var info=note('<b>Cost data isn’t connected yet.</b> Margin, COGS % and the Star / Plow Horse / Puzzle / Dog classification populate once item costs are added. '+(sel==='ALL'?'<b>Overall</b> lists every item once per menu it sells in; % Menu Mix, Sls % and Sls % Category are measured against all menus combined, while the Menu Mix High/Low flag compares the item with the other items of its own menu.':sel==='BL'?'<b>Blended</b> shows every item as one SKU, added up across every menu it sells in, with the blended average price (gross ÷ qty). An item Toast lists under more than one menu group is filed under the group where it sells most (hover the +N to see the others). All percentages are measured against all menus combined.':sel==='CAT'?'<b>'+esc(catSel)+'</b> channel: every item as one SKU, added up across its menus ('+META.menus.filter(function(m){return chanOf(m)===catSel;}).map(esc).join(', ')+'). All percentages and the Menu Mix High/Low flag are measured within this channel.':'<b>'+esc(sel)+'</b> only: all percentages and the Menu Mix High/Low flag are measured within this menu.'));
 var cols=[{k:'item',l:'Item Name',a:'l',w:190,f:function(r){return esc(r.item);}}].concat(sel==='ALL'?[{k:'menu',l:'Menu',a:'l',w:190,f:function(r){return chip(r.menu);}}]:[]).concat([
  {k:'ap',l:'Avg Price',f:function(r){return f$2(r.ap);},t:merged?'Blended price: gross ÷ qty across the menus in scope':'Gross ÷ Qty'},{k:'ac',l:'Avg Cost',v:function(){return 0;},f:function(){return BLANK;}},{k:'mg',l:'Margin',v:function(){return 0;},f:function(){return BLANK;}},
  {k:'q',l:'Quantity',f:function(r){return fN(r.q);}},{k:'tc',l:'Total Cost',v:function(){return 0;},f:function(){return BLANK;}},{k:'n',l:'Net Sales',f:function(r){return f$(r.n);}},{k:'tm',l:'Total Margin',v:function(){return 0;},f:function(){return BLANK;}},
  {k:'cg',l:'COGS %',v:function(){return 0;},f:function(){return BLANK;}},{k:'pm',l:'% Margin',v:function(){return 0;},f:function(){return BLANK;}},{k:'mix',l:'% Menu Mix',f:function(r){return fP(r.mix,2);},t:'Item qty ÷ total qty of '+base},
  {k:'ml',l:'Margin Level',v:function(){return 0;},f:function(){return BLANK;}},{k:'mm',l:'Menu Mix',v:function(r){return r.hiMix?1:0;},f:function(r){return '<span class="mb '+(r.hiMix?'mb-hi':'mb-lo')+'">'+(r.hiMix?'High':'Low')+'</span>';},t:sel==='ALL'?'High if the item’s share of its own menu’s qty ≥ (1 ÷ items in that menu) × 0.7':'High if % Menu Mix ≥ (1 ÷ item count) × 0.7'},
  {k:'cl',l:'Classification',v:function(){return 0;},f:function(){return '<span class="mb mb-pend">Pending cost</span>';}},{k:'grp',l:'Category (Menu Group)',a:'l',f:function(r){return esc(r.grp)+(r.more?' <span class="mb mb-pend" style="font-size:8px" data-tip="'+esc(r.item+' is also sold in||'+r.more.join('||'))+'">+'+r.more.length+'</span>':'');}},{k:'sc',l:'Sales Category',a:'l',f:function(r){return esc(r.sc||'—');}},
  {k:'sls',l:'Sls %',f:function(r){return fP(r.sls,1);},t:'Item net sales ÷ total net sales of '+base+' ('+f$(Tn)+')'},{k:'slsCat',l:'Sls % Category',f:function(r){return fP(r.slsCat,1);},t:'Item net sales ÷ net sales of its menu group across '+base}]);
 var extra='<select class="fb-sel" style="height:26px" data-a="sel" data-k="meMix"><option value="all"'+(mixF==='all'?' selected':'')+'>Menu Mix: All</option><option value="hi"'+(mixF==='hi'?' selected':'')+'>Menu Mix: High</option><option value="lo"'+(mixF==='lo'?' selected':'')+'>Menu Mix: Low</option></select>';
 var title=sel==='ALL'?'Overall · item × channel':sel==='BL'?'Blended · all menus':sel==='CAT'?esc(catSel)+' · all its menus':esc(sel);
 return quad+info+tbl('me','Menu engineering · '+title,cols,data,{def:{k:'q',d:'desc'},sfn:function(r){return r.item+' '+r.grp+' '+(r.sc||'')+' '+(sel==='ALL'?r.menu:'');},extra:extra,max:300});
}

/* ───────── modifier views (Toast modifier exports, 7 locations) ───────── */
function modGroups(rows){var out=new Map();rows.forEach(function(r){var p=out.get(r.p);if(!p){p=new Map();out.set(r.p,p);}var g=p.get(r.gn);if(!g){g=new Map();p.set(r.gn,g);}var m=g.get(r.m)||{q:0,rev:0};m.q+=r.q;m.rev+=r.rev;g.set(r.m,m);});return out;}
function locSel(){return S.loc.length?S.loc:META.locs;}
function slItem(p){var n=PNAME[p];if(!n)return aggI([]);var L=locSel();return aggI(DATA.items.filter(function(r){return r.item===n&&L.indexOf(r.loc)>=0;}));}
function pq(ctx,p){return ctx.q[p]||0;}
function pqTxt(ctx,p){return (ctx.est[p]?'≈ ':'')+fN(pq(ctx,p));}
function modNote(extra){return note('<b>Modifier detail:</b> Toast modifier data for '+META.locs.length+' locations, '+esc(S.dr.label)+'. Voided modifier lines are excluded. Option-group names are Toast’s, with the “Choose:” / “Add:” prefixes (and the “Chooose:” typo) folded together. <b>Quantities sold</b> come from the modifier export itself where an option group is chosen exactly once per item (e.g. Rice Bowl → “Rice”; it ties exactly to the item sheets in every location), otherwise from the item sheets (marked ≈ when a date or dining filter scales it). '+(extra||''));}
function noMods(){return empty('No modifier data loaded. Upload Toast modifier-detail CSVs (see Upload CSV).');}
function emptyMods(){return DATA.mods.length?empty('No modifier lines for '+esc(S.dr.text)+' with the selected filters. The modifier data covers '+esc(dtext(META.min,META.max))+'.'):noMods();}

function emGroupOf(p){var n=PNAME[p],g='Other';if(n){var m={},best=-1;DATA.items.forEach(function(r){if(r.item===n)m[r.grp]=(m[r.grp]||0)+r.q;});Object.keys(m).forEach(function(x){if(m[x]>best){best=m[x];g=x;}});}return g;}
function emGroups(ctx){ /* sidebar: modifier parents grouped by Toast menu group (the group where the item sells most) */
 var parents=new Set();ctx.rows.forEach(function(r){parents.add(r.p);});
 var q=(S.q.em||'').toLowerCase().trim(),catS=S.emCatS||[],by=new Map();
 parents.forEach(function(p){var g=emGroupOf(p);
  if(catS.length&&catS.indexOf(g)<0)return;if(q&&p.toLowerCase().indexOf(q)<0)return;if(!by.has(g))by.set(g,[]);by.get(g).push({p:p,sold:ctx.q[p]||0,est:!!ctx.est[p],exact:!!ANCH[p],na:!PNAME[p]});});
 return Array.from(by.entries()).map(function(e){e[1].sort(function(a,b){return b.sold-a.sold;});return {g:e[0],items:e[1],sold:sum(e[1],function(x){return x.sold;})};}).sort(function(a,b){return b.sold-a.sold;});
}
function vEntree(){
 if(!ensureMods())return modsLoading();
 if(!S.emCatS)S.emCatS=[];if(!S.emTypeS)S.emTypeS=[];
 var ctx=modCtx();if(!ctx.rows.length)return emptyMods();
 var groups=emGroups(ctx),all=new Set();ctx.rows.forEach(function(r){all.add(r.p);});
 var sel=S.em.sel,selList=Array.from(all).filter(function(p){return sel[p];}).sort(function(a,b){return (ctx.q[b]||0)-(ctx.q[a]||0);}),mode=T('emMode','pct');
 var cats=Array.from(new Set(Array.from(all).map(emGroupOf))).sort();
 /* ── sidebar ── */
 var side='<div class="em-side"><div class="em-h"><div><b>Entree Mix</b><span>'+fN(all.size)+' items · '+selList.length+' selected</span></div>'+(selList.length?'<button class="em-clear" data-a="emclear">Clear</button>':'')+'</div><input class="srch" style="width:100%;margin-bottom:8px" id="q_em" data-a="q" data-t="em" placeholder="Search items…" value="'+esc(S.q.em||'')+'">'+
  '<div class="em-ddw">'+dropdown('emCatDd',esc(sumLbl(S.emCatS,'All categories','categories')),232,checkList('emCatS','All categories',cats),240)+'</div><div class="em-list">'+
  groups.map(function(G,gi){var collapsed=S.em.col[G.g],nsel=G.items.filter(function(x){return sel[x.p];}).length;
   return '<div class="em-grp" style="border-left:3px solid var(--ac)"><span class="arr" data-a="emcol" data-k="'+esc(G.g)+'">'+(collapsed?'▶':'▼')+'</span><input type="checkbox" data-a="emgrp" data-k="'+esc(G.g)+'"'+(nsel===G.items.length&&nsel>0?' checked':'')+(nsel>0&&nsel<G.items.length?' data-part="1"':'')+'><b>'+esc(G.g)+'</b><span class="bdg" style="background:var(--s2);color:var(--mu)">'+G.items.length+'</span></div>'+
   (collapsed?'':G.items.map(function(x){return '<div class="em-it'+(sel[x.p]?' on':'')+'" data-a="emsel" data-k="'+esc(x.p)+'"><input type="checkbox"'+(sel[x.p]?' checked':'')+' tabindex="-1"><div class="em-nm"><div class="nm" data-tip="'+esc(x.p)+'">'+esc(x.p)+'</div><div class="sb">'+(x.na?'not on item sheets':(x.est?'≈ ':'')+fN(x.sold)+' sold')+'</div></div><i class="dot" style="background:'+(x.exact?'#10b981':'#f59e0b')+'" data-tip="'+(x.na?'Not found on the Toast item sheets||Units sold are not available for this item':x.exact?'Units sold counted exactly from the modifier export||Ties to the Toast item sheet':'Units sold taken from the Toast item sheet||No option group is chosen exactly once per item')+'"></i></div>';}).join(''));}).join('')+(groups.length?'':'<div class="ks" style="padding:14px">No items match.</div>')+'</div></div>';
 /* ── main panel: one purple card per selected item, modifier types listed underneath ── */
 var main='';
 if(!selList.length){
  main='<div class="em-main"><div class="em-tb"><div class="em-note">Select items in the sidebar to compare their modifiers</div></div><div class="em-empty"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#b9a7f2" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M2 4v6a2 2 0 0 0 2 2M4 4v18M22 4c-2 1-3 3-3 6v3h3v9"/></svg><h3>Select items to analyse</h3><p>Pick items from the sidebar — click individual rows or use the group checkbox to select all in a category.</p></div></div>';
 } else {
  var srMode=T('emSR','hide');
  var perItem={},typeSet=new Set(),overall=new Map();
  ctx.rows.forEach(function(r){if(!sel[r.p])return;var sr=(!r.g||r.g==='(No option group)');if(srMode==='hide'&&sr)return;if(srMode==='only'&&!sr)return;
   var it=perItem[r.p]||(perItem[r.p]=new Map()),g=it.get(r.gn);if(!g){g=new Map();it.set(r.gn,g);}g.set(r.m,(g.get(r.m)||0)+r.q);typeSet.add(r.gn);
   var og=overall.get(r.gn);if(!og){og=new Map();overall.set(r.gn,og);}og.set(r.m,(og.get(r.m)||0)+r.q);});
  var typeList=Array.from(typeSet).sort(),typeSel=S.emTypeS;
  var srTgl=tgl('emSR',[['hide','Hide'],['incl','Show'],['only','Only']],srMode);
  var tb='<div class="em-tb"><span class="em-note">Modifier type</span>'+dropdown('emTypeDd',esc(sumLbl(typeSel,'All types','types')),150,checkList('emTypeS','All types',typeList),230)+tgl('emMode',[['pct','%'],['cnt','#']],mode)+'<span class="em-note" style="margin-left:6px">Special requests</span>'+srTgl+'<span class="em-note" style="margin-left:auto;font-size:12px">'+selList.length+' item'+(selList.length>1?'s':'')+' selected</span></div>';
  var dnLabel=chanLabel('ch',S.ch,'All channels','channels');
  var emCard=function(key,typesMap,sold,title,ov){
   var types=Array.from(typesMap||[]).map(function(e){return {t:e[0],m:e[1],tot:sum(Array.from(e[1].values()),function(v){return v;})};}).sort(function(a,b){return b.tot-a.tot;}),picks=sum(types,function(x){return x.tot;}),collapsed=S.em.cc&&S.em.cc[key];
   var soldTxt=ov?fN(sold)+' units':(PNAME[key]?(ctx.est[key]?'≈ ':'')+fN(sold)+' sold':'not on item sheets');
   var head='<div class="emc-h'+(ov?' emc-ov':'')+'"><div><div class="t">'+esc(title)+'</div><div class="s"><b>'+soldTxt+'</b> · <b>'+fN(types.length)+'</b> modifier types · <b>'+fN(picks)+'</b> picks</div></div><div class="x"><button data-a="emcc" data-k="'+esc(key)+'" title="Collapse / expand">'+(collapsed?'▶':'▼')+'</button>'+(ov?'':'<button data-a="emsel" data-k="'+esc(key)+'" title="Remove">✕</button>')+'</div></div>';
   if(collapsed)return '<div class="emc'+(ov?' emc-ovw':'')+'">'+head+'</div>';
   var secs=types.filter(function(x){return !S.emTypeS.length||S.emTypeS.indexOf(x.t)>=0;}).map(function(x){
    var mods=Array.from(x.m.entries()).sort(function(a,b){return b[1]-a[1];}),cap=40,shown=mods.slice(0,cap);
    var rowsH=shown.map(function(e){var sh=x.tot?e[1]/x.tot:0;return '<tr data-tip="'+esc(e[0]+'||'+title+' · '+x.t+'||'+fN(e[1])+' picks · '+fP(sh,1)+' of the '+fN(x.tot)+' picks in this type'+(sold?'||'+fP(e[1]/sold,1)+' per unit ('+fN(sold)+')':''))+'"><td class="nm">'+esc(e[0])+'</td><td>'+(mode==='pct'?fP(sh,2):fN(e[1]))+'</td><td class="mut">—</td><td class="mut">—</td></tr>';}).join('');
    return '<div class="emc-sec"><div class="st">'+esc(x.t)+'<span>'+fN(x.tot)+' picks'+(mods.length>cap?' · top '+cap+' of '+fN(mods.length)+' options':'')+'</span></div><table class="emt"><colgroup><col><col style="width:150px"><col style="width:130px"><col style="width:130px"></colgroup><thead><tr><th>Modifier</th><th>'+(mode==='pct'?'Qty %':'Qty')+'</th><th>Cost %</th><th>Unit cost</th></tr></thead><tbody>'+rowsH+'</tbody></table></div>';}).join('');
   return '<div class="emc'+(ov?' emc-ovw':'')+'">'+head+'<div class="emc-b"><span class="emc-tag">'+esc(dnLabel)+'</span><span class="ks" style="display:inline;margin-left:10px;font-size:12px">'+soldTxt+'</span>'+secs+'</div></div>';};
  var cards='';
  if(selList.length>1)cards+=emCard('__overall__',overall,sum(selList,function(p){return ctx.q[p]||0;}),'Overall · '+selList.length+' items combined',true);
  cards+=selList.map(function(p){return emCard(p,perItem[p],ctx.q[p]||0,p,false);}).join('');
  main='<div class="em-main">'+tb+cards+'<div class="ks" style="margin-top:6px">Voided lines excluded · Special requests = modifiers with no option group · “sold” ties to the Toast item sheets (≈ = estimated when the date/dining filter narrows the month) · cost columns fill in once costs are connected.</div></div>';
 }
 return '<div class="em-wrap">'+side+main+'</div>';
}

/* ───────── Payment Source (Toast Payments report) ───────── */
var TYC={'Credit':'#6d4bd0','Cash':'#8b8694','Other':'#c3b0f2'};
function tyColor(t){return TYC[t]||PAL[Object.keys(TYC).length%PAL.length];}
function vPayment(){
 if(!DATA.pays.length)return vPaymentPH();
 var rows=getPays();if(!rows.length)return empty('No payments for '+esc(S.dr.text)+' with the selected locations. The payments data covers '+esc(dtext(META.min,META.max))+'.');
 var sm=function(a,f){return sum(a,f);};
 var pay=rows.filter(function(r){return r.kind===0;}),refs=rows.filter(function(r){return r.kind===1;});
 var cnt=sm(pay,function(r){return r.n;}),amt=sm(pay,function(r){return r.a;}),tip=sm(pay,function(r){return r.t;}),fee=sm(pay,function(r){return r.fee;});
 var refund=sm(refs,function(r){return r.ref;}),refN=sm(refs,function(r){return r.n;});
 var card=pay.filter(function(r){return r.grp==='Card';}),alt=pay.filter(function(r){return r.grp==='Alt';});
 var cardRev=sm(card,function(r){return r.a+r.t;}),altRev=sm(alt,function(r){return r.a+r.t;});
 var cardN=sm(card,function(r){return r.n;}),altN=sm(alt,function(r){return r.n;}),cardAmt=sm(card,function(r){return r.a;}),altAmt=sm(alt,function(r){return r.a;});
 var gross=amt+tip,payout=cardRev-refund-fee,net=gross-fee-refund,cardNet=cardRev-fee-refund,avgTicket=cnt?amt/cnt:0;
 /* ── Payout overview (card settlement, by sales day) ── */
 var payoutRow='<div class="cc"><div class="cc-h"><h3>Payout overview</h3><span class="ks" style="margin:0">Card settlement, by sales day · '+esc(S.dr.text)+'</span></div><div class="krow k6" style="margin:0">'
  +kpi('p','Card Payments',f$(cardRev),'captured card, incl. tip')
  +kpi('r','Refunds','−'+f$(refund),fN(refN)+' refund'+(refN===1?'':'s'))
  +kpi('o','Fees','−'+f$(fee),'processing fees')
  +kpi('o','Withholdings',f$2(0),'none')
  +kpi('o','Chargebacks','—','not in Toast feed')
  +kpi('g','Payout Total',f$(payout),'payments − refunds − fees')
  +'</div></div>';
 /* ── KPI grid ── */
 var k='<div class="krow">'
  +kpi('a','Total Payments',fN(cnt),'captured transactions')
  +kpi('p','Card',f$(cardRev),fP(gross?cardRev/gross:0)+' · avg '+f$2(cardN?cardAmt/cardN:0))
  +kpi('b','Alt Payments',f$(altRev),fP(gross?altRev/gross:0)+' · avg '+f$2(altN?altAmt/altN:0))
  +kpi('g','Avg Ticket',f$2(avgTicket),'amount ÷ payments')
  +kpi('t','Amount + Tip',f$(gross),'gross charged, tip included')
  +'</div><div class="krow">'
  +kpi('o','Fees',f$(fee),'processing fees')
  +kpi('o','Withholdings',f$2(0),'none')
  +kpi('r','Refunded',f$(refund),fN(refN)+' refund'+(refN===1?'':'s'))
  +kpi('g','Net',f$(net),'amt+tip − fees − refunds')
  +kpi('p','Card Net',f$(cardNet),'card: amt+tip − fees − refunds')
  +'</div>';
 /* ── charts ── */
 var split=[{l:'Card',v:cardRev,c:'#7c3aed'},{l:'Alt Payment',v:altRev,c:'#55505f'}];
 var bySrc=Array.from(group(pay,function(r){return canonSrc(r.src);})).map(function(e){return {l:e[0],v:sm(e[1],function(r){return r.a+r.t;}),c:e[1][0].grp==='Card'?'#7c3aed':'#55505f'};}).filter(function(x){return x.v>0;}).sort(function(a,b){return b.v-a.v;});
 var byLoc=Array.from(group(pay,function(r){return r.loc;})).map(function(e){var c=sm(e[1].filter(function(r){return r.grp==='Card';}),function(r){return r.a+r.t;}),al=sm(e[1].filter(function(r){return r.grp==='Alt';}),function(r){return r.a+r.t;});return {l:e[0],vals:[c,al],tips:['Card · '+e[0]+'||'+f$(c),'Alt Payment · '+e[0]+'||'+f$(al)]};}).sort(function(a,b){return (b.vals[0]+b.vals[1])-(a.vals[0]+a.vals[1]);});
 var charts='<div class="gr22"><div class="cc"><h3>Card vs Alt payment split</h3>'+donut(split,f$)+'</div><div class="cc"><h3>Top 10 sources by revenue</h3>'+hbars(bySrc.slice(0,10),f$)+'</div></div>'
  +'<div class="cc"><div class="cc-h"><h3>Revenue by location</h3></div><div class="tr-leg" style="flex-wrap:wrap"><span class="chd" style="margin-right:8px"><i style="background:#7c3aed"></i>Card</span><span class="chd"><i style="background:#55505f"></i>Alt Payment</span></div>'+columns(byLoc,f$,{w:1280,h:230,pl:66,series:[{color:'#7c3aed',label:'Card'},{color:'#55505f',label:'Alt Payment'}],stacked:1})+'</div>';
 /* ── sources table ── */
 var srcRows=Array.from(group(pay,function(r){return canonSrc(r.src);})).map(function(e){var rev=sm(e[1],function(r){return r.a+r.t;}),n=sm(e[1],function(r){return r.n;});return {src:e[0],type:e[1][0].grp,n:n,rev:rev,avg:n?rev/n:0};});
 var tot=sm(srcRows,function(r){return r.rev;});
 var sCols=[{k:'src',l:'Source',a:'l',w:200,f:function(r){return '<span class="chd"><i style="background:'+(r.type==='Card'?'#7c3aed':'#55505f')+'"></i>'+esc(r.src)+'</span>';}},{k:'type',l:'Type',a:'l',w:130,f:function(r){return '<span class="bdg" style="background:'+(r.type==='Card'?'#ede9fe;color:#6d28d9':'#eceaef;color:#55505f')+'">'+(r.type==='Card'?'Card':'Alt Payment')+'</span>';}},{k:'n',l:'Transactions',f:function(r){return fN(r.n);}},{k:'rev',l:'Revenue',f:function(r){return '<b>'+f$(r.rev)+'</b>';}},{k:'avg',l:'Avg Ticket',f:function(r){return f$2(r.avg);}},{k:'mix',l:'Revenue Mix (%)',v:function(r){return r.rev;},f:function(r){return fP(tot?r.rev/tot:0);}}];
 var nb=note('<b>Payout</b> = captured card payments (incl. tip) − refunds − fees. Chargebacks and withholdings are not in the Toast Payments feed (chargebacks shown as —, withholdings $0). Refunds are attributed to the day they were processed. Numbers tie to Toast’s payout within ~0.3% (settlement-timing differences at the period edges).');
 return payoutRow+k+charts+nb+tbl('paysrc','Payment sources · '+fN(srcRows.length)+' shown',sCols,srcRows,{def:{k:'rev',d:'desc'},sfn:function(r){return r.src;},max:200});
}

function vPaymentPH(){
 var L=['Total Payments','Refunded','Card','Alt Payments','Avg Ticket'],L2=['Amount + Tip','Fees','Withholdings','Net','Card Net'];
 var k='<div class="krow">'+L.map(function(l){return kpi('a',l,BLANK,'Awaiting payments export');}).join('')+'</div><div class="krow">'+L2.map(function(l){return kpi('t',l,BLANK,'');}).join('')+'</div>';
 var cols=['Source','Type','Transactions','Revenue','Avg Ticket','Revenue Mix (%)'];
 return note('<b>Awaiting export.</b> The current Toast exports have no payment data. Needs the Toast <b>Payments</b> report (by location and date) to populate this tab.')+k+'<div class="gr22">'+ph('Card vs Alt payment split','Awaiting payments export.')+ph('Top 10 sources by revenue','Awaiting payments export.')+'</div>'+ph('Revenue by location','Awaiting payments export.')+
  '<div class="tw"><div class="th2"><h3>Payment sources</h3></div><div class="tscroll"><table><thead><tr>'+cols.map(function(c,i){return '<th class="'+(i?'':'l')+'">'+c+'</th>';}).join('')+'</tr></thead><tbody><tr><td class="l" colspan="6" style="color:var(--muted);padding:20px">No payments data in this export.</td></tr></tbody></table></div></div>';
}

/* ───────── Analytics: attachment rate (Toast Item Selection Details) ───────── */
function aggA(a){var o={n:sum(a,function(r){return r.n;}),dr:sum(a,function(r){return r.dr;}),sd:sum(a,function(r){return r.sd;}),sw:sum(a,function(r){return r.sw;}),any:sum(a,function(r){return r.any;}),na:sum(a,function(r){return r.na||0;})};o.rd=o.n?o.dr/o.n:0;o.rs=o.n?o.sd/o.n:0;o.rw=o.n?o.sw/o.n:0;o.ra=o.n?o.na/o.n:0;return o;}
function rtag(v){return '<span class="rate-tag '+(v>=.45?'rh':v>=.35?'rm':'rl')+'">'+fP(v,1)+'</span>';}
/* prior comparable window = same length immediately before the selected range (full=true only if it fits inside the loaded data) */
function priorRange(dr){var len=diffDays(dr.start,dr.end)+1,pe=addDays(dr.start,-1),ps=addDays(pe,-(len-1));return {start:ps,end:pe,full:!META.min||ps>=META.min};}
/* ▲/▼ vs-prior badge. o.pp → percentage-point delta (for rates); o.inv → down is good */
function dBadge(cur,prev,o){o=o||{};if(prev==null||!isFinite(prev)||(!o.pp&&prev===0))return '';var up,lbl;if(o.pp){var diff=cur-prev;if(Math.abs(diff)<0.00005)return '';up=diff>0;lbl=(up?'▲':'▼')+' '+(Math.abs(diff)*100).toFixed(1)+'pp';}else{var dp=(cur-prev)/Math.abs(prev);if(Math.abs(dp)<0.0005)return '';up=dp>0;lbl=(up?'▲':'▼')+' '+fP(Math.abs(dp),1);}var good=o.inv?!up:up,col=good?'#10b981':'#ef4444';return ' <span style="color:'+col+';font-weight:700;font-size:10px;white-space:nowrap" title="vs prior '+esc(diffDays(S.dr.start,S.dr.end)+1)+' days">'+lbl+'</span>';}
var PLAT_LABELS=[['all','All channels'],['inhouse','In-House'],['digital','App & Web'],['3pd','3PD'],['catering','Catering']];
function platOf(chan){return chan==='In-store'?'inhouse':chan==='App & Website'?'digital':(chan==='Delivery'||chan==='3PD Catering')?'3pd':chan==='Catering'?'catering':'other';}
function weekSub(k){if(k.charAt(0)==='F'){var r=weekRange(k);return dShort(r[0])+'–'+(r[0].slice(5,7)===r[1].slice(5,7)?(+r[1].slice(8,10)):dShort(r[1]));}var p=k.split('-'),y=p[0],m=p[1],w=+p[2],s=(w-1)*7+1,e=w===4?+monthEnd(+y,+m).slice(8,10):w*7;return MON[+m-1]+' '+s+'–'+e;}
/* Analytics — Item Mix: each item's qty sold as an item vs as a modifier (e.g. a "make it a meal" pick), combined */
function attItemMix(F){
 var mt=T('mixType','Entree'),roleKey={Entree:'main',Drink:'drink',Side:'side',Sweet:'sweet'}[mt]||'main';
 var R=DATA.att.roles||{},groups=R[roleKey]||[];
 var plat=T('attMixPlat','all'),platOK=function(ch){return plat==='all'||platOf(ch)===plat;};
 var byName={};
 getItems(F).forEach(function(r){if(groups.indexOf(r.grp)<0)return;if(!platOK(chanOf(r.menu)))return;var o=byName[r.item]||(byName[r.item]={name:r.item,grp:r.grp,asItem:0,asMod:0,rev:0});o.asItem+=r.q;o.rev+=r.n;});
 var rows=Object.keys(byName).map(function(nm){var o=byName[nm];o.total=o.asItem;return o;}).filter(function(o){return o.total>0;});
 var totQ=sum(rows,function(o){return o.total;}),totR=sum(rows,function(o){return o.rev;}),top=rows.slice().sort(function(a,b){return b.total-a.total;})[0];
 /* vs-prior deltas on the two totals */
 var pr=priorRange(S.dr),pQ=null,pR=null;
 if(pr.full){pQ=0;pR=0;var nmSet={};Object.keys(byName).forEach(function(n){nmSet[n]=1;});
  DATA.items.forEach(function(r){if(!r.d||r.d<pr.start||r.d>pr.end)return;if(groups.indexOf(r.grp)<0)return;if(F.loc.length&&F.loc.indexOf(r.loc)<0)return;if(F.ch.length&&F.ch.indexOf(r.menu)<0)return;if(F.cat.length&&F.cat.indexOf(r.grp)<0)return;if(!platOK(chanOf(r.menu)))return;pQ+=r.q;pR+=r.n;});
  }
 var kpis='<div class="krow k4">'+kpi('a','Total '+mt+' Qty',fN(totQ),'items only'+dBadge(totQ,pQ))+kpi('g','Total Revenue',f$(totR),'net revenue'+dBadge(totR,pR))+kpi('p','Top '+mt,top?esc(top.name):'—',top?fN(top.total)+' qty':'No data',null,true)+kpi('b','Distinct Items',fN(rows.length),'unique '+mt.toLowerCase()+' names in scope')+'</div>';
 var sel='<select class="fb-sel" data-a="sel" data-k="mixType">'+['Entree','Drink','Side','Sweet'].map(function(t){return '<option value="'+t+'"'+(mt===t?' selected':'')+'>'+t+'</option>';}).join('')+'</select>'+tgl('attMixPlat',PLAT_LABELS,plat);
 return '<div class="lt-head" style="margin:16px 2px 10px"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h3 style="font-size:14px;font-weight:700;text-transform:none;letter-spacing:0">Item mix · items only</h3>'+sel+'</div></div>'+kpis;
}
function csvAttBreak(){
 var F=eff('attachment'),ci=getAtt('c',F),ii=getAtt('i',F),by=T('attBy','item');
 var src;
 if(by==='item')src=Array.from(group(ii,function(r){return r.item+'||'+r.grp;})).map(function(e){var a=aggA(e[1]);a.name=iLabel(e[1][0].item,e[1][0].grp);return a;});
 else if(by==='channel')src=Array.from(group(ci,function(r){return chanOf(r.menu);})).map(function(e){var a=aggA(e[1]);a.name=e[0];return a;});
 else if(by==='menu')src=Array.from(group(ci,function(r){return r.menu;})).map(function(e){var a=aggA(e[1]);a.name=e[0];return a;});
 else if(by==='overall'){var o=aggA(ci);o.name='All main checks';src=[o];}
 else src=Array.from(group(ci,function(r){return r.loc;})).map(function(e){var a=aggA(e[1]);a.name=e[0];return a;});
 src.sort(function(a,b){return b.n-a.n;});
 var lbl=by==='item'?'Main Item':by==='channel'?'Channel':by==='menu'?'Menu':by==='overall'?'Scope':'Location';
 csvDownload('gyro_attachment_breakdown_'+by+'_'+S.dr.start+'_'+S.dr.end+'.csv',[lbl,'Main Checks','Drink %','Side %','Sweet %','Overall Rate'],src.map(function(r){return [r.name,r.n,fP(r.rd,1),fP(r.rs,1),fP(r.rw,1),fP(r.ra,1)];}));
}
function csvAttMix(){
 var mt=T('mixType','Entree'),roleKey={Entree:'main',Drink:'drink',Side:'side',Sweet:'sweet'}[mt]||'main',R=DATA.att.roles||{},groups=R[roleKey]||[],F=eff('attachment');
 var plat=T('attMixPlat','all'),platOK=function(ch){return plat==='all'||platOf(ch)===plat;};
 var byName={};getItems(F).forEach(function(r){if(groups.indexOf(r.grp)<0)return;if(!platOK(chanOf(r.menu)))return;var o=byName[r.item]||(byName[r.item]={name:r.item,grp:r.grp,asItem:0,asMod:0,rev:0});o.asItem+=r.q;o.rev+=r.n;});
 var rows=Object.keys(byName).map(function(nm){var o=byName[nm];o.total=o.asItem;return o;}).filter(function(o){return o.total>0;}).sort(function(a,b){return b.total-a.total;});
 var totQ=sum(rows,function(o){return o.total;}),totR=sum(rows,function(o){return o.rev;});
 csvDownload('gyro_'+mt.toLowerCase()+'_item_mix_'+S.dr.start+'_'+S.dr.end+'.csv',['Item','Menu Group','Qty','% of Qty','Revenue','% of Rev'],rows.map(function(r){return [r.name,r.grp,r.total,fP(totQ?r.total/totQ:0,1),r.rev.toFixed(2),fP(totR?r.rev/totR:0,1)];}));
}
/* Analytics — attachment rate by item (any category) × location. Rate = main-checks containing the item ÷ main checks.
   Ignores the location filter so stores stay comparable; respects channel + date. */
function attPivot(F){
 var d=S.dr,inR=function(r){return r.d>=d.start&&r.d<=d.end&&(!F.ch.length||F.ch.indexOf(r.menu)>=0);};
 var xi=(DATA.att.x||[]).filter(inR);if(!xi.length)return '';
 var dim=T('attPivDim','loc'),keyOf=dim==='chan'?function(r){return chanOf(r.menu);}:function(r){return r.loc;};
 var ci=DATA.att.c.filter(inR),mckDim={},mckTot=0;ci.forEach(function(r){var k=keyOf(r);mckDim[k]=(mckDim[k]||0)+r.n;mckTot+=r.n;});
 var dimKeys=dim==='ov'?[]:(dim==='chan'?CHAN_ORDER.filter(function(c){return mckDim[c];}):META.locs.filter(function(l){return mckDim[l];}));
 var catF=T('attPivCat','all'),mode=T('attPivMode','pct'),topN=T('attPivTopN','all');
 var items={};xi.forEach(function(r){if(catF!=='all'&&r.cat!==catF)return;var k=r.item+'||'+r.cat,o=items[k]||(items[k]={item:r.item,cat:r.cat,dv:{},tot:0});o.dv[keyOf(r)]=(o.dv[keyOf(r)]||0)+r.checks;o.tot+=r.checks;});
 var rows=Object.keys(items).map(function(k){return items[k];}).filter(function(o){return o.tot>0;});
 if(topN!=='all')rows=rows.slice().sort(function(a,b){return b.tot-a.tot;}).slice(0,+topN);
 var cellV=function(o,l){var c=o.dv[l]||0;return mode==='pct'?(mckDim[l]?c/mckDim[l]:0):c;},ovV=function(o){return mode==='pct'?(mckTot?o.tot/mckTot:0):o.tot;},fmtC=function(v){return v?(mode==='pct'?fP(v,2):fN(v)):'—';};
 var CATC={Main:'#6d4bd0',Drink:'#9f7cef',Side:'#8b8694',Sweet:'#c3b0f2'};
 var cols=[{k:'cat',l:'Category',a:'l',w:86,f:function(r){var c=CATC[r.cat]||'var(--mu)';return '<span class="mb" style="background:'+c+'22;color:'+c+'">'+esc(r.cat)+'</span>';}},
  {k:'item',l:'Item / Modifier',a:'l',w:200,f:function(r){return esc(r.item);}},
  {k:'ov',l:'Overall Rate',v:function(r){return ovV(r);},f:function(r){return '<b>'+fmtC(ovV(r))+'</b>';}}]
  .concat(dimKeys.map(function(l){return {k:l,l:dim==='chan'?chanChip(l):esc(l),v:function(r){return cellV(r,l);},f:function(r){var vals=dimKeys.map(function(x){return cellV(r,x);}),mx=Math.max.apply(null,vals.concat([0])),v=cellV(r,l),s=fmtC(v);return (v&&v===mx)?'<b>'+s+'</b>':s;}};}));
 var dimSel=tgl('attPivDim',[['loc','By location'],['chan','By channel'],['ov','Overall only']],dim);
 var topSel='<select class="fb-sel" data-a="sel" data-k="attPivTopN"><option value="all">All items</option>'+['10','20','50'].map(function(n){return '<option value="'+n+'"'+(topN===n?' selected':'')+'>Top '+n+'</option>';}).join('')+'</select>';
 var extra=dimSel+'<select class="fb-sel" data-a="sel" data-k="attPivCat"><option value="all">All categories</option>'+['Main','Drink','Side','Sweet'].map(function(c){return '<option value="'+c+'"'+(catF===c?' selected':'')+'>'+c+'</option>';}).join('')+'</select>'+tgl('attPivMode',[['pct','Percentage'],['cnt','Attaches']],mode)+topSel+'<button class="btn" data-a="csvpiv">Export CSV</button>';
 var title='Attachment rate by item &amp; '+(dim==='chan'?'channel':dim==='ov'?'overall':'location');
 return tbl('attpiv',title,cols,rows,{def:{k:'ov',d:'desc'},sfn:function(r){return r.item+' '+r.cat;},max:300,extra:extra});
}
function csvAttPiv(){
 var F=eff('attachment'),d=S.dr,inR=function(r){return r.d>=d.start&&r.d<=d.end&&(!F.ch.length||F.ch.indexOf(r.menu)>=0);};
 var xi=(DATA.att.x||[]).filter(inR);if(!xi.length)return;
 var dim=T('attPivDim','loc'),keyOf=dim==='chan'?function(r){return chanOf(r.menu);}:function(r){return r.loc;};
 var ci=DATA.att.c.filter(inR),mckDim={},mckTot=0;ci.forEach(function(r){var k=keyOf(r);mckDim[k]=(mckDim[k]||0)+r.n;mckTot+=r.n;});
 var dimKeys=dim==='ov'?[]:(dim==='chan'?CHAN_ORDER.filter(function(c){return mckDim[c];}):META.locs.filter(function(l){return mckDim[l];}));
 var catF=T('attPivCat','all'),mode=T('attPivMode','pct');
 var items={};xi.forEach(function(r){if(catF!=='all'&&r.cat!==catF)return;var k=r.item+'||'+r.cat,o=items[k]||(items[k]={item:r.item,cat:r.cat,dv:{},tot:0});o.dv[keyOf(r)]=(o.dv[keyOf(r)]||0)+r.checks;o.tot+=r.checks;});
 var rows=Object.keys(items).map(function(k){return items[k];}).filter(function(o){return o.tot>0;}).sort(function(a,b){return b.tot-a.tot;});
 var cell=function(o,l){var c=o.dv[l]||0;return mode==='pct'?(mckDim[l]?(100*c/mckDim[l]).toFixed(2):'0'):c;};
 csvDownload('gyro_attachment_pivot_'+dim+'_'+S.dr.start+'_'+S.dr.end+'.csv',['Category','Item / Modifier','Overall '+(mode==='pct'?'%':'attaches')].concat(dimKeys),rows.map(function(r){return [r.cat,r.item,mode==='pct'?(mckTot?(100*r.tot/mckTot).toFixed(2):'0'):r.tot].concat(dimKeys.map(function(l){return cell(r,l);}));}));
}
function vAtt(){
 if(!DATA.att.c.length)return vAttPH();
 var F=eff('attachment'),ci=getAtt('c',F),ii=getAtt('i',F);
 var R=DATA.att.roles,roles='Main = '+R.main.join(', ')+'. Side = '+R.side.join(', ')+'. Drink = '+R.drink.join(', ')+'. Sweet = '+R.sweet.join(', ')+'.';
 var nt=note('<b>Attachment</b> = share of checks containing a main item that also contain a drink, side or sweet (voided lines excluded). <b>Overall</b> = distinct attached drink/side/sweet <b>items</b> ÷ main checks (a Coke + a Sprite counts twice; two of the same item counts once — attached items per check, can exceed 100%); modifiers and main items excluded. '+esc(roles)+(META.locs.indexOf('Katy')>=0&&!DATA.att.c.some(function(r){return r.loc==='Katy';})?' <b>Katy is not included:</b> the Katy item-details sheet in the workbook is a copy of Fondren’s, so there is no Katy check data yet.':''));
 if(!ci.length)return nt+empty('No main-item checks for '+esc(S.dr.text)+' with the selected filters.'+(S.loc.length&&S.loc.every(function(l){return l==='Katy';})?' Katy’s item-selection export is missing (the sheet in the workbook is a copy of Fondren’s).':''));
 var tot=aggA(ci);
 var byI=Array.from(group(ii,function(r){return r.item+'||'+r.grp;})).map(function(e){var a=aggA(e[1]);a.name=iLabel(e[1][0].item,e[1][0].grp);return a;});
 var byL=Array.from(group(ci,function(r){return r.loc;})).map(function(e){var a=aggA(e[1]);a.name=e[0];return a;});
 var byC=Array.from(group(ci,function(r){return chanOf(r.menu);})).map(function(e){var a=aggA(e[1]);a.name=e[0];return a;}).sort(function(a,b){return CHAN_ORDER.indexOf(a.name)-CHAN_ORDER.indexOf(b.name);}),byMn=Array.from(group(ci,function(r){return r.menu;})).map(function(e){var a=aggA(e[1]);a.name=e[0];return a;});
 var best=byI.filter(function(x){return x.n>=50;}).sort(function(a,b){return b.ra-a.ra;})[0]||byI[0],bestL=byL.slice().sort(function(a,b){return b.ra-a.ra;})[0];
 /* vs-prior comparable window (same length, immediately before) */
 var pr=priorRange(S.dr),ptot=pr.full?aggA(DATA.att.c.filter(function(r){return r.d>=pr.start&&r.d<=pr.end&&(!F.loc.length||F.loc.indexOf(r.loc)>=0)&&(!F.ch.length||F.ch.indexOf(r.menu)>=0);})):null;
 if(ptot&&!ptot.n)ptot=null;
 var k='<div class="krow k6">'+kpi('a','Total Main Checks',fN(tot.n),'checks with a main item'+dBadge(tot.n,ptot&&ptot.n))+kpi('g','Highest Attachment',esc(best.name),fP(best.ra,1)+' · '+fN(best.n)+' checks',null,true)+kpi('b','Best Performing Location',esc(bestL.name),fP(bestL.ra,1)+' · '+fN(bestL.n)+' checks',null,true)+kpi('p','Drink Checks',fN(tot.dr),fP(tot.rd,1)+' of main checks'+dBadge(tot.rd,ptot&&ptot.rd,{pp:true}))+kpi('t','Side Checks',fN(tot.sd),fP(tot.rs,1)+' of main checks'+dBadge(tot.rs,ptot&&ptot.rs,{pp:true}))+kpi('pk','Sweet Checks',fN(tot.sw),fP(tot.rw,1)+' of main checks'+dBadge(tot.rw,ptot&&ptot.rw,{pp:true}))+'</div>';
 /* weekly trend (P9W1–W4 = days 1–7, 8–14, 15–21, 22–end) */
 var wk=Array.from(group(ci,function(r){return pweek(r.d).k;})).sort(function(a,b){return a[0]<b[0]?-1:1;}).map(function(e){var a=aggA(e[1]);a.l=pweek(e[1][0].d).l;a.s=weekSub(e[0]);return a;});
 var ATC={Overall:'#6d4bd0',Drink:'#9f7cef',Side:'#8b8694',Sweet:'#c3b0f2'};
 var trend='<div class="cc"><div class="cc-h"><h3>Attachment rate trend · weekly</h3></div>'+(wk.length>0?multiLine([{name:'Overall',color:ATC.Overall,vals:wk.map(function(a){return a.ra;})},{name:'Drink',color:ATC.Drink,vals:wk.map(function(a){return a.rd;})},{name:'Side',color:ATC.Side,vals:wk.map(function(a){return a.rs;})},{name:'Sweet',color:ATC.Sweet,vals:wk.map(function(a){return a.rw;})}],wk.map(function(a){return a.l;}),function(v){return fP(v,0);},1280,wk.map(function(a){return a.s;})):empty('No data'))+'</div>';
 var top12=byI.filter(function(x){return x.n>=20;}).sort(function(a,b){return b.ra-a.ra;}).slice(0,12).map(function(x){return {l:x.name,v:x.ra,tip:x.name+'||Overall '+fP(x.ra,1)+' of '+fN(x.n)+' checks||Drink '+fP(x.rd,1)+' · Side '+fP(x.rs,1)+' · Sweet '+fP(x.rw,1)};});
 var locSorted=byL.slice().sort(function(a,b){return b.ra-a.ra;}),locSeries=[{color:ATC.Overall,label:'Overall'},{color:ATC.Drink,label:'Drink'},{color:ATC.Side,label:'Side'},{color:ATC.Sweet,label:'Sweet'}];
 var locItems=locSorted.map(function(x){return {l:x.name,vals:[x.ra,x.rd,x.rs,x.rw],tips:[x.name+' · Overall||'+fP(x.ra,1),x.name+' · Drink||'+fP(x.rd,1),x.name+' · Side||'+fP(x.rs,1),x.name+' · Sweet||'+fP(x.rw,1)]};});
 var locLeg='<div class="tr-leg">'+locSeries.map(function(se){return '<span class="chd" style="font-size:10.5px;margin-right:6px"><i style="background:'+se.color+'"></i>'+esc(se.label)+'</span>';}).join('')+'</div>';
 var charts='<div class="cc"><h3>Top 12 by attachment rate</h3>'+hbars(top12,function(v){return fP(v,1);})+'<div class="ks" style="margin-top:6px">Items with at least 20 checks</div></div><div class="cc"><div class="cc-h"><h3>Attachment rate by location</h3></div>'+locLeg+columns(locItems,function(v){return fP(v,0);},{w:1280,h:250,pl:56,series:locSeries})+'<div class="ks" style="margin-top:4px">Overall and Drink/Side/Sweet per location — all locations stay comparable.</div></div>';
 var ovRow=aggA(ci);ovRow.name='All main checks';
 var by=T('attBy','item'),src=by==='item'?byI:by==='channel'?byC:by==='menu'?byMn:by==='overall'?[ovRow]:byL;
 var cols=[{k:'name',l:by==='item'?'Main Item':by==='channel'?'Channel':by==='menu'?'Menu (Toast)':by==='overall'?'Scope':'Location',a:'l',w:210,f:function(r){return by==='channel'?chanChip(r.name):by==='menu'?chip(r.name):esc(r.name);}},{k:'n',l:'Main Checks',f:function(r){return fN(r.n);}},{k:'rd',l:'<span style="color:'+ATC.Drink+'">Drink %</span>',f:function(r){return fP(r.rd,1);},t:'Share of main checks with a drink'},{k:'rs',l:'<span style="color:'+ATC.Side+'">Side %</span>',f:function(r){return fP(r.rs,1);},t:'Share of main checks with a side'},{k:'rw',l:'<span style="color:'+ATC.Sweet+'">Sweet %</span>',f:function(r){return fP(r.rw,1);},t:'Share of main checks with a sweet'},{k:'ra',l:'Overall Rate',f:function(r){return rtag(r.ra);},t:'Every attached item ÷ main checks — a drink and a side on one check count twice (attached items per check); main excluded'}];
 var foot='<td>All main checks</td><td>'+fN(tot.n)+'</td><td>'+fP(tot.rd,1)+'</td><td>'+fP(tot.rs,1)+'</td><td>'+fP(tot.rw,1)+'</td><td>'+fP(tot.ra,1)+'</td>';
 var brkExtra=tgl('attBy',[['item','Item'],['channel','Channel'],['menu','Menu'],['loc','Location'],['overall','Overall']],by)+'<button class="btn" data-a="csvatt">Export CSV</button>';
 return nt+k+trend+charts+tbl('att','Attachment rate breakdown',cols,src,{def:{k:'n',d:'desc'},foot:(by==='item'||by==='overall')?'':foot,sfn:by==='item'?function(r){return r.name;}:null,max:300,extra:brkExtra})+attPivot(F)+attItemMix(F);
}

function vAttPH(){
 var L=['Total Main Checks','Highest Attachment','Best Performing Location','Drink Checks','Side Checks','Sweet Checks'];
 var cols=['Main Item','Main Checks','Drink %','Side %','Sweet %','Overall Rate'];
 return note('<b>Awaiting export.</b> Attachment rates need check-level item lines (item, check ID, location, date). The Sugar Land modifier export has check IDs but no item lines, so drink / side / sweet attachment can’t be computed from it.')+'<div class="krow k6">'+L.map(function(l){return kpi('a',l,BLANK,'');}).join('')+'</div>'+ph('Attachment rate trend · weekly','Awaiting check-level export.')+'<div class="gr22">'+ph('Top 12 by attachment rate','Awaiting check-level export.')+ph('Attachment rate by location','Awaiting check-level export.')+'</div>'+
  '<div class="tw"><div class="th2"><h3>Attachment rate breakdown</h3></div><div class="tscroll"><table><thead><tr>'+cols.map(function(c,i){return '<th class="'+(i?'':'l')+'">'+c+'</th>';}).join('')+'</tr></thead><tbody><tr><td class="l" colspan="6" style="color:var(--muted);padding:20px">No check-level data in this export.</td></tr></tbody></table></div></div>';
}

/* ───────── shell ───────── */
var VIEWS={overview:vOverview,itemmix:vItemMix,entreemix:vEntree,loccompare:vLoc,chanmenu:vChannels,payment:vPayment,meoverall:vME,attachment:vAtt};
var FORMATS=[['Item reports (one CSV per location)','Toast “All levels” item export (columns: Type, Menu, Menu group, Item, open item, Sales Category, Qty sold, Gross item amt, Discount amt, Refund amt, Void amt, Net item amt, Tax amt, Waste …). The location name is taken from the file name, e.g. “Item Details Katy.csv” → Katy.'],['Item selections (CSV, one per location)','Toast Item Selection Details (columns: Location, Order Date, Check Id, Menu Item, Menu Group, Menu, Void?, Qty …). Used for the Analytics (attachment) tab.'],['Payments (CSV, one per location)','Toast Payments report (columns: Location, Order #, Order Date, Amount, Tip, Gratuity, Total, Void User, Void Approver, Void Date, Type, Receipt). A payment with a Void Date is counted as voided.'],['Modifier detail (CSV, one per location)','Toast order-level modifier export (columns: Location, Order Date, Dining Option, Modifier, Option Group Name, Parent Menu Selection, Net Price, Qty, Void?). The location comes from the Location column.']];
function nUnique(){return new Set(DATA.items.map(function(r){return r.item+'||'+r.grp;})).size;}

function header(){
 var pop=S.open==='upload'?'<div class="pop"><h4>Upload Toast CSV exports</h4><p>Select several files at once — each is recognised by its column headers. Uploading <b>replaces</b> the built-in data (no merge); a type you don’t upload is left empty. Export Excel sheets as CSV first.</p>'+FORMATS.map(function(f){return '<b style="font-size:10.5px">'+f[0]+'</b><code>'+f[1]+'</code>';}).join('')+'<div class="pb"><button class="pri" data-a="pick">Choose CSV files…</button><button data-a="reset">Reset to built-in data</button></div></div>':'';
 return '<div class="hdr"><div class="hdr-l"><div class="client-box"><img alt="Gyro Republic" src="'+GLOGO+'"></div><div><div style="display:flex;align-items:center;gap:8px"><span class="hdr-title">Product Mix Dashboard</span>'+(periodBadge(S.dr)?'<span class="pbadge">'+periodBadge(S.dr)+'</span>':'')+'</div><div class="hdr-sub">'+fN(nUnique())+' menu items · '+esc(S.dr.text)+' · '+META.locs.length+' location'+(META.locs.length===1?'':'s')+'</div></div></div>'+
  '<div class="hdr-r"><div class="hdr-status"><span class="status-dot"></span>'+('Live · Toast via Neon'+(payload.meta.asOf?' · updated '+new Date(payload.meta.asOf).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):''))+'</div><span class="klogo"><img alt="Kutlerri" src="'+LOGO+'"></span>'+pop+'</div></div>';
}
function dropdown(id,label,minW,body,mw){return '<div class="drw"><button class="drb" data-a="open" data-k="'+id+'" style="min-width:'+minW+'px">'+label+' <span style="font-size:8px">▼</span></button>'+(S.open===id?'<div class="drm" style="min-width:'+Math.max(mw||0,minW,190)+'px">'+body+'</div>':'')+'</div>';}
function checkList(key,all,vals,colorFn){return '<label class="dr-it"><input type="checkbox" data-a="chk" data-k="'+key+'" data-v=""'+(S[key].length===0?' checked':'')+' style="accent-color:var(--accent)"> '+all+'</label><div class="dr-div"></div>'+vals.map(function(v){var c=colorFn?colorFn(v):'var(--accent)';return '<label class="dr-it"><input type="checkbox" data-a="chk" data-k="'+key+'" data-v="'+esc(v)+'"'+(S[key].indexOf(v)>=0?' checked':'')+' style="accent-color:'+c+'">'+(colorFn?'<i style="width:8px;height:8px;border-radius:2px;background:'+c+';display:inline-block"></i>':'')+esc(v)+'</label>';}).join('');}
function catCheck(key,all,list,fn){var groups=chanGroups(list,fn),sel=S[key];
 return '<label class="dr-it" style="justify-content:flex-start;gap:8px"><input type="checkbox" data-a="chk" data-k="'+key+'" data-v=""'+(sel.length===0?' checked':'')+' style="accent-color:var(--accent)"> '+all+'</label><div class="dr-div"></div>'+groups.map(function(g){
  var n=g.items.filter(function(x){return sel.indexOf(x)>=0;}).length,col=chanColor(g.cat);
  return '<label class="dr-it" style="justify-content:flex-start;gap:8px"><input type="checkbox" data-a="chkgrp" data-k="'+key+'" data-g="'+esc(g.cat)+'"'+(n===g.items.length?' checked':'')+' style="accent-color:'+col+'"><i style="width:8px;height:8px;border-radius:2px;background:'+col+';display:inline-block"></i>'+esc(chanDisp(g.cat))+'</label>';}).join('');}
function groupedCheck(key,all,list,fn){var groups=chanGroups(list,fn),sel=S[key];
 return '<label class="dr-it"><input type="checkbox" data-a="chk" data-k="'+key+'" data-v=""'+(sel.length===0?' checked':'')+' style="accent-color:var(--accent)"> '+all+'</label><div class="dr-div"></div>'+groups.map(function(g){
  var n=g.items.filter(function(x){return sel.indexOf(x)>=0;}).length,col=chanColor(g.cat);
  return '<label class="dr-it" style="font-weight:700;background:var(--s2)"><input type="checkbox" data-a="chkgrp" data-k="'+key+'" data-g="'+esc(g.cat)+'"'+(n===g.items.length?' checked':'')+(n>0&&n<g.items.length?' data-part="1"':'')+' style="accent-color:'+col+'"><i style="width:8px;height:8px;border-radius:2px;background:'+col+';display:inline-block"></i>'+esc(chanDisp(g.cat))+'</label>'+
   g.items.map(function(v){return '<label class="dr-it" style="padding-left:32px"><input type="checkbox" data-a="chk" data-k="'+key+'" data-v="'+esc(v)+'"'+(sel.indexOf(v)>=0?' checked':'')+' style="accent-color:'+col+'">'+esc(v)+'</label>';}).join('');}).join('');}
function grpCheck(key,all,list){var groups=chanGroups(list,grpCat,CATG_ORDER),sel=S[key];
 return '<label class="dr-it" style="justify-content:flex-start;gap:8px"><input type="checkbox" data-a="chk" data-k="'+key+'" data-v=""'+(sel.length===0?' checked':'')+' style="accent-color:var(--accent)"> '+all+'</label><div class="dr-div"></div>'+groups.map(function(g){
  var n=g.items.filter(function(x){return sel.indexOf(x)>=0;}).length,col=grpColor(g.cat),multi=g.items.length>1;
  return '<label class="dr-it" style="justify-content:flex-start;gap:8px'+(multi?';font-weight:700;background:var(--s2)':'')+'"><input type="checkbox" data-a="chkgrp" data-k="'+key+'" data-g="'+esc(g.cat)+'"'+(n===g.items.length?' checked':'')+(n>0&&n<g.items.length?' data-part="1"':'')+' style="accent-color:'+col+'"><i style="width:8px;height:8px;border-radius:2px;background:'+col+';display:inline-block"></i>'+esc(g.cat)+'</label>'+
   (multi?g.items.map(function(v){return '<label class="dr-it" style="justify-content:flex-start;gap:8px;padding-left:32px"><input type="checkbox" data-a="chk" data-k="'+key+'" data-v="'+esc(v)+'"'+(sel.indexOf(v)>=0?' checked':'')+' style="accent-color:'+col+'">'+esc(v)+'</label>';}).join(''):'');}).join('');}
function sumLbl(arr,all,unit){return arr.length===0?all:arr.length===1?arr[0]:arr.length+' '+unit;}
function dateDropdown(){
 var dr=S.dr,opts=dateOptions(),row=function(o){return '<div class="dr-it'+(dr.id===o.id?' on':'')+'" data-a="dr" data-i="'+o.id+'"><span>'+esc(o.label)+'</span><span class="dr-sub">'+esc(o.text)+'</span></div>';};
 var customOn=dr.id==='custom';
 var cur='<div class="dr-cur"><span class="dr-cur-k">Showing</span><span class="dr-cur-v">'+esc(dr.text||dr.label)+'</span></div>';
 var body=cur+'<div class="dr-sec">Quick</div>'+opts.slice(0,4).map(row).join('')+'<div class="dr-div"></div><div class="dr-sec">'+(S.cal!=='month'&&FISCAL.length?'Fiscal periods (4-4-5, FY'+(fiscalOf(META.max||PERIOD.end)||{fy:''}).fy+')':'Calendar months')+'</div>'+opts.slice(4).map(row).join('')+'<div class="dr-div"></div><div class="dr-sec'+(customOn?' on':'')+'">Custom date range'+(customOn?' <span class="dr-cur-tag">active</span>':'')+'</div><div class="dr-dates'+(customOn?' on':'')+'"><div class="dr-dr">From <input type="date" data-a="dcs" min="'+esc(META.min||'')+'" max="'+esc(META.max||'')+'" value="'+(S.custom.s||dr.start)+'"></div><div class="dr-dr">To <input type="date" data-a="dce" min="'+esc(META.min||'')+'" max="'+esc(META.max||'')+'" value="'+(S.custom.e||dr.end)+'"></div><button class="dr-apply" data-a="apply">Apply range</button></div>';
 return dropdown('date',esc(dr.text||dr.label),190,body,320);
}
function filterbar(){
 var t=TF[S.tab]||{},h='<div class="fb"><div class="fb-r"><span class="fb-lbl">Calendar</span><div class="tgl-g"><button class="tgl'+(S.cal!=='month'?' on':'')+'" data-a="cal" data-v="fiscal" title="4-4-5 fiscal periods">Fiscal</button><button class="tgl'+(S.cal==='month'?' on':'')+'" data-a="cal" data-v="month" title="Calendar months">Month</button></div><div class="fb-sep"></div><span class="fb-lbl">Date range</span>'+dateDropdown();
 if(t.dn)h+='<div class="fb-sep"></div><span class="fb-lbl">Dining option</span>'+dropdown('dn',esc(chanLabel('dn',S.dn,'All Dining Options','Dining Options')),170,groupedCheck('dn','All Dining Options',META.dining,dnChan),280);
 if(S.tab==='meoverall'){var cur=T('meCh','ALL'),curLbl=meLabel(cur),rowsH='<div class="dr-it'+(cur==='ALL'?' on':'')+'" data-a="meset" data-v="ALL"><span>Overall</span></div><div class="dr-it'+(cur==='BL'?' on':'')+'" data-a="meset" data-v="BL"><span>Blended</span></div><div class="dr-div"></div>';
  chanGroups(META.menus,chanOf).forEach(function(g){var cv='cat:'+g.cat,col=chanColor(g.cat);
   rowsH+='<div class="dr-it'+(cur===cv?' on':'')+'" style="justify-content:flex-start;gap:9px;font-weight:700" data-a="meset" data-v="'+esc(cv)+'"><i style="width:8px;height:8px;border-radius:2px;background:'+col+';display:inline-block"></i><span>'+esc(chanDisp(g.cat))+'</span></div>';});
  h+='<div class="fb-sep"></div><span class="fb-lbl">Channel</span>'+dropdown('mech',esc(curLbl),200,rowsH,230);}
 if(t.ch)h+='<div class="fb-sep"></div><span class="fb-lbl">Channel</span>'+dropdown('ch',esc(chanLabel('ch',S.ch,'All Channels','Channels')),170,catCheck('ch','All Channels',META.menus,chanOf),230);
 if(t.cat)h+='<div class="fb-sep"></div><span class="fb-lbl">Category</span>'+dropdown('cat',esc(chanLabel('cat',S.cat,'All Categories','Categories')),170,grpCheck('cat','All Categories',META.groups),230);
 if(t.loc&&META.locs.length>1)h+='<div class="fb-sep"></div><span class="fb-lbl">Location</span>'+dropdown('loc',esc(sumLbl(S.loc,'All Locations','Locations')),130,checkList('loc','All Locations',META.locs));
 if(t.ch&&!t.nr)h+='<div class="fb-sep"></div><label class="dr-it" title="Excludes Toast open items and test items"><input type="checkbox" data-a="real"'+(S.real?' checked':'')+' style="accent-color:var(--accent)"> Real Menu Items</label>';
 return h+'</div></div>';
}
function tabsbar(){return '<div class="tabs-o"><div class="tabs-i">'+TABS.map(function(t){return '<button class="tb'+(S.tab===t[0]?' on':'')+'" data-a="tab" data-k="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div></div>';}
function banner(){
 if(!DATA.embedded)return '<div class="banner p"><span><b>Loaded:</b> '+esc(DATA.files.join(' · '))+'</span></div>';
 return '';
}
function itemRangeMsg(){var r=itemRange(),pid='p'+(+PERIOD.start.slice(5,7));return '<div class="empty"><b style="color:var(--text);font-size:13px">'+(r==='none'?'No item sales for '+esc(S.dr.text):'Item sales can’t be shown for '+esc(S.dr.text))+'</b><br><br>The Toast item reports cover the whole of '+esc(PERIOD.label)+' and have no daily breakdown'+(r==='partial'?', so they can’t be cut to part of the month':'')+'. Pick a range that includes it (P'+(+PERIOD.start.slice(5,7))+', This month, YTD…).<br><br><button class="btn" data-a="dr" data-i="'+pid+'">Show '+esc(findOpt(pid).label)+'</button></div>';}
/* nav icons (16×16, inherit currentColor) */
var NAVICON={
 overview:'<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/>',
 itemmix:'<line x1="6" y1="4" x2="14" y2="4"/><line x1="6" y1="8" x2="14" y2="8"/><line x1="6" y1="12" x2="14" y2="12"/><circle cx="3" cy="4" r="1"/><circle cx="3" cy="8" r="1"/><circle cx="3" cy="12" r="1"/>',
 entreemix:'<path d="M2.5 7h11a5.5 5.5 0 0 1-11 0z"/><line x1="4" y1="13" x2="12" y2="13"/>',
 loccompare:'<rect x="2.5" y="8" width="3" height="5.5" rx=".6"/><rect x="6.5" y="5" width="3" height="8.5" rx=".6"/><rect x="10.5" y="2.5" width="3" height="11" rx=".6"/>',
 chanmenu:'<circle cx="4" cy="8" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><line x1="5.7" y1="7" x2="10.3" y2="5"/><line x1="5.7" y1="9" x2="10.3" y2="11"/>',
 payment:'<rect x="2" y="4" width="12" height="8" rx="1.5"/><line x1="2" y1="7" x2="14" y2="7"/>',
 meoverall:'<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2.4"/><line x1="8" y1="1" x2="8" y2="15"/><line x1="1" y1="8" x2="15" y2="8"/>',
 attachment:'<path d="M7 5 5 7a2.5 2.5 0 0 0 3.5 3.5L10 9"/><path d="M9 11l2-2a2.5 2.5 0 0 0-3.5-3.5L6 7"/>'};
function navIcon(id){return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+(NAVICON[id]||'')+'</svg>';}
function sidebar(){
 var gu=(typeof window!=='undefined'&&window.__gyroUser)||null;
 var signout='<form action="/api/auth/logout" method="post" class="sb-signout-f"><button type="submit" class="sb-item sb-signout"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2H3v12h3"/><path d="M10.5 11l3-3-3-3"/><line x1="13.5" y1="8" x2="6.5" y2="8"/></svg><span>Sign out</span></button></form>';
 return '<aside class="sidebar">'+
  '<div class="sb-brand"><img alt="Gyro Republic" src="'+GLOGO+'"><div><div class="bt">Gyro Republic</div><div class="bs">Product Mix</div></div></div>'+
  '<nav class="sb-nav">'+TABS.map(function(t){return '<button class="sb-item'+(S.tab===t[0]?' on':'')+'" data-a="tab" data-k="'+t[0]+'">'+navIcon(t[0])+'<span>'+t[1]+'</span></button>';}).join('')+'</nav>'+
  '<div class="sb-foot">'+
   (gu?'<div class="sb-user"><div class="sb-user-n">'+esc(gu.name||'')+'</div><div class="sb-user-r">'+esc(gu.role||'')+'</div></div>':'')+
   ((typeof window!=='undefined'&&window.__gyroCanAdmin)?'<a class="sb-item sb-admin" href="/admin" style="text-decoration:none"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="5" x2="13" y2="5"/><line x1="3" y1="11" x2="13" y2="11"/><circle cx="6" cy="5" r="1.8"/><circle cx="10" cy="11" r="1.8"/></svg><span>Admin settings</span></a>':'')+
   signout+
   '<button class="sb-theme" data-a="theme" title="Switch light / dark">◐ <span>Theme</span></button>'+
   '<div class="sb-status"><span class="status-dot"></span>Live · Toast via Neon</div>'+
   '<div class="sb-kut"><span>Built by</span><img alt="Kutlerri" src="'+LOGO+'"></div>'+
  '</div>'+
 '</aside>';
}
function topbar(){
 var cur=(TABS.filter(function(t){return t[0]===S.tab;})[0]||['','Dashboard']),pb=periodBadge(S.dr);
 return '<div class="topbar"><div class="tb-l"><button class="nav-toggle" data-a="nav" title="Show / hide menu">☰</button><div><h2>'+esc(cur[1])+'</h2><div class="tb-sub">'+fN(nUnique())+' menu items · '+esc(S.dr.text)+' · '+META.locs.length+' location'+(META.locs.length===1?'':'s')+(pb?' · <span class="pbadge">'+esc(pb)+'</span>':'')+'</div></div></div>'+
  '<div class="tb-r"><div class="hdr-status"><span class="status-dot"></span>'+('Live'+(payload.meta.asOf?' · updated '+new Date(payload.meta.asOf).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):''))+'</div><button class="tb-theme" data-a="theme" title="Switch light / dark">◐</button></div></div>';
}
function render(){
 if(typeof TIP!=='undefined'&&TIP)TIP.style.display='none';
 var app=document.getElementById('app'),sy=window.scrollY,body,oldTs=app.querySelector('.tscroll'),ts0=oldTs?oldTs.scrollTop:0,tsTab=app.getAttribute('data-tab');
 try{body=(ITEMTABS[S.tab]&&DATA.items.length&&itemRange()!=='full')?itemRangeMsg():VIEWS[S.tab]();}catch(e){body=empty('Something went wrong rendering this tab: '+esc(e.message));if(window.console)console.error(e);}
 app.innerHTML='<div class="layout">'+sidebar()+'<div class="main"><div class="topwrap">'+topbar()+'</div><div class="sticky-bar">'+filterbar()+'</div>'+banner()+'<div id="tabbody">'+body+'</div></div></div>'+(S.open?'<div class="ovl" data-a="close"></div>':'');
 if(S.open){var sb=app.querySelector('.sticky-bar');sb.style.zIndex=160;}
 window.scrollTo(0,sy);
 var nt=app.querySelector('.tscroll');if(nt&&tsTab===S.tab)nt.scrollTop=ts0;app.setAttribute('data-tab',S.tab);
 app.querySelectorAll('input[data-part="1"]').forEach(function(i){i.indeterminate=true;});
 if(S.focus){var el=document.getElementById(S.focus);if(el){el.focus();var l=el.value.length;try{el.setSelectionRange(l,l);}catch(e){}}S.focus=null;}
}
function toast(msg){var t=document.getElementById('toast');t.textContent=msg;t.style.display='block';clearTimeout(toast._h);toast._h=setTimeout(function(){t.style.display='none';},6000);}

/* ───────── data load / upload ───────── */
function loadData(items,mods,pays,att,embedded,files){DATA.items=items;DATA.mods=mods;DATA.pays=pays;DATA.att=att;DATA.embedded=embedded;DATA.weekly=embedded?EMB_WEEKLY:null;DATA.files=files||[];computeMeta();computeAnchors();S.dr=defaultRange();S.ch=[];S.cat=[];S.loc=[];S.dn=[];S.real=false;S.sort={};S.q={};S.t={};S.open=null;S.custom={s:'',e:''};}
function loadEmbedded(){loadData(EMB_ITEMS,decodeMods(EMB_MODS),decodePays(EMB_PAYS),decodeAtt(EMB_ATT),true);}
function handleFiles(list){
 var files=Array.from(list);if(!files.length)return;
 Promise.all(files.map(function(f){return f.text().then(function(t){return {name:f.name,text:t};});})).then(function(rs){
  var items=[],mods=[],pays=[],att={c:[],i:[],roles:DATA.att.roles},notes=[],bad=[];
  rs.forEach(function(r){var rows=parseCSV(r.text.replace(/^\uFEFF/,''));if(rows.length<2){bad.push(r.name+' (empty)');return;}
   var kind=detect(rows[0]);if(!kind){bad.push(r.name+' (columns not recognised)');return;}
   if(kind==='items'){var loc=locFromFile(r.name),b=buildItems(rows,loc);if(!b.length){bad.push(r.name+' (no item rows)');return;}items=items.concat(b);notes.push(r.name+' → items · '+loc+' ('+fN(b.length)+' rows)');}
   else if(kind==='att'){var at=buildAtt(rows);if(!at.c.length){bad.push(r.name+' (no main-item checks)');return;}att.c=att.c.concat(at.c);att.i=att.i.concat(at.i);notes.push(r.name+' → item selections · '+Array.from(new Set(at.c.map(function(x){return x.loc;}))).join(', ')+' ('+fN(at.c.reduce(function(s,x){return s+x.n;},0))+' main checks)');}
   else if(kind==='pays'){var pp=buildPays(rows);if(!pp.rows.length){bad.push(r.name+' (no valid dates)');return;}pays=pays.concat(pp.rows);notes.push(r.name+' → payments · '+Array.from(new Set(pp.rows.map(function(x){return x.loc;}))).join(', ')+' ('+fN(pp.rows.reduce(function(s,x){return s+x.n;},0))+' payments)');}
   else{var m=buildMods(rows);if(!m.rows.length){bad.push(r.name+' (no valid dates)');return;}mods=mods.concat(m.rows);notes.push(r.name+' → modifiers · '+Array.from(new Set(m.rows.map(function(x){return x.loc;}))).join(', ')+' ('+fN(m.rows.length)+' grouped rows'+(m.skipped?', '+m.skipped+' skipped':'')+')');}});
  if(!notes.length){toast('Nothing loaded — '+bad.join('; ')+'. Open Upload CSV to see the expected columns.');return;}
  loadData(items,mods,pays,att,false,notes);S.tab='overview';render();
  toast('Loaded '+notes.length+' file'+(notes.length>1?'s':'')+(bad.length?' · skipped: '+bad.join('; '):''));
 });
}

/* ───────── events ───────── */
document.addEventListener('click',function(e){
 var el=e.target.closest('[data-a]');if(!el)return;var a=el.dataset.a;
 if(a==='close'){S.open=null;render();return;}
 if(a==='theme'){var de=document.documentElement,c=de.getAttribute('data-theme'),nx=c==='dark'?'light':c==='light'?'dark':(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'light':'dark');de.setAttribute('data-theme',nx);try{localStorage.setItem('pmix-theme',nx);}catch(e){}return;}
 if(a==='nav'){var dn=document.documentElement,nc=dn.getAttribute('data-nav')==='closed'?'open':'closed';dn.setAttribute('data-nav',nc);try{localStorage.setItem('pmix-nav',nc);}catch(e){}return;}
 if(a==='open'){S.open=S.open===el.dataset.k?null:el.dataset.k;render();return;}
 if(a==='upl'){S.open=S.open==='upload'?null:'upload';render();return;}
 if(a==='pick'){document.getElementById('file').click();return;}
 if(a==='reset'){loadEmbedded();render();toast('Reset to built-in Toast data');return;}
 if(a==='tab'){S.tab=el.dataset.k;S.open=null;render();window.scrollTo(0,0);return;}
 if(a==='cal'){if(S.cal!==el.dataset.v){S.cal=el.dataset.v;S.dr=defaultRange();}S.open=null;render();return;}
 if(a==='tog'){S.t[el.dataset.k]=el.dataset.v;render();return;}
 if(a==='modsretry'){MODS_STATE='none';render();return;}
 if(a==='sort'){var id=el.dataset.t,k=el.dataset.k,cur=S.sort[id];S.sort[id]=(cur&&cur.k===k)?{k:k,d:cur.d==='asc'?'desc':'asc'}:{k:k,d:el.dataset.s};render();return;}
 if(a==='dr'){var o=findOpt(el.dataset.i);if(o)S.dr=o;S.open=null;render();return;}
 if(a==='apply'){var s=S.custom.s||S.dr.start,en=S.custom.e||S.dr.end;if(s>en){var x=s;s=en;en=x;}S.dr={id:'custom',label:'Custom',start:s,end:en,text:dtext(s,en)};S.custom={s:'',e:''};S.open=null;render();return;}
 if(a==='chk'){var key=el.dataset.k,v=el.dataset.v;if(!S[key])S[key]=[];if(v==='')S[key]=[];else{var i=S[key].indexOf(v);if(i>=0)S[key].splice(i,1);else S[key].push(v);}render();return;}
 if(a==='real'){S.real=!S.real;render();return;}
 if(a==='hidebanner'){S.hideBanner=true;render();return;}
 if(a==='csv'){csvItemMix();return;}
 if(a==='csvatt'){csvAttBreak();return;}
 if(a==='csvpiv'){csvAttPiv();return;}
 if(a==='csvmix'){csvAttMix();return;}
 if(a==='chkgrp'){var gk=el.dataset.k,gc=el.dataset.g,gl=gk==='ch'?META.menus:gk==='cat'?META.groups:META.dining,gf=gk==='ch'?chanOf:gk==='cat'?grpCat:dnChan,gi=gl.filter(function(x){return gf(x)===gc;}),allSel=gi.every(function(x){return S[gk].indexOf(x)>=0;});if(allSel)S[gk]=S[gk].filter(function(x){return gi.indexOf(x)<0;});else gi.forEach(function(x){if(S[gk].indexOf(x)<0)S[gk].push(x);});render();return;}
 if(a==='ce'){var ck=el.dataset.k;S.ce[ck]=!S.ce[ck];render();return;}
 if(a==='meset'){S.t.meCh=el.dataset.v;S.open=null;render();return;}
 if(a==='emsel'){var k3=el.dataset.k;S.em.sel[k3]=!S.em.sel[k3];render();return;}
 if(a==='emgrp'){var gname=el.dataset.k,ctx0=modCtx(),grp=emGroups(ctx0).filter(function(x){return x.g===gname;})[0];if(grp){var on=!grp.items.every(function(x){return S.em.sel[x.p];});grp.items.forEach(function(x){S.em.sel[x.p]=on;});}render();return;}
 if(a==='emcol'){var k4=el.dataset.k;S.em.col[k4]=!S.em.col[k4];render();return;}
 if(a==='emclear'){S.em.sel={};render();return;}
 if(a==='emcc'){S.em.cc=S.em.cc||{};var k5=el.dataset.k;S.em.cc[k5]=!S.em.cc[k5];render();return;}
 if(a==='cm'){var k=el.dataset.k;S.col[k]=!S.col[k];render();return;}
 if(a==='ie'){var k2=el.dataset.k;S.ie[k2]=!S.ie[k2];render();return;}
 if(a==='imh'){if(!S.imh)S.imh={items:true,open:true,mods:true,special:false};S.imh[el.dataset.k]=!S.imh[el.dataset.k];render();return;}
 if(a==='imdir'){S.t.imDir=T('imDir','desc')==='desc'?'asc':'desc';render();return;}
 if(a==='isort'){var m=el.dataset.k;if(T('imSort','gross')===m)S.t.imDir=T('imDir','desc')==='desc'?'asc':'desc';else{S.t.imSort=m;S.t.imDir='desc';}render();return;}
 if(a==='expall'){S.col={};S.ie={};render();return;}
 if(a==='colall'){CHAN_ORDER.forEach(function(c){S.col['c|'+c]=true;});render();return;}
});
document.addEventListener('change',function(e){
 var el=e.target;if(el.id==='file'){handleFiles(el.files);el.value='';return;}
 var a=el.dataset&&el.dataset.a;if(!a)return;
 if(a==='sel'){var k=el.dataset.k;if(k==='cat')S.cat=el.value;else S.t[k]=el.value;render();}
 if(a==='dcs')S.custom.s=el.value;if(a==='dce')S.custom.e=el.value;
});
document.addEventListener('input',function(e){var el=e.target;if(el.dataset&&el.dataset.a==='q'){S.q[el.dataset.t]=el.value;S.focus=el.id;render();}});
function csvItemMix(){
 var rows=getItems(eff('itemmix')),m=Array.from(group(rows,function(r){return r.menu+'||'+r.grp+'||'+r.item;})).map(function(e){var a=aggI(e[1]),f=e[1][0];return [f.item,f.grp,f.menu,a.q,a.g.toFixed(2),a.disc.toFixed(2),a.ref.toFixed(2),a.n.toFixed(2),a.vd.toFixed(2),a.vq,a.tax.toFixed(2),a.wq,a.wa.toFixed(2)];});
 csvDownload('gyro_item_mix_'+S.dr.start+'_'+S.dr.end+'.csv',['Item','Menu Group','Menu','Qty Sold','Gross Amt','Discount Amt','Refund Amt','Net Amt','Void Amt','Voided Qty','Tax Amt','Waste Qty','Waste Amt'],m);
}


/* ───────── hover tooltips for charts (data appears only on hover) ───────── */
var TIP=document.getElementById('tip');
function tipPos(ev){var w=TIP.offsetWidth,h=TIP.offsetHeight,x=ev.clientX+14,y=ev.clientY+16;if(x+w>window.innerWidth-8)x=ev.clientX-w-14;if(y+h>window.innerHeight-8)y=ev.clientY-h-14;TIP.style.left=Math.max(4,x)+'px';TIP.style.top=Math.max(4,y)+'px';}
document.addEventListener('mouseover',function(ev){var el=ev.target.closest?ev.target.closest('[data-tip]'):null;if(!el){TIP.style.display='none';return;}var parts=el.getAttribute('data-tip').split('||');TIP.innerHTML='<b>'+esc(parts[0])+'</b>'+parts.slice(1).map(function(s){return '<div>'+esc(s)+'</div>';}).join('');TIP.style.display='block';tipPos(ev);});
document.addEventListener('mousemove',function(ev){if(TIP.style.display==='block')tipPos(ev);});
document.addEventListener('mouseout',function(ev){var r=ev.relatedTarget;if(!r||!r.closest||!r.closest('[data-tip]'))TIP.style.display='none';});

/* ───────── init ───────── */
loadEmbedded();
render();
window.__gyro={getPays:getPays,S:S,DATA:DATA,META:META,ANCH:function(){return ANCH;},PNAME:function(){return PNAME;},modCtx:modCtx,render:render,loadEmbedded:loadEmbedded,handleFiles:handleFiles,aggI:aggI,getItems:getItems};

}
