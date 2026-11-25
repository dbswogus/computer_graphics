import fs from 'node:fs';
import {Blob, Buffer} from 'node:buffer';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';

export async function runPlayerTests(base, html) {
  const elements=new Map(),classes=new Map(),liveBuffers=new Set(),saved=new Map(),events=new Map();
  const noop=()=>{};let nextBuffer=0,clock=100;
  const gl=new Proxy({createBuffer(){const b={id:++nextBuffer};liveBuffers.add(b);return b;},deleteBuffer:b=>liveBuffers.delete(b),getShaderParameter:()=>true,getProgramParameter:()=>true,createShader:()=>({}),createProgram:()=>({}),createTexture:()=>({}),createVertexArray:()=>({}),createFramebuffer:()=>({}),checkFramebufferStatus:()=>1,getParameter:()=>4096,getAttribLocation:()=>0,getUniformLocation:()=>({})},{get:(o,k)=>k in o?o[k]:/^[A-Z_0-9]+$/.test(k)?1:noop});
  const drawing=new Proxy({measureText:s=>({width:String(s).length*12})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  class Element {
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.dataset={};this.listeners={};this.hidden=false;this.value='';this.width=816;this.height=576;this.checked=false;this.classList={toggle:noop,add:noop,remove:noop};}
    set id(value){this._id=value;elements.set(value,this);}get id(){return this._id;}
    set innerHTML(value){for(const match of value.matchAll(/<(\w+)([^>]*?)>/g)){const e=new Element(match[1]),attrs=match[2];const id=attrs.match(/id="([^"]+)"/);if(id)e.id=id[1];const cl=attrs.match(/class="([^"]+)"/);if(cl)for(const c of cl[1].split(' ')){if(!classes.has(c))classes.set(c,[]);classes.get(c).push(e);}e.checked=/\bchecked\b/.test(attrs);e.hidden=/\bhidden\b/.test(attrs);this.children.push(e);}}
    append(...items){this.children.push(...items);}after(){}replaceChildren(...items){this.children=items;}
    querySelector(selector){return selector[0]==='#'?elements.get(selector.slice(1)):classes.get(selector.slice(1))?.[0];}
    setAttribute(key,value){this[key]=value;}addEventListener(name,callback){(this.listeners[name]||=[]).push(callback);}
    dispatch(name,event={}){for(const callback of this.listeners[name]||[])callback({...event,preventDefault:noop});}
    getContext(kind){assert.notEqual(kind,'webgl','WebGL 2 only');return kind==='webgl2'?gl:drawing;}getBoundingClientRect(){return {left:0,top:0,width:this.width,height:this.height};}
    focus(){document.activeElement=this;}setPointerCapture(){}click(){return this.onclick?.();}
  }
  const canvas=new Element('canvas');canvas.id='game';const error=new Element('p');error.id='error';
  const document={hidden:false,head:new Element('head'),body:new Element('body'),activeElement:canvas,createElement:tag=>new Element(tag),getElementById:id=>elements.get(id),addEventListener:noop,fonts:{add:noop,delete:noop}};
  class Image {constructor(){this.width=16;this.height=16;}set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}decode(){return Promise.resolve();}}
  class FontFace {constructor(family){this.family=family;}load(){return Promise.resolve(this);}}
  class Audio {pause(){}play(){return Promise.resolve();}}
  class FileReader {readAsDataURL(file){this.result="data:application/octet-stream;base64,"+Buffer.from(file.bytes).toString("base64");this.onload();}}
  const env={console,document,Image,FontFace,Audio,FileReader,TextDecoder,Uint8Array,Float32Array,Blob,URL:{createObjectURL:()=>'',revokeObjectURL:noop},atob:input=>Buffer.from(input,'base64').toString('binary'),innerWidth:1440,innerHeight:1000,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,queueMicrotask:noop,performance:{now:()=>clock},isSecureContext:true,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},addEventListener:(name,cb)=>events.set(name,cb),removeEventListener:name=>events.delete(name)};
  env.window=env;env.screen={orientation:{angle:0}};
  const context=vm.createContext(env);const run=source=>vm.runInContext(source,context);

  const projectMatch=html.match(/<script type="application\/json" id="onggi-project">([\s\S]*?)<\/script>/);
  assert(projectMatch,'embedded project');const json=new Element('script');json.id='onggi-project';json.textContent=projectMatch[1];const loading=new Element('p');loading.id='player-loading';
  assert(!/<script[^>]+src=/.test(html),'all game scripts inline');
  for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(match[1].includes('application/json'))continue;await run(match[2]);}
  assert(run('PlayerGame.isReady()'),'player initialization');assert(!elements.has('map-editor'),'no editor UI');assert(!elements.has('export-player'),'no exporter UI');assert(run("typeof MapEditor==='undefined'"),'no editor runtime');
  const settings=JSON.parse(projectMatch[1]).ui;
  if(settings.texts?.drawTitle_01)assert.equal(run('UI_TEXT.drawTitle_01'),settings.texts.drawTitle_01,'exported text applied');
  if(settings.floorAssetId)assert(run('StudioUI.settings.floorAssetId')===settings.floorAssetId,'floor setting preserved');
  if(settings.onggiAssets?.['0'])assert(run('AssetBank.drawOnggi(identity(),0,0,1)'),'exported onggi model used');

  function finishAddedPages(){for(let i=0;i<200;i++){const current=run('screen');if(current==='custom-ui')run("action('page-next')");else if(current==='monologue')run("action('dialogue-next')");else break;}}
  elements.get('choose-manual').click();run("action('select');action('pot1');action('start');");finishAddedPages();assert(run("screen==='play'&&stage===0&&selected===1"),'player starts selected pot');
  run('keys.add("ArrowRight");var before=px;for(let i=0;i<50;i++)tick(1/120);keys.clear();');assert(run('px>before'),'player input/physics');
  for(let index=0;index<run('STAGES.length');index++){
    run('var goal=STAGES[stage].route.at(-1);px=goal[0];pz=goal[1];vx=vz=0;tick(1/120);');finishAddedPages();
  }
  run('for(let i=0;i<250;i++)tick(1/120);');assert(run("screen==='finish'"),'all player maps finish');
  run("action('replay')");finishAddedPages();assert(run("screen==='play'&&stage===0"),'player replay');
  return 'PASS: single HTML embedded project/scripts/assets; no editor UI/runtime; initialization, control selection, pot selection, physics, full campaign and replay (mock DOM/GPU).';
}
