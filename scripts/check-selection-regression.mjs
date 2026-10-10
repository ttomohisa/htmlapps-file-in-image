// Deterministic source-level regression using synthetic inputs only.
// DOM, image decode, PNG canvas, and Worker scheduling are controlled doubles;
// production selection, crypto, compression, placement, and verification code runs unchanged.
// This does not replace browser, visual, native-PNG, or network QA.
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const source = readFileSync(process.argv[2] || new URL('../src/index.template.html', import.meta.url), 'utf8');
const script = source.match(/<script>\s*\(\(\) => \{([\s\S]*?)\}\)\(\);\s*<\/script>/)[1]
  .replace('__APP_CONFIG_JSON__', JSON.stringify({ slug:'test', name:'Test', nameJa:'テスト', version:'1', defaultLanguage:'en' }))
  .replace('__BUILD_MANIFEST_JSON__', '{}').replace('__EMBEDDED_ASSET_BUNDLE_JSON__', '{}');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;}); return {promise,resolve,reject}; };
const tick = () => new Promise(resolve => setImmediate(resolve));
async function until(predicate,timeoutMs=2000) {
  const deadline=performance.now()+timeoutMs;
  while(performance.now()<deadline) {
    if(predicate()) return;
    await new Promise(resolve=>setTimeout(resolve,1));
  }
  assert.ok(predicate(),'Expected asynchronous boundary was not reached');
}
// Host crypto/compression completions may arrive after many immediate turns.
test('asynchronous boundary wait permits a delayed host completion', async()=>{
  let reached=false;
  const timer=setTimeout(()=>{reached=true;},25);
  try { await until(()=>reached); assert.equal(reached,true); }
  finally { clearTimeout(timer); }
});
test('asynchronous boundary wait fails within its explicit deadline', async()=>{
  const start=performance.now();
  await assert.rejects(until(()=>false,20),/Expected asynchronous boundary was not reached/);
  assert.ok(performance.now()-start>=20,'The deadline, not an immediate-turn count, bounds the wait');
});
function pixels(width=64,height=64,opaque=true) {
  const data=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<data.length;i+=4) { data[i]=(i*7)&255;data[i+1]=(i*13)&255;data[i+2]=(i*23)&255;data[i+3]=opaque?255:0; }
  return {data,width,height};
}
const carrier = (name='carrier.png',gate=null,extra={}) => ({name,size:900,type:'image/png',decodeGate:gate?.promise,imageData:pixels(),...extra});
const payload = (name='payload.bin',gate=null,bytes=Uint8Array.of(11,22,33),extra={}) => ({name,size:bytes.length,type:'application/octet-stream',arrayBuffer:async()=>{await gate?.promise;return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length);},...extra});
function harness() {
  const elements=new Map(),urls=new Map(),revoked=[],downloads=[],workers=[];
  const controls={pngGate:null,verifyGate:null,workerGate:null,verifyStarted:false,pngStarted:false};
  let nextUrl=0,focus=null;
  function element(selector) {
    if(elements.has(selector)) return elements.get(selector);
    const classes=new Set(),attrs=new Map(),listeners=new Map();
    const el={value:'',checked:false,textContent:'',hidden:false,disabled:false,src:'',alt:'',title:'',dataset:{},type:'password',
      classList:{add(...xs){xs.forEach(x=>classes.add(x));},remove(...xs){xs.forEach(x=>classes.delete(x));},toggle(x,on){if(on??!classes.has(x))classes.add(x);else classes.delete(x);},contains:x=>classes.has(x)},
      setAttribute(k,v){attrs.set(k,String(v));},getAttribute:k=>attrs.get(k),removeAttribute(k){attrs.delete(k);if(k==='src')this.src='';},
      addEventListener(k,fn){const a=listeners.get(k)||[];a.push(fn);listeners.set(k,a);},
      dispatch(k,event={}){for(const fn of listeners.get(k)||[])fn({stopPropagation(){},preventDefault(){},target:el,...event});},
      click(){if(!this.disabled)this.dispatch('click');},focus(){focus=selector;},select(){},closest(){return el;},querySelector:s=>element(`${selector} ${s}`),showModal(){},close(){}};
    elements.set(selector,el);return el;
  }
  // Index relevant static attributes so the actual event handlers and translations run.
  const attributed=[];
  for(const match of source.matchAll(/<[^!][^>]*>/g)) {
    const tag=match[0], id=tag.match(/\bid="([^"]+)"/)?.[1];
    if(!id&&!tag.includes('data-i18n'))continue;
    const el=element(id?`#${id}`:`tag-${attributed.length}`);
    for(const m of tag.matchAll(/\bdata-([a-z0-9-]+)="([^"]+)"/g))el.dataset[m[1].replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=m[2];
    el.hidden=/\shidden(?:\s|>)/.test(tag);el.disabled=/\sdisabled(?:\s|>)/.test(tag);attributed.push(el);
  }
  const document={documentElement:{lang:''},querySelector:element,querySelectorAll(selector){
    const key=selector.match(/^\[data-([a-z0-9-]+)\]$/)?.[1]?.replace(/-([a-z])/g,(_,x)=>x.toUpperCase());
    return key?attributed.filter(el=>Object.hasOwn(el.dataset,key)):[];
  },createElement(type){
    if(type==='a')return {click(){downloads.push({filename:this.download,blob:urls.get(this.href)});}};
    assert.equal(type,'canvas');let current;
    return {getContext:()=>({drawImage(img){current=img.imageData;},getImageData(){return structuredClone(current);},putImageData(data){current=data;}}),async toBlob(callback){controls.pngStarted=true;await controls.pngGate?.promise;const blob=new Blob(['synthetic PNG boundary'],{type:'image/png'});blob.imageData=structuredClone(current);blob.generated=true;callback(blob);}};
  }};
  const URL={createObjectURL(blob){const url=`blob:synthetic-${++nextUrl}`;urls.set(url,blob);return url;},revokeObjectURL(url){revoked.push(url);urls.delete(url);}};
  class Image {
    async decode(){const file=urls.get(this.src);if(file.generated){controls.verifyStarted=true;await controls.verifyGate?.promise;}await file.decodeGate;if(file.bad)throw Error('bad');this.imageData=file.imageData;this.naturalWidth=file.imageData.width;this.naturalHeight=file.imageData.height;}
  }
  class ImageData {constructor(data,width,height){Object.assign(this,{data,width,height});}}
  class Worker {
    terminated=false;
    constructor(url){this.url=url;workers.push(this);}
    terminate(){this.terminated=true;}
    async postMessage(message,transfers){
      const copied=structuredClone(message,{transfer:transfers});
      const workerSource=await urls.get(this.url).text();await controls.workerGate?.promise;if(this.terminated)return;
      const self={postMessage:data=>{if(!this.terminated)this.onmessage?.({data});}};
      new Function('self',workerSource)(self);self.onmessage({data:copied});
    }
  }
  const factory=new Function('document','URL','Image','ImageData','Worker','crypto','window','localStorage','navigator','setTimeout','clearTimeout',script+`
    return {state,selectCarrier,selectPayload,runEmbed,selectExtractImage,runExtract,element:$,t,applyLanguage,
      clear:kind=>{const button=$('#clear'+(kind==='carrier'?'Carrier':'Payload')+'Button');button.click();},
      generation:()=>generation};`);
  const api=factory(document,URL,Image,ImageData,Worker,webcrypto,{addEventListener(){}},{getItem(){return null;},setItem(){}},{language:'en'},()=>0,()=>{});
  return {...api,controls,urls,revoked,downloads,workers,focus:()=>focus};
}
async function ready(api) {await api.selectCarrier(carrier());await api.selectPayload(payload());}
function noOutput(api){assert(api.state.encodedBlob===null,'stale output must be absent');assert.equal(api.state.encodedVerified,false);assert.equal(api.element('#savePngButton').disabled,true);assert.equal(api.element('#embedResult').hidden,true);}
function bothReady(api){assert(api.state.carrier);assert(api.state.payload);assert.equal(api.element('#embedButton').disabled,false);}

