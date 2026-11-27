'use strict';
/* Ooz School Suite — the shared school-data file (.oozschool), read and written the same way by
   Ooz Timetable Studio, Ooz Marks and Ooz School Manager. This file is copied unchanged into each program.

   The file is UTF-8 JSON:
     {format:'oozschool', version:1, app, appVersion, exportedAt,
      school:{name, nameEn, logo, year},
      stages:[{uid, name, nameEn, section}]                          section: 'ar' | 'en' | ''
      classes:[{uid, name, nameEn, stage, grade}]                    stage: a stage uid; grade: the grade's name (School Manager)
      subjects:[{uid, name, nameEn, code, classes:[uid], max:{classUid:number}}]
      teachers:[{uid, name, nameEn, phone, email}]
      teaching:[{teacher, subject, class}]                           uids
      students:[{uid, name, nameEn, class, number, gender, dob, nationalId}]
      results:[{term, student, subject, value, max, abs, grade}]     Ooz Marks only}
   Every record has a uid that never changes. A program that made the record uses its own prefix (tt:, mk:, sm:) and its
   own id; a program that receives a record keeps the uid it came with, so a file can go back and forth between the
   programs and the same things are found again. Without a uid match, names are compared after the usual Arabic
   spelling differences are smoothed out (أ/إ/آ/ا, ة/ه, ى/ي, diacritics); a near match is never decided alone: it is
   put to the person. Importing only adds and updates: nothing is ever deleted, and an empty field never wipes a full one. */
