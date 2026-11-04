'use strict';
// Pure learning rules, also used by the regression tests.
const Study = (() => {
const blank=()=>({version:1,records:{},active:null});
function validate(d){
 if(!d||d.version!==1||!Array.isArray(d.english)||!Array.isArray(d.kanji))throw Error('version:1、english配列、kanji配列が必要です。');
 const ids=new Set();let result={version:1,source:String(d.source||'確認済み教材'),english:[],kanji:[]};
 for(const subject of ['english','kanji'])for(const w of d[subject]){
  if(!w||typeof w.id!=='string'||!w.id.trim()||ids.has(w.id))throw Error('問題IDが空、または重複しています。');ids.add(w.id);
  if(!['prompt','answer'].every(k=>typeof w[k]==='string'&&w[k].trim()))throw Error(w.id+': 問題文と正解が必要です。');
  if(!Array.isArray(w.choices)||w.choices.length!==4||!w.choices.every(c=>typeof c==='string'&&c.trim())||new Set(w.choices.map(c=>c.trim())).size!==4||!w.choices.includes(w.answer))throw Error(w.id+': 正解を含む重複のない4択が必要です。');
  if(subject==='english'&&!['最重要','重要','プラスアルファ'].includes(w.level))throw Error(w.id+': 重要度が不正です。');
  if(subject==='kanji'&&(!Number.isInteger(w.lesson)||w.lesson<13||w.lesson>18))throw Error(w.id+': 第13〜18回を指定してください。');
  result[subject].push({id:w.id,prompt:w.prompt,answer:w.answer,choices:[...w.choices],...(subject==='english'?{level:w.level}:{lesson:w.lesson})});
 }
 for(let n=13;n<=18;n++){const count=result.kanji.filter(w=>w.lesson===n).length;if(count!==0&&count!==20)throw Error('漢字第'+n+'回は20問必要です（現在'+count+'問）。');}
 return result;
}
const fingerprint=d=>JSON.stringify([d.english,d.kanji]);
const done=(s,id)=>Boolean(s.records[id]?.seen);
const weak=(s,id)=>Boolean(s.records[id]?.wrong);
function unlocked(d,s){const core=d.english.filter(w=>w.level!=='プラスアルファ');return core.length>0&&core.every(w=>done(s,w.id));}
function pool(d,s,subject,key){let all=d[subject];if(key==='review')return all.filter(w=>weak(s,w.id));if(subject==='english')return all.filter(w=>key==='core'?w.level!=='プラスアルファ':w.level==='プラスアルファ');return all.filter(w=>w.lesson===Number(key));}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function start(d,s,subject,key){
 if(s.active&&s.active.subject===subject&&s.active.key===key)return s.active;
 if(subject==='english'&&key==='extra'&&!unlocked(d,s))throw Error('最重要＋重要を全問学習してから進めます。');
 let p=pool(d,s,subject,key);if(!p.length)throw Error('出題できる問題がありません。');
 if(key!=='review'){const todo=p.filter(w=>!done(s,w.id));if(todo.length)p=todo;}
 p=p.slice(0,20);
 s.active={subject,key,ids:p.map(w=>w.id),choices:p.map(w=>shuffle(w.choices)),index:0,answers:[],score:0};return s.active;
}
function answer(d,s,value){const a=s.active;if(!a||a.answers.length>a.index)return false;const w=d[a.subject].find(w=>w.id===a.ids[a.index]);if(!w||!a.choices[a.index].includes(value))return false;const correct=value===w.answer;a.answers.push(value);a.score+=correct?1:0;const r=s.records[w.id]||{seen:false,wrong:false,right:0,miss:0};r.seen=true;r.wrong=!correct;r[correct?'right':'miss']++;s.records[w.id]=r;return true;}
function next(s){const a=s.active;if(!a||a.answers.length<=a.index)return false;if(a.index===a.ids.length-1){s.active=null;return true;}a.index++;return false;}
function validState(s,d){
 if(!s||s.version!==1||!s.records||typeof s.records!=='object'||Array.isArray(s.records))throw Error('学習記録の形式が不正です。');
 const ids=new Set([...d.english,...d.kanji].map(w=>w.id));
 for(const [id,r] of Object.entries(s.records))if(!ids.has(id)||!r||typeof r.seen!=='boolean'||typeof r.wrong!=='boolean'||!Number.isInteger(r.right)||r.right<0||!Number.isInteger(r.miss)||r.miss<0)throw Error('学習記録の内容が不正です。');
 if(s.active){const a=s.active;if(!['english','kanji'].includes(a.subject)||!['core','extra','review','13','14','15','16','17','18'].includes(a.key)||!Array.isArray(a.ids)||a.ids.length<1||a.ids.length>20||new Set(a.ids).size!==a.ids.length||!Number.isInteger(a.index)||a.index<0||a.index>=a.ids.length||!Array.isArray(a.answers)||![a.index,a.index+1].includes(a.answers.length)||!Array.isArray(a.choices)||a.choices.length!==a.ids.length)throw Error('途中の学習記録が不正です。');
 const words=a.ids.map(id=>d[a.subject].find(w=>w.id===id));
 if(words.some((w,i)=>!w||!Array.isArray(a.choices[i])||JSON.stringify([...a.choices[i]].sort())!==JSON.stringify([...w.choices].sort()))||a.answers.some((v,i)=>!a.choices[i].includes(v))||a.score!==a.answers.filter((v,i)=>v===words[i].answer).length)throw Error('回答・選択肢の記録が不正です。');
 }
 return s;
}
return {blank,validate,fingerprint,done,weak,unlocked,pool,start,answer,next,validState};
})();
if(typeof module!=='undefined')module.exports=Study;