for(const first of ['carrier','payload'])test(`independent ${first} load survives other input completion`,async()=>{
  const a=harness(),gate=deferred();const pending=first==='carrier'?a.selectCarrier(carrier('a.png',gate)):a.selectPayload(payload('a.bin',gate));
  await(first==='carrier'?a.selectPayload(payload()):a.selectCarrier(carrier()));
  assert.equal(a.element('#embedButton').disabled,true);const pendingStatus=a.element('#embedStatus').textContent;
  gate.resolve();await pending;bothReady(a);assert.notEqual(pendingStatus,'');assert.equal(a.element('#embedStatus').textContent,'');
});
for(const kind of ['carrier','payload'])test(`latest ${kind} wins over old success and failure`,async()=>{
  for(const reject of [false,true]){const a=harness(),gate=deferred(),select=kind==='carrier'?a.selectCarrier:a.selectPayload,make=kind==='carrier'?carrier:payload;
    const old=select(make('old',gate));await select(make('new'));if(reject)gate.reject(Error('old failed'));else gate.resolve();await old;
    assert.equal(a.state[kind].file.name,'new');assert.equal(a.element('#embedError').textContent,'');}
});
for(const kind of ['carrier','payload'])for(const loading of [false,true])test(`clear ${kind} ${loading?'loading':'selected'} retains the other source and cannot resurrect`,async()=>{
  const a=harness();await ready(a);a.element('#outputFilename').value='custom export';a.element('#passwordProtectToggle').checked=true;a.element('#embedPassword').value='secret';a.element('#embedPasswordConfirm').value='secret';
  const other=kind==='carrier'?'payload':'carrier',retained=a.state[other],gate=deferred();let pending;
  if(loading)pending=kind==='carrier'?a.selectCarrier(carrier('pending',gate)):a.selectPayload(payload('pending',gate));
  assert.equal(a.element(kind==='carrier'?'#clearCarrierButton':'#clearPayloadButton').disabled,false);
  a.state.encodedBlob=new Blob(['old']);a.state.encodedVerified=true;a.element('#savePngButton').disabled=false;a.element('#embedResult').hidden=false;
  a.clear(kind);assert(a.state[kind]===null,`${kind} must be empty`);assert.equal(a.state[other],retained);assert.equal(a.element('#embedPassword').value,'secret');assert.equal(a.element('#passwordProtectToggle').checked,true);
  assert.equal(a.focus(),kind==='carrier'?'#chooseCarrierButton':'#choosePayloadButton');assert.equal(a.element(kind==='carrier'?'#clearCarrierButton':'#clearPayloadButton').disabled,true);
  if(kind==='payload')assert.equal(a.element('#outputFilename').value,'custom export');else {assert.equal(a.element('#carrierThumb').src,'');assert.equal(a.element('#carrierName').textContent,'');}
  noOutput(a);gate.resolve();await pending;assert(a.state[kind]===null,`${kind} must be empty`);noOutput(a);
  for(let i=0;i<2;i++){await(kind==='carrier'?a.selectCarrier(carrier()):a.selectPayload(payload()));bothReady(a);a.clear(kind);}assert.equal(a.state[other],retained);
});
test('clear one pending source leaves the other pending source and its status intact',async()=>{
  const a=harness(),cg=deferred(),pg=deferred();const c=a.selectCarrier(carrier('a',cg)),p=a.selectPayload(payload('b',pg));a.clear('carrier');
  assert.notEqual(a.element('#embedStatus').textContent,'');assert.equal(a.element('#clearPayloadButton').disabled,false);pg.resolve();await p;cg.resolve();await c;assert(a.state.payload);assert.equal(a.state.carrier,null);assert.equal(a.element('#embedStatus').textContent,'');
});
for(const invalid of ['carrier','payload'])test(`${invalid} error survives independent completion until that input changes`,async()=>{
  const a=harness(),gate=deferred(),pending=invalid==='carrier'?a.selectPayload(payload('p',gate)):a.selectCarrier(carrier('c',gate));
  await(invalid==='carrier'?a.selectCarrier(carrier('bad',null,{type:'text/plain'})):a.selectPayload(payload('big',null,undefined,{size:32*1024*1024+1})));
  const message=a.element('#embedError').textContent;assert.notEqual(message,'');gate.resolve();await pending;assert.equal(a.element('#embedError').textContent,message);assert.equal(a.element('#embedButton').disabled,true);
  await(invalid==='carrier'?a.selectCarrier(carrier()):a.selectPayload(payload()));bothReady(a);assert.equal(a.element('#embedError').textContent,'');
});
test('invalid image, transparent carrier, empty payload, exact size limit and capacity remain enforced',async()=>{
  const a=harness();await a.selectCarrier(carrier('bad',null,{bad:true}));assert.equal(a.state.carrier,null);await a.selectCarrier(carrier('transparent',null,{imageData:pixels(64,64,false)}));assert.equal(a.state.carrier,null);
  await a.selectCarrier(carrier());await a.selectPayload(payload('empty',null,new Uint8Array()));bothReady(a);
  let read=false;await a.selectPayload(payload('oversize',null,undefined,{size:32*1024*1024+1,arrayBuffer:async()=>{read=true;return new ArrayBuffer(0);}}));assert.equal(read,false);assert.equal(a.state.payload,null);
  await a.selectPayload(payload('limit',null,new Uint8Array(32*1024*1024)));assert.equal(a.state.payload.bytes.byteLength,32*1024*1024);
  const random=webcrypto.getRandomValues(new Uint8Array(4096));await a.selectPayload(payload('large',null,random));assert.equal(a.element('#embedButton').disabled,true);assert.equal(a.element('#fitStatus').className,'fit-status bad');
  await a.selectPayload(payload());a.element('#passwordProtectToggle').checked=true;a.element('#embedPassword').value='a';a.element('#embedPasswordConfirm').value='b';a.element('#embedPasswordConfirm').dispatch('input');assert.equal(a.element('#embedButton').disabled,true);
});
test('clearing carrier releases preview and both file picker values',async()=>{
  const a=harness();await ready(a);const url=a.element('#carrierThumb').src;assert(a.urls.has(url));a.element('#carrierInput').value='fake';a.element('#payloadInput').value='fake';a.clear('carrier');a.clear('payload');assert(a.revoked.includes(url));assert(!a.urls.has(url));assert.equal(a.element('#carrierInput').value,'');assert.equal(a.element('#payloadInput').value,'');
});
test('clear controls have localized specific names, disabled empty state, and native button semantics',()=>{
  const a=harness();for(const kind of ['Carrier','Payload']){assert(new RegExp(`<button[^>]+id="clear${kind}Button"[^>]+type="button"`).test(source),`Missing clear ${kind} button`);assert.equal(a.element(`#clear${kind}Button`).disabled,true);assert(a.element(`#clear${kind}Button`).getAttribute('aria-label'));}
  assert.match(a.element('#clearCarrierButton').getAttribute('aria-label'),/carrier/i);a.element('#languageButton').click();assert.match(a.element('#clearCarrierButton').getAttribute('aria-label'),/画像/);assert.match(a.element('#clearPayloadButton').getAttribute('aria-label'),/ファイル/);assert.match(source,/\.button\.subtle\s*\{[^}]*min-height:\s*44px/);
});
for(const boundary of ['worker','png','verify'])for(const kind of ['carrier','payload'])test(`clear ${kind} during ${boundary} prevents stale Save, then fresh embed succeeds`,async()=>{
  const a=harness();await ready(a);const gate=deferred();a.controls[`${boundary}Gate`]=gate;const pending=a.runEmbed();await until(()=>boundary==='worker'?a.workers.length>0:boundary==='png'?a.controls.pngStarted:a.controls.verifyStarted);
  a.clear(kind);noOutput(a);gate.resolve();await pending;noOutput(a);a.controls[`${boundary}Gate`]=null;
  await(kind==='carrier'?a.selectCarrier(carrier()):a.selectPayload(payload()));await a.runEmbed();assert.equal(a.state.encodedVerified,true);assert.equal(a.element('#savePngButton').disabled,false);
});
for(const encrypted of [false,true])test(`${encrypted?'encrypted':'plain'} round trip after clear retains bytes and custom output name`,async()=>{
  const a=harness();await ready(a);a.clear('payload');await a.selectPayload(payload('message.bin'));a.element('#outputFilename').value='my custom name';if(encrypted){a.element('#passwordProtectToggle').checked=true;a.element('#embedPassword').value='test password';a.element('#embedPasswordConfirm').value='test password';}
  await a.runEmbed();assert.equal(a.state.encodedVerified,true);a.element('#savePngButton').click();assert.equal(a.downloads[0].filename,'my custom name.png');
  const blob=a.state.encodedBlob;blob.name='encoded.png';await a.selectExtractImage(blob);if(encrypted)a.element('#extractPassword').value='test password';await a.runExtract();assert.deepEqual(Array.from(a.state.recovered.fileBytes),[11,22,33]);assert.equal(a.state.recovered.filename,'message.bin');
});