(function(root){
const FORMAT='oozschool',VERSION=1,EXT='.oozschool',MIME='application/json';
const KINDS=['stages','classes','subjects','teachers','students'];
const LIMIT={stages:200,classes:2000,subjects:2000,teachers:5000,students:100000,teaching:50000,results:2000000};

const digits=s=>String(s).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
function norm(s){return digits(s==null?'':s).toLowerCase().replace(/[إأآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
  .replace(/[ً-ٰٟـ]/g,'').replace(/^(ا\.|أ\.|ا\/|م\.|د\.|mr\.?|mrs\.?|ms\.?|miss|dr\.?)\s*/,'').replace(/[()\[\]{}.,،:;"'`«»\-_/\\|]+/g,' ').replace(/\s+/g,' ').replace(/(^| )(عبد|ابو|ابي) (?=\S)/g,'$1$2').trim();}
const str=(v,max=500)=>v==null?'':String(v).trim().slice(0,max);

// ---- writing ----
function build(src){const o={format:FORMAT,version:VERSION,app:str(src.app,60),appVersion:str(src.appVersion,20),exportedAt:new Date().toISOString(),
  school:{name:str(src.school&&src.school.name,200),nameEn:str(src.school&&src.school.nameEn,200),logo:/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/.test(src.school&&src.school.logo||'')?src.school.logo:'',year:str(src.school&&src.school.year,40)}};
 for(const k of [...KINDS,'teaching','results'])if(Array.isArray(src[k]))o[k]=src[k];
 return o;}
function toText(file){return JSON.stringify(file);}
function fileName(file){const n=(file.school.name||file.school.nameEn||'school').replace(/[\\/:*?"<>|\s]+/g,'-').replace(/-+/g,'-').slice(0,60);
 const d=file.exportedAt.slice(0,10);return n+'-'+d+EXT;}

// ---- reading ----
class SyncError extends Error{constructor(code){super(code);this.code=code;}}
function parse(text){let o;if(text instanceof Uint8Array||text instanceof ArrayBuffer)text=new TextDecoder().decode(text);
 text=String(text||'').replace(/^﻿/,'');try{o=JSON.parse(text);}catch(e){throw new SyncError('notJson');}
 if(!o||o.format!==FORMAT)throw new SyncError('notOozschool');if(!(o.version>=1))throw new SyncError('badVersion');if(o.version>VERSION)throw new SyncError('newerVersion');
 o.school=o.school&&typeof o.school==='object'?o.school:{};
 for(const k of [...KINDS,'teaching','results']){if(o[k]==null){o[k]=[];continue;}if(!Array.isArray(o[k]))throw new SyncError('bad:'+k);if(o[k].length>LIMIT[k])throw new SyncError('tooBig:'+k);}
 const seen={};for(const k of KINDS){seen[k]=new Set();o[k]=o[k].filter(r=>r&&typeof r==='object'&&str(r.uid)&&str(r.name)&&!seen[k].has(r.uid)&&seen[k].add(r.uid));
  for(const r of o[k]){r.uid=str(r.uid,120);r.name=str(r.name,200);if(r.nameEn!=null)r.nameEn=str(r.nameEn,200);}}
 o.classes.forEach(c=>{if(c.stage&&!seen.stages.has(c.stage))c.stage='';});
 o.subjects.forEach(s=>{s.classes=Array.isArray(s.classes)?s.classes.filter(u=>seen.classes.has(u)):[];if(s.max&&typeof s.max!=='object')s.max={};});
 o.students=o.students.filter(s=>!s.class||seen.classes.has(s.class));o.students.forEach(s=>{if(s.gender&&!['m','f'].includes(s.gender))s.gender='';});
 o.teaching=o.teaching.filter(t=>t&&seen.teachers.has(t.teacher)&&seen.subjects.has(t.subject)&&(!t.class||seen.classes.has(t.class)));
 o.results=o.results.filter(r=>r&&seen.students.has(r.student)&&seen.subjects.has(r.subject));
 return o;}
function counts(file){const c={};for(const k of [...KINDS,'teaching','results'])c[k]=(file[k]||[]).length;return c;}

// ---- comparing with what the program already has ----
// local: the same shape as the file, every record with key (the program's own id) and uid.
// Fields compared per kind; the class and stage are compared by what they point at.
const FIELDS={stages:['name','nameEn','section'],classes:['name','nameEn','stage','grade'],subjects:['name','nameEn','code'],
  teachers:['name','nameEn','phone','email'],students:['name','nameEn','class','number','gender','dob','nationalId']};
const differs=(f,a,b)=>/^name/.test(f)?norm(a)!==norm(b):String(a)!==String(b==null?'':b);
function lev(a,b){if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;let p=[...Array(b.length+1).keys()];
 for(let i=1;i<=a.length;i++){const c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[b.length];}
function near(a,b){a=norm(a);b=norm(b);if(!a||!b||a===b)return false;const ta=a.split(' '),tb=b.split(' ');
 if(ta.length>=2&&tb.length>=2&&ta[0]===tb[0]&&ta[ta.length-1]===tb[tb.length-1])return true;            // same first and last name
 if(ta.length>=3&&tb.length>=3&&ta.slice(0,3).join(' ')===tb.slice(0,3).join(' '))return true;          // same first three names
 const [sh,lo]=ta.length<=tb.length?[ta,tb]:[tb,ta];if(sh.length>=2&&lo.slice(0,sh.length).join(' ')===sh.join(' '))return true;   // one name is the other with more names after it
 const d=lev(a,b);if(ta.length>=2&&tb.length>=2&&lev(ta[0],tb[0])>1)return false;   // another first name is another person
 return Math.max(a.length,b.length)>=8?d<=2:d<=1;}
/* classKey: the grade number, a stage mark and the section letter, so that «4/أ», «الرابع (أ)» and «الصف الرابع أ» are
   the same class. Returns '' when the name has no grade in it. */
const ORD=[['حادي عشر',11],['ثاني عشر',12],['اول',1],['ثاني',2],['ثالث',3],['رابع',4],['خامس',5],['سادس',6],['سابع',7],['ثامن',8],['تاسع',9],['عاشر',10],
 ['eleventh',11],['twelfth',12],['first',1],['second',2],['third',3],['fourth',4],['fifth',5],['sixth',6],['seventh',7],['eighth',8],['ninth',9],['tenth',10]];
function classKey(name){let s=' '+norm(name)+' ';const st=/متوسط|اعدادي|middle|lower/.test(s)?'m':/ثانوي|secondary|high/.test(s)?'s':'';
 s=s.replace(/ (ال)?(صف|سنه|المرحله|مرحله|grade|year|class|primary|ابتدائي|ابتدائيه|متوسط|المتوسط|اعدادي|الاعدادي|ثانوي|الثانوي|secondary|lower|middle) /g,' ').replace(/ (ال)?(صف|grade|year) /g,' ');
 let g=0;const m=/ (\d{1,2}) /.exec(s);if(m){g=+m[1];s=s.replace(m[0],' ');}else for(const [w,n] of ORD){const r=new RegExp(' (ال)?'+w+' ');if(r.test(s)){g=n;s=s.replace(r,' ');break;}}
 if(!g||g>12)return '';const rest=s.trim().split(' ').filter(Boolean),letter=rest.length===1&&rest[0].length<=2?rest[0]:rest.length?'?'+rest.join(''):'';
 return g+st+'|'+letter;}


/* plan(file, local, opts) → {kinds:{k:{add:[], update:[], same:[]}}, ask:[...], map:{k:{uid:key}}, extra:{teaching, results}}
   opts.include: the kinds to bring in (default all). opts.fields: per kind, the fields this program keeps (others are not compared). */
function plan(file,local,opts={}){const inc=new Set(opts.include||KINDS),out={kinds:{},ask:[],map:{},missing:{}};
 for(const k of KINDS){out.kinds[k]={add:[],update:[],same:[]};out.map[k]={};}
 const resolve=(k,u)=>u&&out.map[k][u]!==undefined?out.map[k][u]:u;   // incoming uid → the program's key (or the uid, for one still to be added)
 const ref={classes:{stage:'stages'},students:{class:'classes'}};
 for(const k of KINDS){const L=(local[k]||[]),byUid=new Map(),byName=new Map(),fields=(opts.fields&&opts.fields[k])||FIELDS[k];
  for(const r of L){for(const u of [r.uid,...(r.uids||[])])if(u)byUid.set(u,r);const n=norm(r.name)+(k==='students'?'|'+(r.class||''):'');if(!byName.has(n))byName.set(n,[]);byName.get(n).push(r);}
  const taken=new Set();
  for(const inc0 of file[k]||[]){if(!inc.has(k))break;
   const r=Object.assign({},inc0);for(const [f,rk] of Object.entries(ref[k]||{}))if(r[f])r[f]=resolve(rk,r[f]);
   let hit=byUid.get(r.uid);
   if(!hit){const n=norm(r.name)+(k==='students'?'|'+(r.class||''):''),list=(byName.get(n)||[]).filter(x=>!taken.has(x.key));if(list.length===1)hit=list[0];
    else if(list.length>1){out.ask.push({kind:k,incoming:r,candidates:list,why:'twins'});continue;}}
   if(!hit&&k==='classes'){const ck=classKey(r.name);if(ck){const list=L.filter(x=>!taken.has(x.key)&&[x.name,...(x.alts||[])].some(nm=>classKey(nm)===ck));if(list.length===1)hit=list[0];else if(list.length>1){out.ask.push({kind:k,incoming:r,candidates:list,why:'twins'});continue;}}}
   if(!hit){const pool=L.filter(x=>!taken.has(x.key)&&(k!=='students'||!r.class||x.class===r.class||!x.class)&&near(x.name,r.name));
    if(k==='students'&&!pool.length){const other=L.filter(x=>!taken.has(x.key)&&norm(x.name)===norm(r.name));if(other.length)pool.push(...other);}   // same name, another class: moved up?
    if(pool.length){out.ask.push({kind:k,incoming:r,candidates:pool.slice(0,4),why:'near'});continue;}
    out.kinds[k].add.push({incoming:r});out.map[k][r.uid]=r.uid;continue;}
   taken.add(hit.key);out.map[k][r.uid]=hit.key;
   const changes={};for(const f of fields){const v=r[f];if(v==null||v==='')continue;if(differs(f,v,hit[f]))changes[f]=v;}
   if(!hit.uid||(hit.uid!==r.uid&&!(hit.uids||[]).includes(r.uid)))changes.__uid=r.uid;
   (Object.keys(changes).filter(f=>f!=='__uid').length?out.kinds[k].update:out.kinds[k].same).push({incoming:r,local:hit,changes});}}
 // teaching and results come along with what they point at
 out.teaching=(file.teaching||[]);out.results=(file.results||[]);
 for(const k of KINDS)if(!inc.has(k))out.missing[k]=(file[k]||[]).length;
 return out;}

/* decide(plan, answers): answers[i] for plan.ask[i] = {same:key} | 'new' | 'skip'. Returns a new plan with the asks settled. */
function decide(p,answers){const q=JSON.parse(JSON.stringify(p));q.ask.forEach((a,i)=>{const ans=answers[i];if(ans==null||ans==='skip'){(q.skipped||(q.skipped=[])).push(a);return;}
  if(ans==='new'){q.kinds[a.kind].add.push({incoming:a.incoming});q.map[a.kind][a.incoming.uid]=a.incoming.uid;return;}
  const hit=a.candidates.find(c=>String(c.key)===String(ans.same));if(!hit){(q.skipped||(q.skipped=[])).push(a);return;}
  q.map[a.kind][a.incoming.uid]=hit.key;const changes={};for(const f of FIELDS[a.kind]){const v=a.incoming[f];if(v!=null&&v!==''&&differs(f,v,hit[f]))changes[f]=v;}changes.__uid=a.incoming.uid;
  (Object.keys(changes).length>1?q.kinds[a.kind].update:q.kinds[a.kind].same).push({incoming:a.incoming,local:hit,changes});});
 q.ask=[];
 // a record that points at something still to be added keeps the uid; anything that points at a matched record gets its key
 for(const k of ['classes','students'])for(const g of ['add','update'])for(const x of q.kinds[k][g]){const f=k==='classes'?'stage':'class',rk=k==='classes'?'stages':'classes',v=x.incoming[f];
  if(v&&q.map[rk][v]!==undefined)x.incoming[f]=q.map[rk][v];if(x.changes&&x.changes[f]&&q.map[rk][x.changes[f]]!==undefined)x.changes[f]=q.map[rk][x.changes[f]];}
 return q;}
function summary(p){const s={};for(const k of KINDS){const g=p.kinds[k];s[k]={add:g.add.length,update:g.update.length,same:g.same.length};}s.ask=p.ask.length;return s;}

// ---- texts, the same in every program ----
const TEXT={
 ar:{exportTitle:'تصدير بيانات المدرسة',exportSub:'ملف واحد يفتح في كل برامج Ooz المدرسية',what:'ماذا تريد أن تضمّن؟',school:'المدرسة والعام الدراسي',schoolSub:'الاسم، الشعار، الأقسام والمراحل',
  stages:'المراحل',classes:'الصفوف',subjects:'المواد',teachers:'المعلمون',teachersTeaching:'المعلمون وتوزيع المواد',students:'الطلاب',results:'النتائج والدرجات',
  nClasses:n=>n+' صفاً',nSubjects:n=>n+' مادة',nTeachers:n=>n+' معلماً',nStudents:n=>n+' طالباً',nStages:n=>n+' مرحلة',whoTeaches:'من يدرّس ماذا',onlyMarks:'متاحة من Ooz Marks',
  doExport:'تصدير الملف',importTitle:'استيراد بيانات المدرسة',importSub:'اختر ملف ‎.oozschool‎ من أي برنامج',pick:'اختيار الملف',pickOther:'اختيار ملف آخر',from:'صُدّر من',contains:'يحتوي الملف على',
  never:'لا حذف أبداً:',neverText:'الاستيراد يضيف ويحدّث فقط، وما ليس في الملف يبقى كما هو.',review:'مراجعة التغييرات',reviewTitle:'مراجعة قبل التنفيذ',reviewSub:'لن يتغير شيء قبل موافقتك',
  add:'جديد',update:'تحديث',same:'بلا تغيير',needYou:n=>n+(n===1?' اسم يحتاج قرارك':n===2?' اسمان يحتاجان قرارك':' أسماء تحتاج قرارك'),needWhy:'تشابه في الاسم بلا رقم ثابت',settled:'تم حسم الأسماء المتشابهة',settledWhy:'يمكنك مراجعتها قبل التنفيذ',show:'عرض',run:'تنفيذ الاستيراد',
  similar:'تشابه في الأسماء',of:' من ',inFile:'في الملف:',sameAs:k=>({students:'نفس الطالب',teachers:'نفس المعلم',classes:'نفس الصف',subjects:'نفس المادة',stages:'نفس المرحلة'})[k],
  existing:'موجود عندك ← تحديث',asNew:k=>({students:'طالب جديد',teachers:'معلم جديد',classes:'صف جديد',subjects:'مادة جديدة',stages:'مرحلة جديدة'})[k],asNewSub:'يُضاف مستقلاً',skip:'تخطٍّ',skipSub:'لا يُستورد هذا الاسم',next:'التالي',done:'تم',
  doneTitle:'تم الاستيراد',doneBig:'اكتمل الاستيراد بنجاح',doneSub:(a,u)=>'أُضيف '+a+' وحُدّث '+u+' — ولم يُحذف شيء',undo:'تراجع',undoNote:'نسخة احتياطية حُفظت قبل الاستيراد',undoAsk:'التراجع عن هذا الاستيراد كله؟',undone:'تم التراجع عن الاستيراد',
  notHere:'لا يستخدمها هذا البرنامج',errors:{notJson:'هذا ليس ملف بيانات مدرسة',notOozschool:'هذا الملف ليس من برامج Ooz المدرسية',badVersion:'إصدار الملف غير صحيح',newerVersion:'الملف من إصدار أحدث، حدّث البرنامج أولاً'},
  otherSchool:(a,b)=>'الملف لمدرسة «'+a+'» والبرنامج لمدرسة «'+b+'». تأكد قبل المتابعة.',ago:'',exported:'تم حفظ الملف',nothing:'لا شيء جديد في الملف'},
 en:{exportTitle:'Export school data',exportSub:'One file that opens in every Ooz school program',what:'What to include?',school:'School and academic year',schoolSub:'Name, logo, sections and stages',
  stages:'Stages',classes:'Classes',subjects:'Subjects',teachers:'Teachers',teachersTeaching:'Teachers and who teaches what',students:'Students',results:'Results and marks',
  nClasses:n=>n+' classes',nSubjects:n=>n+' subjects',nTeachers:n=>n+' teachers',nStudents:n=>n+' students',nStages:n=>n+' stages',whoTeaches:'who teaches what',onlyMarks:'Available from Ooz Marks',
  doExport:'Export the file',importTitle:'Import school data',importSub:'Choose a .oozschool file from any program',pick:'Choose the file',pickOther:'Choose another file',from:'Exported from',contains:'The file contains',
  never:'Nothing is deleted:',neverText:'importing only adds and updates; what is not in the file stays as it is.',review:'Review the changes',reviewTitle:'Review before importing',reviewSub:'Nothing changes until you agree',
  add:'New',update:'Update',same:'Unchanged',needYou:n=>n+(n===1?' name needs your decision':' names need your decision'),needWhy:'Similar names without a fixed number',settled:'Similar names settled',settledWhy:'you can look at them again before importing',show:'Show',run:'Import now',
  similar:'Similar names',of:' of ',inFile:'In the file:',sameAs:k=>({students:'The same student',teachers:'The same teacher',classes:'The same class',subjects:'The same subject',stages:'The same stage'})[k],
  existing:'Already here → update',asNew:k=>({students:'A new student',teachers:'A new teacher',classes:'A new class',subjects:'A new subject',stages:'A new stage'})[k],asNewSub:'Added on its own',skip:'Skip',skipSub:'This name is not imported',next:'Next',done:'Done',
  doneTitle:'Imported',doneBig:'The import is complete',doneSub:(a,u)=>a+' added and '+u+' updated — nothing deleted',undo:'Undo',undoNote:'A backup was kept before the import',undoAsk:'Undo this whole import?',undone:'The import was undone',
  notHere:'Not used by this program',errors:{notJson:'This is not a school data file',notOozschool:'This file is not from the Ooz school programs',badVersion:'The file version is not valid',newerVersion:'The file is from a newer version — update the program first'},
  otherSchool:(a,b)=>'The file is for «'+a+'» and this program is for «'+b+'». Check before going on.',ago:'',exported:'The file was saved',nothing:'Nothing new in the file'}};
const APPS={'Ooz Timetable Studio':'Timetable Studio','Ooz Marks':'Ooz Marks','Ooz School Manager':'School Manager'};
function sameSchool(a,b){a=norm(a);b=norm(b);return !a||!b||a===b||a.includes(b)||b.includes(a)||near(a,b);}

root.OozSchoolSync={classKey,FORMAT,VERSION,EXT,MIME,KINDS,FIELDS,norm,near,build,toText,fileName,parse,counts,plan,decide,summary,TEXT,APPS,sameSchool,SyncError};
})(typeof window!=='undefined'?window:globalThis);
