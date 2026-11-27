import fs from 'node:fs';
import {Blob, Buffer} from 'node:buffer';
import {TextEncoder} from 'node:util';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';

export async function runStudioTests(base, {onExport,onFolderExport} = {}) {
  const startupTasks=[];
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
  const audioPlays=[];
  class Audio {constructor(src){this.src=src;}pause(){this.paused=true;}play(){audioPlays.push({src:this.src,loop:this.loop,volume:this.volume});return Promise.resolve();}}
  class FileReader {readAsDataURL(file){this.result="data:application/octet-stream;base64,"+Buffer.from(file.bytes).toString("base64");this.onload();}}
  const env={console,document,Image,FontFace,Audio,FileReader,TextEncoder,TextDecoder,Uint8Array,Float32Array,Blob,URL:{createObjectURL:()=>'',revokeObjectURL:noop},atob:input=>Buffer.from(input,'base64').toString('binary'),innerWidth:1440,innerHeight:1000,devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,queueMicrotask:task=>startupTasks.push(task),performance:{now:()=>clock},isSecureContext:true,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},addEventListener:(name,cb)=>events.set(name,cb),removeEventListener:name=>events.delete(name)};
  env.window=env;env.screen={orientation:{angle:0}};
  const context=vm.createContext(env);const run=source=>vm.runInContext(source,context);
  const html=fs.readFileSync(path.join(base,'index.html'),'utf8');const scripts=[...html.matchAll(/<script defer src="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(scripts).size,scripts.length,'no duplicate scripts');
  // 구버전 HTML 저장/불러오기 회귀 검증용 템플릿. 실제 편집기 index에서는 로드하지 않습니다.
  if(!scripts.includes('src/export/PlayerBundle.js'))run(fs.readFileSync(path.join(base,'src/export/PlayerBundle.js'),'utf8'));
  for(const file of scripts)run(fs.readFileSync(path.join(base,file),'utf8'));
  const check=(condition,message)=>assert(run(condition),message);
  assert(!elements.get('map-editor').hidden,'editor entry opens editor');assert(elements.get('control-dialog').hidden,'editor has no blocking control dialog');elements.get('choose-manual').click();
  const shellBefore=JSON.stringify(run('MapEditor.exportProject()'));
  assert(!elements.get('workspace-map').hidden && elements.get('studio-design').hidden && elements.get('team-files').hidden,'map-only default view');
  run("EditorShell.switchWorkspace('design')");assert(elements.get('workspace-map').hidden && !elements.get('studio-design').hidden,'design workspace');
  run("EditorShell.switchWorkspace('team')");assert(elements.get('studio-design').hidden && !elements.get('team-files').hidden,'team workspace');
  run("EditorShell.switchWorkspace('map')");assert.equal(JSON.stringify(run('MapEditor.exportProject()')),shellBefore,'navigation preserves editor data');
  for(const id of ['asset-onggi','asset-floor','asset-place','asset-image','asset-font'])assert(elements.get(id).hidden,'legacy asset action hidden: '+id);
  console.log('PASS: compact map/design/team navigation preserves state and hides duplicate asset actions.');
  const baseline=liveBuffers.size;run('MapEditor.open()');check("screen==='editor'",'editor pause');
  check('MapEditor.getMap().blocks.every(b=>b.w===1&&b.d===1&&Number.isInteger(b.x-.5)&&Number.isInteger(b.z-.5))','unit grid migration');
  const count=run('MapEditor.getMap().blocks.length');const board=elements.get('editor-board');board.dispatch('pointerdown',{button:0,pointerId:1,clientX:15.5*48,clientY:1.5*48});board.dispatch('pointerup');assert.equal(run('MapEditor.getMap().blocks.length'),count+1);
  elements.get('editor-undo').click();assert.equal(run('MapEditor.getMap().blocks.length'),count);elements.get('editor-redo').click();
  run("MapEditor.manageMap('add')");check('MapEditor.exportProject().maps.length===2','add map');
  run("MapEditor.manageMap('copy')");check('MapEditor.exportProject().maps.length===3','copy map');
  run("MapEditor.manageMap('delete')");check('MapEditor.exportProject().maps.length===2','delete map');
  elements.get('editor-undo').click();check('MapEditor.exportProject().maps.length===3','undo deletion');elements.get('editor-redo').click();
  for(let repeat=0;repeat<2;repeat++){
    run('MapEditor.play();keys.add("ArrowRight");var initialX=px;for(let i=0;i<50;i++)tick(1/120);keys.clear();');check('px>initialX','movement');
    check('STAGES.length===2&&STAGES[0].editorStage','campaign stage count');
    run('var goal=STAGES[0].route.at(-1);px=goal[0];pz=goal[1];vx=vz=0;tick(1/120);');check("stage===1&&screen==='play'",'next custom map');
    run('var goal=STAGES[1].route.at(-1);px=goal[0];pz=goal[1];vx=vz=0;tick(1/120);for(let i=0;i<250;i++)tick(1/120);');check("screen==='finish'",'campaign finish');
    run('MapEditor.open()');check("STAGES.length===3&&STAGES[0].name==='공방'",'original maps restored');assert.equal(liveBuffers.size,baseline,'no repeated test buffer leak');
  }
  run("StudioUI.apply({...StudioUI.exportData(),fontFamily:'serif',fontScale:1.3,layout:{drawTitle:{text_01:{x:321}}}})");check("GAME_CONFIG.ui.fontFamily==='serif'&&UI_LAYOUT.drawTitle.text_01.x===321",'UI setting applied');
  run('var project=MapEditor.exportProject()');check('project.maps.length===2&&project.ui.fontScale===1.3','project export');
  context.goodFile={size:100,text:async()=>JSON.stringify(run('MapEditor.exportProject()'))};await run('MapEditor.load(goodFile)');check('MapEditor.exportProject().maps.length===2','project import');
  const legacyProject = JSON.stringify(run('MapEditor.exportProject()'));
  elements.get('editor-empty').click();
  elements.get('editor-all-maps').checked = false;
  const picker = elements.get('editor-tool-picker');
  function place(tool,x,z) {
    picker.value = tool;
    picker.onchange();
    board.dispatch('pointerdown',{button:0,pointerId:8,clientX:(x+9)*48,clientY:(z+6)*48});
    board.dispatch('pointerup');
  }
  for (let x=-5.5; x<=5.5; x++) for (let z=-2.5; z<=2.5; z++) place('floor',x,z);
  place('start',-4.5,.5);
  place('checkpoint',-.5,.5);
  place('goalO',3.5,-1.5);
  place('goalX',3.5,1.5);
  const wallPresets = Object.keys(run('BlockMap.presets'));
  wallPresets.forEach((tool,i)=>place(tool,-5.5+i,-3.5));
  const question = elements.get('editor-quiz-question'), answer = elements.get('editor-quiz-answer');
  question.value = '옹기는 흙으로 만들어요.';
  question.onchange();
  check('BlockMap.compile(BlockMap.quizExample()).quizGoals.every(b=>b.room)','example rooms are ready to play');
  const quizProject = JSON.stringify(run('MapEditor.exportProject()'));
  const mapSource = run("TeamFiles.createSource('map')");
  elements.get('editor-empty').click();
  context.quizMapFile = {size:mapSource.length,text:async()=>mapSource};
  assert(await run("TeamFiles.importRole('map',quizMapFile)"),'quiz map source import');
  check('MapEditor.getMap().blocks.filter(b=>b.preset).length===8','all directional wall and corner presets restored');
  check('BlockMap.compile(MapEditor.getMap()).editorWalls.filter(w=>!w.roomId).length===12','four walls and four L corners produce twelve collision segments');
  context.quizBackup = {size:quizProject.length,text:async()=>quizProject};
  assert(await run('MapEditor.load(quizBackup)'),'quiz project backup import');
  assert.equal(question.value,'옹기는 흙으로 만들어요.');
  check('MapEditor.getMap().blocks.filter(b=>b.room && b.w===3 && b.d===3).length===2','both room footprints persist');
  check('BlockMap.compile(MapEditor.getMap()).editorWalls.filter(w=>w.roomId).length===10','rooms contain solid walls and an entrance');
  for (const rightAnswer of ['O','X']) {
    answer.value = rightAnswer;
    answer.onchange();
    elements.get('editor-play').click();
    check("screen==='select'&&MapEditor.isChoosing()",'test button opens onggi selection first');
    run("action('pot2');action('guide')");check("screen!=='select'&&selected===2&&!MapEditor.isChoosing()",'departing from selection starts the test with the chosen onggi');
    check('STAGES[0].quiz.answer==='+JSON.stringify(rightAnswer),'editor answer is used by play test');
    run('drawPlay();px=-.5;pz=.5;tick(1/120);');
    check('checkpoint.index===1','quiz stage saves checkpoint');
    run('var wrong=STAGES[0].crumbles.find(b=>b.quizTrap);px=wrong.x-1;pz=wrong.z;tick(1/120);');
    check('!falling && screen==="play"','entering wrong room does not trigger collapse');
    run('px=wrong.x;pz=wrong.z;tick(1/120);');
    check('falling && crumbles.some(c=>c.down>0)','wrong tile collapses and drops player');
    run('for(let i=0;i<150;i++)tick(1/120);');
    check('!falling&&px===checkpoint.x&&pz===checkpoint.z&&crumbles.every(c=>!c.down)','respawn restores checkpoint and trap');
    run('px=STAGES[0].goalBlock.x-1;pz=STAGES[0].goalBlock.z;tick(1/120);');
    check('screen==="play"&&!done','entering correct room does not clear it');
    run('px=STAGES[0].goalBlock.x;pz=STAGES[0].goalBlock.z;tick(1/120);');
    check('done || screen==="arrival"','correct tile clears stage');
    run('MapEditor.open()');
  }
  context.restoreLegacy = {size:legacyProject.length,text:async()=>legacyProject};
  assert(await run('MapEditor.load(restoreLegacy)'),'legacy project remains loadable');
  elements.get('editor-all-maps').checked = true;
  console.log('PASS: palette placement, eight directional presets, quiz config and project round trip, both answers, collapse and checkpoint respawn.');
  const original=JSON.stringify(run('MapEditor.exportProject()'));context.badFile={size:12,text:async()=>'{broken'};await run('MapEditor.load(badFile)');assert.equal(JSON.stringify(run('MapEditor.exportProject()')),original,'invalid import atomic');
  assert.throws(()=>run("StudioUI.validate({fontScale:99})"));assert.throws(()=>run("ProjectData.validate({kind:'onggi-project',version:4,maps:[],assets:[]})"));
  const obj='v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3';context.obj=obj;check('AssetBank.parseOBJ(obj).vertices.length===9','OBJ triangles');assert.throws(()=>run("AssetBank.parseOBJ('v 0 0 0\\nf 1 2 3')"));
  context.assetData=[{id:'model-test',name:'triangle.obj',kind:'model',data:'data:text/plain;base64,'+Buffer.from(obj).toString('base64')}];await run('AssetBank.prepare(assetData).then(AssetBank.applyPrepared)');check('AssetBank.list().length===1','model import');
  context.imageData=[{id:'image-test',name:'picture.png',kind:'image',data:'data:image/png;base64,AA=='}];await run('AssetBank.prepare(imageData).then(AssetBank.applyPrepared)');check("AssetBank.image('image-test').width===16",'image loaded');

  const records=[
    {id:'model-test',name:'triangle.obj',kind:'model',data:'data:text/plain;base64,'+Buffer.from(obj).toString('base64')},
    {id:'image-test',name:'picture.png',kind:'image',data:'data:image/png;base64,AA=='},
    {id:'font-test',name:'sample.ttf',kind:'font',data:'data:font/ttf;base64,AA=='},
    {id:'sound-test',name:'sample.wav',kind:'audio',data:'data:audio/wav;base64,AA=='}
  ];
  context.completeProject=JSON.parse(JSON.stringify(run('MapEditor.exportProject()')));
  context.completeProject.assets=records;
  context.completeProject.ui.imageAssetId='image-test';context.completeProject.ui.fontFamily='onggi_fonttest';
  context.completeProject.maps[0].blocks.push({id:'decoration',type:'asset',assetId:'model-test',x:-6.5,z:-2.5,w:1,d:1,rotation:90});
  context.projectFile={size:1000,text:async()=>JSON.stringify(context.completeProject)};
  await run('MapEditor.load(projectFile)');
  check("AssetBank.list().length===4&&MapEditor.getMap().blocks.some(b=>b.assetId==='model-test')","full asset/project restore");
  check("StudioUI.settings.imageAssetId==='image-test'&&GAME_CONFIG.ui.fontFamily==='onggi_fonttest'","image/font setting restore");
  run('MapEditor.play();dirty=true;render();MapEditor.open();');
  env.DeviceOrientationEvent=class {static requestPermission(){return Promise.resolve('denied');}};
  await run('GyroInput.enable()');check('GyroInput.sample()===null','denied sensor fallback');
  env.isSecureContext=false;await run('GyroInput.enable()');check('GyroInput.sample()===null','insecure sensor fallback');env.isSecureContext=true;


  context.fakeFiles=[{name:'dropped.obj',size:obj.length,bytes:obj}];
  const beforeNewAssetBuffers=nextBuffer;
  await run('AssetBank.addFiles(fakeFiles)');check('AssetBank.list().length===5','file-drop load path');
  assert.equal(nextBuffer-beforeNewAssetBuffers,2,'adding one OBJ only allocates its two buffers');
  const duplicateBuffers=nextBuffer;await run('AssetBank.addFiles(fakeFiles)');
  check('AssetBank.list().length===5','same file deduplicated');assert.equal(nextBuffer,duplicateBuffers,'duplicate file does not decode/reallocate');
  context.queuedA=[{name:'queued-a.obj',size:obj.length,bytes:obj}];context.queuedB=[{name:'queued-b.obj',size:obj.length,bytes:obj}];
  await run('Promise.all([AssetBank.addFiles(queuedA),AssetBank.addFiles(queuedB)])');check('AssetBank.list().length===7','concurrent imports preserve both');
  check('AssetBank.parseOBJ(obj).vertices instanceof Float32Array&&AssetBank.parseOBJ(obj).normals instanceof Float32Array','OBJ uses compact typed arrays');
  const beforeCandidateBuffers=liveBuffers.size;
  context.staleOBJ={id:'stale-model',name:'stale.obj',kind:'model',data:'data:text/plain;base64,'+Buffer.from(obj).toString('base64')};
  context.firstCandidate=await run('AssetBank.prepare(AssetBank.exportData())');context.staleCandidate=await run('AssetBank.prepare([...AssetBank.exportData(),staleOBJ])');run('AssetBank.applyPrepared(firstCandidate)');
  assert.throws(()=>run('AssetBank.applyPrepared(staleCandidate)'),'stale candidate rejected');assert.equal(liveBuffers.size,beforeCandidateBuffers,'stale candidate releases only new buffers');
  run('var safeExport=AssetBank.exportData();safeExport[0].name="changed";');check('AssetBank.list()[0].name!=="changed"','cheap export preserves record isolation');
  console.log('PASS: one new OBJ allocates 2 buffers; duplicate allocates 0; parallel imports preserved; stale candidates cleaned safely; Float32 OBJ output.');
  const beforeBadAsset=JSON.stringify(run('MapEditor.exportProject()')),buffersBeforeBad=liveBuffers.size;
  context.invalidAssetProject=JSON.parse(beforeBadAsset);context.invalidAssetProject.maps[0].name='must not replace';
  context.invalidAssetProject.assets.push({id:'broken',name:'bad.obj',kind:'model',data:'data:text/plain;base64,'+Buffer.from('not OBJ').toString('base64')});
  context.invalidAssetFile={size:1000,text:async()=>JSON.stringify(context.invalidAssetProject)};
  await run('MapEditor.load(invalidAssetFile)');assert.equal(JSON.stringify(run('MapEditor.exportProject()')),beforeBadAsset,'bad asset import atomic');assert.equal(liveBuffers.size,buffersBeforeBad,'failed import cleans candidate GPU data');

  const zero=run('GyroInput.project(0,0,0)');assert.equal(Math.abs(zero.x),0);assert.equal(zero.z,0);
  env.DeviceOrientationEvent=class {};await run('GyroInput.enable()');run('GyroInput.orientation({beta:0,gamma:0});GyroInput.orientation({beta:0,gamma:10});');check('GyroInput.sample().x<0','gyro right tilt');clock+=2000;check('GyroInput.sample().x===0','stale sensor zero');
  elements.get('choose-manual').click();check('GyroInput.sample()===null','manual fallback');
  for(const screen of ['title','select','guide','story','finish'])run(`screen='${screen}';dirty=true;render();`);
  assert(!saved.has('onggi-editor-project'),'no automatic browser writes');

  run("StudioUI.apply({...StudioUI.exportData(),floorAssetId:'image-test',onggiAssets:{'0':'model-test'},texts:{drawTitle_01:'새로운 출발',STORY_02:'바뀐 이야기',STAGE_MONOLOGUES_01:'바뀐 대사'},onggiTexts:{'0.name':'나의 옹기'}})");
  check("UI_TEXT.drawTitle_01==='새로운 출발'&&STORY[0].title==='바뀐 이야기'&&STAGE_MONOLOGUES[0][0][0]==='바뀐 대사'&&COLLECTION[0].name==='나의 옹기'",'text/narrative/onggi propagation');
  check("StudioUI.validate({texts:{notAKey:'bad'}}).skipped[0]==='notAKey'&&!('notAKey' in StudioUI.validate({texts:{notAKey:'bad'}}).texts)",'unknown text key skipped, not stored');
  check("AssetBank.drawOnggi(identity(),0,0,1)",'custom onggi model rendered');
  run('MapEditor.play();dirty=true;render();MapEditor.open();');
  context.roundtripHTML=run('GameExport.createHTML(MapEditor.exportProject())');
  check("GameDocument.extractProject(roundtripHTML).ui.floorAssetId==='image-test'",'HTML extracts floor asset');
  context.importHTML={size:context.roundtripHTML.length,text:async()=>context.roundtripHTML};
  await run('MapEditor.load(importHTML)');
  check("StudioUI.settings.onggiAssets['0']==='model-test'&&UI_TEXT.drawTitle_01==='새로운 출발'",'HTML editor reimport');
  context.unsafeHTML='<script>window.shouldNotRun=1</script>'+context.roundtripHTML;
  run('GameDocument.extractProject(unsafeHTML)');check("typeof window.shouldNotRun==='undefined'",'HTML scripts never executed');


  run("StudioUI.apply({...StudioUI.exportData(),onggiPhysics:{'0':{radius:0.3,accelerationScale:0,damping:0,maxSpeed:0.25,wallRestitution:1},'1':{accelerationScale:1,maxSpeed:1}}})");
  elements.get('physics-target').value='0';elements.get('physics-target').onchange({target:elements.get('physics-target')});
  elements.get('physics-play').click();check('selected===0&&R===0.3','UI selects radius for test');
  run('keys.add("ArrowRight");var stationaryX=px;for(let i=0;i<70;i++)tick(1/120);keys.clear();');check('px===stationaryX&&vx===0','per-pot acceleration disabled');
  run('selected=1;startStage(0);screen="play";keys.add("ArrowRight");for(let i=0;i<70;i++)tick(1/120);keys.clear();');check('px>STAGES[0].route[0][0]&&Math.hypot(vx,vz)<=1.000001&&R===GAME_CONFIG.physics.playerRadius','other pot inherits radius and custom speed');
  run("StudioUI.apply({...StudioUI.exportData(),onggiPhysics:{...StudioUI.settings.onggiPhysics,'0':{radius:0.3,accelerationScale:1,damping:0,maxSpeed:0.25,wallRestitution:1}}});selected=0;MapEditor.play();keys.add('ArrowRight');for(let i=0;i<70;i++)tick(1/120);keys.clear();");
  check('Math.hypot(vx,vz)>0&&Math.hypot(vx,vz)<=0.250001','per-pot speed cap');
  run('var wall=activeFloor().wallSegments[0];px=wall.x+wall.w/2+R/2;pz=wall.z;vx=-2;vz=0;resolveWalls(activeFloor(),px,pz);');check('Math.abs(vx-2)<1e-8','per-pot elastic wall');
  assert.throws(()=>run("OnggiPhysics.validate({'0':{radius:0}})"));assert.throws(()=>run("OnggiPhysics.validate({'0':{wallRestitution:2}})"));
  run("StudioUI.apply({...StudioUI.exportData(),onggiPhysics:{...StudioUI.settings.onggiPhysics,'0':{radius:0.3,accelerationScale:0,damping:8,maxSpeed:20,wallRestitution:0}}});startStage(0);screen='play';vx=0.5;vz=0;for(let i=0;i<30;i++)tick(1/120);");check('vx<0.1','per-pot damping');
  run("StudioUI.apply({...StudioUI.exportData(),onggiPhysics:{...StudioUI.settings.onggiPhysics,'0':{radius:0.3,accelerationScale:1,damping:0.72,maxSpeed:0.25,wallRestitution:0.25}}});MapEditor.open();");
  const speedProfile=run("StudioUI.settings.onggiPhysics['0'].maxSpeed");
  const firstField=elements.get('physics-properties').children[0].children[0];firstField.value='-1';firstField.onchange();
  check("StudioUI.settings.onggiPhysics['0'].radius===0.3",'invalid UI radius retains previous');


  // 블록 외형/효과음이 실제 편집·맵 컴파일·플레이·내보내기를 통과하는지 검사.
  elements.get('tab-sound').click();assert(elements.get('pane-assets').hidden && !elements.get('pane-sound').hidden,'sound tab visibility');
  elements.get('tab-assets').click();assert(!elements.get('pane-assets').hidden && elements.get('pane-sound').hidden,'asset tab visibility');
  elements.get('tab-blocks').click();assert(!elements.get('pane-blocks').hidden && elements.get('pane-assets').hidden,'block appearance tab visibility');
  assert(elements.get('pane-blocks').children.includes(classes.get('studio-card-group')[0]),'block skins moved to block tab');elements.get('tab-assets').click();
  elements.get('skin-type').value='wall';elements.get('skin-type').onchange();elements.get('skin-asset').value='model-test';elements.get('skin-apply').click();
  check("StudioUI.settings.blockAssets.wall==='model-test'",'wall model UI assignment');
  elements.get('sfx-checkpoint').value='sound-test';elements.get('sfx-checkpoint').onchange();
  check("StudioUI.settings.sfx.checkpoint==='sound-test'",'checkpoint sound UI assignment');
  run("StudioUI.apply({...StudioUI.exportData(),blockAssets:{floor:'image-test',wall:'model-test',hole:'image-test',sweeper:'image-test',crumble:'model-test',checkpoint:'image-test',start:'image-test',goal:'model-test'},sfx:{checkpoint:'sound-test',arrival:'sound-test',projectSave:'sound-test',fail:'sound-test'},sfxVolume:0.35})");
  context.skinProject=JSON.parse(JSON.stringify(run('MapEditor.exportProject()')));
  const customFloor=context.skinProject.maps[0].blocks.find(b=>b.type==='floor');customFloor.skinAssetId='image-test';
  const customWall=context.skinProject.maps[0].blocks.find(b=>b.type==='wall');customWall.skinAssetId='image-test';
  context.skinFile={size:1000,text:async()=>JSON.stringify(context.skinProject)};await run('MapEditor.load(skinFile)');
  check("MapEditor.getMap().blocks.some(b=>b.skinAssetId==='image-test')",'per-block skin persists on load');
  run('MapEditor.play();dirty=true;render();');
  check("STAGES[0].floorBlocks.some(b=>b.skinAssetId==='image-test')&&STAGES[0].editorWalls.some(b=>b.skinAssetId==='image-test')",'compile preserves skin IDs');
  check("AssetBank.drawBlock('wall',{x:0,z:0,w:1,d:1},identity(),.35,.7,'#65785c')",'OBJ block render');
  check("AssetBank.drawBlock('sweeper',{x:0,z:0,w:1,d:1},identity(),.38,.76,'#65785c')",'image obstacle render');
  check("!AssetBank.drawBlock('wall',{x:0,z:0,w:1,d:1,skinAssetId:'missing'},identity(),.35,.7,'#65785c')",'missing skin uses fallback');
  assert.throws(()=>run("StudioUI.validate({sfxVolume:1.1})"));
  assert.throws(()=>run("StudioUI.validate({blockAssets:{unknown:'image-test'}})"));
  check("StudioUI.validate({texts:{future_key:'새 문구',drawTitle_01:'제목'},layout:{futureScreen:{a:{x:1}},drawTitle:{futureItem:{x:1},text_01:{futureProp:2,x:5}}}}).skipped.length===4",'newer editor settings are skipped, not rejected');
  check("StudioUI.validate({texts:{drawTitle_01:'제목'},layout:{drawTitle:{text_01:{x:5}}}}).layout.drawTitle.text_01.x===5",'known settings still apply');
  assert.throws(()=>run("StudioUI.validate({texts:{drawTitle_01:'가'.repeat(501)}})"),/500/);
  assert.throws(()=>run("StudioUI.validate({layout:{drawTitle:{text_01:{x:'5'}}}})"));
  assert.throws(()=>run("ProjectData.validate({...skinProject,ui:{...skinProject.ui,blockAssets:{floor:'model-test'}}})"));
  assert.throws(()=>run("ProjectData.validate({...skinProject,ui:{...skinProject.ui,sfx:{arrival:'image-test'}}})"));
  assert.throws(()=>run("ProjectData.validate({...skinProject,maps:[{...skinProject.maps[0],blocks:skinProject.maps[0].blocks.map(b=>({...b,skinAssetId:'missing'}))}]})"));
  const beforeCheckpoint=audioPlays.length;
  run("startStage(0);screen='play';px=STAGES[0].route[STAGES[0].checks[0]][0];pz=STAGES[0].route[STAGES[0].checks[0]][1];vx=vz=angle=tiltZ=0;tick(1/120);tick(1/120);");
  assert.equal(audioPlays.length,beforeCheckpoint+1,'checkpoint sound once while remaining on checkpoint');
  assert.equal(audioPlays.at(-1).loop,false,'effect is one-shot');assert.equal(audioPlays.at(-1).volume,.35,'effect volume');
  const beforeArrival=audioPlays.length;
  run("px=STAGES[0].route.at(-1)[0];pz=STAGES[0].route.at(-1)[1];vx=vz=0;tick(1/120);");
  assert.equal(audioPlays.length,beforeArrival+1,'goal event plays arrival');
  run('MapEditor.open()');
  const beforeSave=audioPlays.length;elements.get('editor-save').click();assert.equal(audioPlays.length,beforeSave+1,'explicit project save sound');
  elements.get('skin-reset').click();assert.equal(audioPlays.length,beforeSave+1,'auto save stays silent');
  run("AssetBank.setMuted(true)");await run("AssetBank.playEffect('arrival')");assert.equal(audioPlays.length,beforeSave+1,'mute blocks effects');
  run('AssetBank.unlockEffects()');await run("AssetBank.playEffect('arrival')");assert.equal(audioPlays.length,beforeSave+2,'unmute permits effects');
  const effectStats={started:0,stopped:0,decoded:0};
  env.AudioContext=class {constructor(){this.state='suspended';}resume(){this.state='running';return Promise.resolve();}decodeAudioData(){effectStats.decoded++;return Promise.resolve({});}createBufferSource(){return {connect(){},disconnect(){},start(){effectStats.started++;},stop(){effectStats.stopped++;}};}createGain(){return {gain:{value:0},connect(){},disconnect(){}};}};
  run('AssetBank.unlockEffects()');await run("AssetBank.playEffect('arrival')");await run("AssetBank.playEffect('checkpoint')");assert.equal(effectStats.started,2,'Web Audio effects after gesture');assert.equal(effectStats.decoded,1,'same audio buffer cached across events');
  run('AssetBank.stopSound()');assert.equal(effectStats.stopped,2,'stop affects all one-shot sources');
  context.skinHTML=run('GameExport.createHTML(MapEditor.exportProject())');check("GameDocument.extractProject(skinHTML).ui.sfx.arrival==='sound-test'",'sound survives HTML compatibility roundtrip');
  console.log('PASS: skin selectors/tabs, per-block image and global OBJ/image render, collision data preserved, invalid skin/audio rejection, checkpoint/arrival/save one-shots, silent autosave, mute, Web Audio unlock/cache/stop, export persistence.');


  // 담당별 가져오기/내보내기는 나머지 담당 파일을 바꾸지 않습니다.
  const beforeTeamMap=run("TeamFiles.createSource('map')"),beforeTeamPhysics=run("TeamFiles.createSource('physics')");
  context.onlyUI=run("TeamSource.parse('ui',TeamFiles.createSource('ui'))");context.onlyUI.settings.texts.drawTitle_01='유리 담당 문구';
  context.onlyUIFile={size:1000,text:async()=>run("TeamSource.stringify('ui',onlyUI)")};
  assert(await run("TeamFiles.importRole('ui',onlyUIFile)"),'UI-only import succeeds');
  check("UI_TEXT.drawTitle_01==='유리 담당 문구'",'UI-only text applied');
  assert.equal(run("TeamFiles.createSource('map')"),beforeTeamMap,'UI edit leaves map source byte-identical');
  assert.equal(run("TeamFiles.createSource('physics')"),beforeTeamPhysics,'UI edit leaves physics source byte-identical');
  const beforePhysicsUI=run("TeamFiles.createSource('ui')");
  context.onlyPhysics=run("TeamSource.parse('physics',TeamFiles.createSource('physics'))");context.onlyPhysics.onggiPhysics['0'].maxSpeed=.33;
  context.onlyPhysicsFile={size:1000,text:async()=>run("TeamSource.stringify('physics',onlyPhysics)")};
  assert(await run("TeamFiles.importRole('physics',onlyPhysicsFile)"),'physics-only import succeeds');
  assert.equal(run("TeamFiles.createSource('ui')"),beforePhysicsUI,'physics edit leaves UI byte-identical');
  assert.equal(run("TeamFiles.createSource('map')"),beforeTeamMap,'physics edit leaves map byte-identical');
  const beforeBadTeam=JSON.stringify(run('MapEditor.exportProject()'));
  context.badTeam={size:1000,text:async()=>"alert('must never execute');"};
  assert.equal(await run("TeamFiles.importRole('ui',badTeam)"),false,'arbitrary script rejected');
  assert.equal(JSON.stringify(run('MapEditor.exportProject()')),beforeBadTeam,'invalid team import atomic');
  assert.throws(()=>run("TeamSource.parse('ui',TeamFiles.createSource('map'))"),'wrong-owner source rejected');
  for (const role of ['ui','sound','asset','physics','map']) {
    const roleFile=run('TeamSource.roles['+JSON.stringify(role)+'].name');assert(run('TeamFiles.createSource('+JSON.stringify(role)+')').includes(roleFile),'config filename');assert(fs.readdirSync(path.join(base,'src/config')).includes(roleFile),'exported filename matches the source file exactly');
  }
  console.log('PASS: UI-only and physics-only editor import preserve other source bytes; owner comments; malformed/wrong-owner source rejection.');


  // エディタ画面間の選択共有、ページごとの編集、実ゲームの導線を検証。
  const mini=elements.get('asset-mini-map');const floorBlock=run("MapEditor.getMap().blocks.find(b=>b.type==='floor')");
  elements.get('mini-layer').value='floor';mini.dispatch('pointerdown',{clientX:(floorBlock.x+9)/17*mini.width,clientY:(floorBlock.z+6)/12*mini.height,pointerId:2,button:0});
  check("MapEditor.getSelected()?.type==='floor'",'asset mini-grid selects floor in main editor');
  elements.get('mini-skin').value='image-test';elements.get('mini-skin').onchange({target:elements.get('mini-skin')});
  check("MapEditor.getSelected().skinAssetId==='image-test'",'mini-grid applies per-block skin');
  const beforePageMap=run("TeamFiles.createSource('map')");
  run('PageDesigner.refresh()');
  const titleItem=run("PageUI.elements.find(e=>e.type==='text'&&e.text===UI_TEXT.drawTitle_01)");
  const legacyUIOption=elements.get('ui-element').children[0];assert(titleItem,'title text captured');
  const pageCanvas=elements.get('page-preview');
  pageCanvas.dispatch('pointerdown',{button:0,pointerId:3,clientX:(titleItem.x+3)/1600*pageCanvas.width,clientY:titleItem.y/1000*pageCanvas.height});
  assert.equal(run('PageDesigner.selection'),titleItem.id,'click uses visible text bounds');
  pageCanvas.dispatch('pointermove',{pointerId:3,clientX:(titleItem.x+43)/1600*pageCanvas.width,clientY:(titleItem.y+20)/1000*pageCanvas.height});pageCanvas.dispatch('pointerup',{pointerId:3});
  assert.equal(elements.get('ui-element').children[0],legacyUIOption,'drag does not rebuild hidden legacy UI controls');
  context.dragId=titleItem.id;check('StudioUI.settings.pageDesign.pages.drawTitle.elements[dragId].x===Math.round('+titleItem.x+'+40)','drag saves X');
  elements.get('designer-text').value='이 페이지의 제목';elements.get('designer-text').onchange({target:elements.get('designer-text')});
  check("PageUI.elements.some(e=>e.id===dragId&&e.text==='이 페이지의 제목')",'selected text edit in actual draw');
  elements.get('page-background-enabled').checked=true;elements.get('page-background').value='#112233';elements.get('page-background').onchange();
  check("StudioUI.settings.pageDesign.pages.drawTitle.background==='#112233'",'page background saved');
  check(`(() => {
    const oldScreen=screen, oldDesign=StudioUI.settings.pageDesign, oldFill=ctx.fillRect;
    const calls=[];
    ctx.fillRect=()=>calls.push(ctx.fillStyle);
    try {
      StudioUI.settings.pageDesign={...oldDesign,pages:{...oldDesign.pages,
        drawPlay:{background:'#38506c'},drawMonologue:{background:'#6c5038'}}};
      screen='play';PageUI.begin();
      if (calls.length || PageUI.worldBackground()!=='#38506c') return false;
      PageUI.begin(true);
      if (calls.pop()!=='#38506c') return false;
      screen='arrival';PageUI.begin();
      if (calls.length || PageUI.worldBackground()!=='#38506c') return false;
      screen='monologue';PageUI.begin();
      if (calls.length || PageUI.worldBackground()!=='#6c5038') return false;
      screen='title';PageUI.begin();
      return PageUI.worldBackground()===undefined && calls.pop()==='#112233';
    } finally {
      ctx.fillRect=oldFill;
      StudioUI.settings.pageDesign=oldDesign;
      screen=oldScreen;
      PageDesigner.refresh();
    }
  })()`,'world background stays behind geometry while 2D previews and titles show the selected color');
  run("PageDesigner.addElement('button')");elements.get('element-action').value='start';elements.get('element-action').onchange({target:elements.get('element-action')});
  elements.get('element-color').value='#eeccaa';elements.get('element-color').onchange({target:elements.get('element-color')});
  check("StudioUI.settings.pageDesign.pages.drawTitle.extras.some(e=>e.type==='button'&&e.action==='start'&&e.color==='#eeccaa')",'added button action and color');
  elements.get('element-delete').click();check('StudioUI.settings.pageDesign.pages.drawTitle.extras.length===0','delete added element');
  run("PageDesigner.managePage('add')");check('StudioUI.settings.pageDesign.extraPages.length===1','add page');run("PageDesigner.managePage('delete')");check('StudioUI.settings.pageDesign.extraPages.length===0','delete page');run("PageDesigner.managePage('add')");
  run("PageDesigner.editDialogue('add')");elements.get('dialogue-speaker').value='옹기 친구';elements.get('dialogue-text').value='새 독백 첫 줄\n둘째 줄';elements.get('dialogue-speaker').onchange();
  check("StudioUI.settings.pageDesign.dialogues['0'].at(-1).speaker==='옹기 친구'",'speaker saved');
  run("PageDesigner.editDialogue('delete')");check("StudioUI.settings.pageDesign.dialogues['0'].length===2",'delete monologue page');
  assert.equal(run("TeamFiles.createSource('map')"),beforePageMap,'UI page changes leave map source bytes intact');
  check("TeamSource.parse('ui',TeamFiles.createSource('ui')).settings.pageDesign.extraPages.length===1",'page design in UI source');
  assert.throws(()=>run("UIPageData.validate({pages:{drawTitle:{background:'url(bad)'}}})"));
  run('MapEditor.playProject()');check("screen==='custom-ui'",'new intro page actually shown in game');
  run("action('page-next')");check("screen==='monologue'",'custom intro leads to configured monologues');
  run("for(let i=0;i<10&&screen==='monologue';i++)action('dialogue-next')");check("screen==='play'",'monologues lead to playable game');
  run('MapEditor.open()');
  run('var originalExportForPerf=MapEditor.exportProject;var previewExports=0;MapEditor.exportProject=()=>{previewExports++;return originalExportForPerf();};PageDesigner.refresh();MapEditor.exportProject=originalExportForPerf;');check('previewExports===0','page/mini preview does not export/copy whole project');
  console.log('PASS: mini-grid selection/skin, actual text hit/drag, page-scoped text/background/button colors and actions, add/delete pages/elements/monologues, isolated UI export, actual intro→dialogue→play.');


  elements.get('designer-page').value='drawTitle';elements.get('designer-page').onchange({target:elements.get('designer-page')});
  const btnItem=run("PageUI.elements.find(e=>e.type==='button'&&e.action==='select')");assert(btnItem,'real title button captured');
  const cx=btnItem.x+btnItem.width/2,cy=btnItem.y+btnItem.height/2;
  pageCanvas.dispatch('pointerdown',{button:0,pointerId:4,clientX:cx/1600*pageCanvas.width,clientY:cy/1000*pageCanvas.height});
  assert.equal(run('PageDesigner.selection'),btnItem.id,'button selects as one unit');
  pageCanvas.dispatch('pointermove',{pointerId:4,clientX:(cx+30)/1600*pageCanvas.width,clientY:(cy+10)/1000*pageCanvas.height});pageCanvas.dispatch('pointerup',{pointerId:4});
  context.buttonId=btnItem.id;check('StudioUI.settings.pageDesign.pages.drawTitle.elements[buttonId].x===Math.round('+btnItem.x+'+30)','button drag saved');
  run("var oldScreenForClick=screen;screen='title';drawUI();var movedButton=buttons.find(b=>b.id==='select');screen=oldScreenForClick;");
  check('movedButton.x===Math.round('+btnItem.x+'+30)','actual game button hit area moved with drawing');
  check("!StudioUI.settings.pageDesign.pages.drawGuide?.background",'page colors stay scoped');
  run("var restorePageDesign=JSON.parse(JSON.stringify(StudioUI.settings.pageDesign));var noDialogue=JSON.parse(JSON.stringify(restorePageDesign));noDialogue.dialogues['0']=[];StudioUI.apply({...StudioUI.exportData(),pageDesign:noDialogue});stage=0;PageUI.enterStage(false)");
  check("screen==='play'",'zero dialogue pages skips monologue');
  run('StudioUI.apply({...StudioUI.exportData(),pageDesign:restorePageDesign});MapEditor.open();');


  const beforeDelete=JSON.stringify(run('MapEditor.exportProject()'));
  run("AssetBank.select('image-test');StudioUI.refreshAssets()");assert(!elements.get('asset-delete').disabled,'selected asset can be deleted');
  await elements.get('asset-delete').click();
  check("!AssetBank.list().some(a=>a.id==='image-test')",'selected asset removed');
  check("!MapEditor.exportProject().maps.some(m=>m.blocks.some(b=>b.skinAssetId==='image-test'))",'deleted skin bindings removed');
  check("StudioUI.settings.imageAssetId===''&&StudioUI.settings.floorAssetId===''",'image/floor return to default');
  run('ProjectData.validate(MapEditor.exportProject())');
  assert(!elements.get('asset-delete-undo').hidden,'undo offered');await elements.get('asset-delete-undo').click();
  assert.equal(JSON.stringify(run('MapEditor.exportProject()')),beforeDelete,'undo restores asset/settings exactly');
  run("AssetBank.select('sound-test');StudioUI.refreshAssets()");await elements.get('asset-delete').click();
  check("!AssetBank.list().some(a=>a.id==='sound-test')&&Object.keys(StudioUI.settings.sfx).length===0",'audio deletion clears all assigned effects');
  await elements.get('asset-delete-undo').click();
  const deletedModel=run("ProjectData.withoutAsset(MapEditor.exportProject(),'model-test')");assert(deletedModel.removedBlocks>0,'model decoration removed');
  assert(!Object.values(deletedModel.project.ui.onggiAssets).includes('model-test'),'onggi model binding removed');
  assert(!deletedModel.project.maps.some(m=>m.blocks.some(b=>b.assetId==='model-test')),'all decoration references removed');
  run("AssetBank.select('font-test');StudioUI.refreshAssets()");await elements.get('asset-delete').click();
  check("StudioUI.settings.fontFamily==='sans-serif'",'font deletion restores default font');await elements.get('asset-delete-undo').click();
  run("AssetBank.select('image-test');StudioUI.refreshAssets()");await elements.get('asset-delete').click();run('StudioUI.save()');assert(elements.get('asset-delete-undo').hidden,'later changes invalidate stale undo');
  context.restoreAfterDelete={size:beforeDelete.length,text:async()=>beforeDelete};await run('MapEditor.load(restoreAfterDelete)');
  console.log('PASS: asset delete clears image/floor/skin/audio/font/model references; decoration removal; exact undo; stale undo invalidated; original project restores.');


  // UI 기록은 맵/물리와 분리되고, 드래그 한 번은 한 단계입니다.
  run("UIHistory.reset();EditorShell.switchWorkspace('design')");elements.get('tab-ui').click();
  elements.get('designer-page').value='drawTitle';elements.get('designer-page').onchange({target:elements.get('designer-page')});
  const historyMap=run("TeamFiles.createSource('map')"),historyPhysics=run("TeamFiles.createSource('physics')");
  const beforeUndoUI=JSON.stringify(run('StudioUI.exportData()'));
  elements.get('page-background-enabled').checked=true;elements.get('page-background').value='#334455';elements.get('page-background').onchange();
  assert.equal(run('UIHistory.getState().undo'),1,'page color recorded');assert.equal(run('SaveStatus.getState().phase'),'dirty','manual UI change');
  elements.get('ui-undo').click();assert.equal(JSON.stringify(run('StudioUI.exportData()')),beforeUndoUI,'undo exact UI restore');assert.equal(run('UIHistory.getState().redo'),1,'redo available');
  elements.get('ui-redo').click();check("StudioUI.settings.pageDesign.pages.drawTitle.background==='#334455'",'redo page color');
  run('UIHistory.reset();PageDesigner.refresh()');
  const historyItem=run("PageUI.elements.find(e=>e.type==='text'&&e.id===dragId)");assert(historyItem,'drag target');
  const hx=historyItem.x+2,hy=historyItem.y;const historyCanvas=elements.get('page-preview');
  historyCanvas.dispatch('pointerdown',{button:0,pointerId:7,clientX:hx/1600*historyCanvas.width,clientY:hy/1000*historyCanvas.height});
  for(let i=1;i<=3;i++)historyCanvas.dispatch('pointermove',{pointerId:7,clientX:(hx+i*15)/1600*historyCanvas.width,clientY:(hy+i*5)/1000*historyCanvas.height});
  assert.equal(run('SaveStatus.getState().phase'),'dirty','drag shows unsaved state');
  historyCanvas.dispatch('pointerup',{pointerId:7});assert.equal(run('UIHistory.getState().undo'),1,'multi-frame drag is one undo step');assert.equal(run('SaveStatus.getState().phase'),'dirty','manual drag change');
  elements.get('ui-undo').click();check('StudioUI.settings.pageDesign.pages.drawTitle.elements[dragId].x==='+historyItem.x,'undo whole drag');
  const keyboard=events.get('keydown');document.activeElement=historyCanvas;
  keyboard({ctrlKey:true,key:'y',preventDefault:noop});check('StudioUI.settings.pageDesign.pages.drawTitle.elements[dragId].x===Math.round('+historyItem.x+'+45)','Ctrl+Y redoes UI');
  keyboard({ctrlKey:true,key:'z',preventDefault:noop});check('StudioUI.settings.pageDesign.pages.drawTitle.elements[dragId].x==='+historyItem.x,'Ctrl+Z undoes UI');
  const mapBeforeDeleteKey=run('MapEditor.getMap().blocks.length');keyboard({key:'Delete',preventDefault:noop});assert.equal(run('MapEditor.getMap().blocks.length'),mapBeforeDeleteKey,'UI keyboard cannot delete hidden map block');
  assert.equal(run("TeamFiles.createSource('map')"),historyMap,'UI undo does not touch map');assert.equal(run("TeamFiles.createSource('physics')"),historyPhysics,'UI undo does not touch physics');
  run("PageDesigner.managePage('add')");const historyPages=run('StudioUI.settings.pageDesign.extraPages.length');elements.get('ui-undo').click();assert.equal(run('StudioUI.settings.pageDesign.extraPages.length'),historyPages-1,'undo page addition');elements.get('ui-redo').click();assert.equal(run('StudioUI.settings.pageDesign.extraPages.length'),historyPages,'redo page addition');
  const originalSetItem=env.localStorage.setItem;let storageWrites=0;
  env.localStorage.setItem=()=>{storageWrites++;throw Error('storage blocked');};
  run('StudioUI.save()');assert.equal(storageWrites,0,'no localStorage writes');assert.equal(run('SaveStatus.getState().phase'),'dirty','manual save state');
  elements.get('save-backup-now').click();assert.equal(run('SaveStatus.getState().phase'),'backup-requested','backup requested');
  run('StudioUI.save()');assert.equal(run('SaveStatus.getState().phase'),'dirty','edits after backup');env.localStorage.setItem=originalSetItem;
  document.activeElement=elements.get('designer-text');const typingUndo=run('UIHistory.getState().undo');keyboard({ctrlKey:true,key:'z',preventDefault:noop});assert.equal(run('UIHistory.getState().undo'),typingUndo,'typing keeps native undo');document.activeElement=historyCanvas;
  const beforeInterleaved=run('StudioUI.exportData()');context.beforeInterleaved=beforeInterleaved;
  run("UIHistory.reset();StudioUI.apply({...StudioUI.exportData(),fontScale:1.4},{refreshLegacy:false});StudioUI.apply({...StudioUI.exportData(),onggiPhysics:{...StudioUI.settings.onggiPhysics,'0':{...StudioUI.settings.onggiPhysics['0'],maxSpeed:0.34}},blockAssets:{...StudioUI.settings.blockAssets,wall:'model-test'}},{refreshLegacy:false});UIHistory.undo()");
  check("StudioUI.settings.fontScale===beforeInterleaved.fontScale&&StudioUI.settings.onggiPhysics['0'].maxSpeed===0.34&&StudioUI.settings.blockAssets.wall==='model-test'",'UI undo preserves newer physics/map changes');
  run('StudioUI.apply(beforeInterleaved,{history:false,refreshLegacy:false});UIHistory.reset();PageDesigner.refresh();');

  context.historyRestoreFile={size:1000,text:async()=>JSON.stringify(run('MapEditor.exportProject()'))};await run('MapEditor.load(historyRestoreFile)');assert.equal(run('UIHistory.getState().undo'),0,'document load clears stale UI history');assert.equal(run('UIHistory.getState().redo'),0,'document load clears redo');
  run("EditorShell.switchWorkspace('map')");
  console.log('PASS: UI undo/redo exact restore; drag grouping; keyboard routing; map/physics isolation; page add redo; manual save status; honest backup request; history reset on load.');


  run("StudioUI.apply({...StudioUI.exportData(),bgmAssetId:'sound-test'},{history:false});MapEditor.play()");assert.equal(audioPlays.at(-1).loop,true,'desktop editor starts BGM');run('MapEditor.open()');
  run("StudioUI.apply({...StudioUI.exportData(),bgmAssetId:''},{history:false})");
  const oldDraft=JSON.stringify(run('MapEditor.exportProject()'));saved.set('onggi-editor-project',oldDraft);await elements.get('editor-load-legacy').click();assert.equal(saved.get('onggi-editor-project'),oldDraft,'old draft kept');saved.delete('onggi-editor-project');

  const injection=JSON.parse(JSON.stringify(run('MapEditor.exportProject()')));injection.maps[0].name='</script><img src=x onerror=alert(1)>';context.injection=injection;assert(!run('GameExport.createHTML(injection)').includes(injection.maps[0].name),'script-breakout escaped');
  if(onExport)onExport(run('GameExport.createHTML(MapEditor.exportProject())'));
  if(onFolderExport){const files=run('GameExport.createFolderFiles(MapEditor.exportProject())');const archive=run('FolderExport.zip(GameExport.createFolderFiles(MapEditor.exportProject()))');assert.equal(run('FolderExport.crc32(new TextEncoder().encode("123456789"))'),0xcbf43926,'ZIP CRC32 standard');onFolderExport(files,archive);}
  for(const task of startupTasks)await task();
  check('MapEditor.exportProject().maps.length===TeamSource.fromScripts().maps.length','initial editor project restored');
  // 편집기를 열 때 설정 파일을 못 읽은 상태: 경고가 남고, 내보내기는 한 번 더 확인합니다.
  context.goodProject=JSON.stringify(run('MapEditor.exportProject()'));
  await run("MapEditor.load({size:4,text:async()=>'{bad'},{startup:true})");
  assert.equal(elements.get('editor-startup-warning').hidden,false,'startup failure warning stays visible');
  run('MapEditor.open()');check("MapEditor.startupProblem()!==''",'startup failure remembered after reopening editor');
  check("MapEditor.confirmExport('MapConfig.js')===false&&MapEditor.confirmExport('MapConfig.js')===true",'export needs a second click while in fallback state');
  await run('MapEditor.load({size:goodProject.length,text:async()=>goodProject})');
  assert.equal(elements.get('editor-startup-warning').hidden,true,'successful load clears warning');check("MapEditor.confirmExport('MapConfig.js')===true",'normal export after recovery');
  // 페이지 배경 사진: 검증, 그리기 순서(글자·버튼보다 뒤), 에셋 삭제 시 정리.
  assert.throws(()=>run("UIPageData.validate({pages:{drawTitle:{extras:[{id:'p1',type:'image'}]}}})"),/사진/,'photo needs an asset');
  assert.throws(()=>run("UIPageData.validate({pages:{drawTitle:{extras:[{id:'p1',type:'image',assetId:'a',opacity:2}]}}})"),'opacity range');
  check("UIPageData.validate({pages:{drawTitle:{extras:[{id:'p1',type:'image',assetId:'image-test',x:10,y:20,width:300,height:200,opacity:.5}]}}}).pages.drawTitle.extras[0].opacity===.5",'photo element accepted');
  context.photoAsset=run("AssetBank.list().find(a=>a.kind==='image').id");
  run("StudioUI.apply({...StudioUI.exportData(),pageDesign:{...StudioUI.settings.pageDesign,pages:{...StudioUI.settings.pageDesign.pages,drawTitle:{elements:{},enabled:true,extras:[{id:'bg',type:'image',assetId:photoAsset,x:0,y:0,width:1600,height:1000,opacity:.8}]}}}},{refreshLegacy:false})");
  run("screen='title';PageUI.setPreview('drawTitle');drawUI(true);PageUI.setPreview('')");
  check("PageUI.elements[0].id==='extra:bg'&&PageUI.elements[0].type==='image'",'photo drawn first, behind text and buttons');
  check("(()=>{const b=PageUI.elements.find(e=>e.type==='button'&&!e.hidden);return PageUI.hit(b.x+2,b.y+2).id===b.id&&PageUI.hit(5,5).id==='extra:bg'})()",'buttons are picked before the photo; empty area picks the photo');
  context.photoProject=run("({...MapEditor.exportProject(),ui:StudioUI.exportData()})");
  check("ProjectData.withoutAsset(photoProject,photoAsset).project.ui.pageDesign.pages.drawTitle.extras.length===0",'deleting the photo asset removes the photo element');
  run("StudioUI.apply({...StudioUI.exportData(),pageDesign:{...StudioUI.settings.pageDesign,pages:{...StudioUI.settings.pageDesign.pages,drawTitle:{elements:{},enabled:true,extras:[]}}}},{refreshLegacy:false})");
  // UI 탭의 사진·글꼴 모음: 배경으로 넣기, 글꼴 바꾸기.
  run("PageDesigner.placePhoto(AssetBank.list().find(a=>a.kind==='image').id)");
  check("PageUI.elements.length>=0&&StudioUI.settings.pageDesign.pages[PageDesigner.page].extras[0].type==='image'",'media list places a photo on the current page');
  run("StudioUI.apply({...StudioUI.exportData(),pageDesign:{...StudioUI.settings.pageDesign,pages:{...StudioUI.settings.pageDesign.pages,[PageDesigner.page]:{elements:{},enabled:true,extras:[]}}}},{refreshLegacy:false})");
  run("PageDesigner.setFont('serif')");check("StudioUI.settings.fontFamily==='serif'",'media list changes the game font');run("PageDesigner.setFont('sans-serif')");
  // 사진으로 채운 버튼, 앞·뒤 순서, 비율 유지 크기 조절.
  run("PageDesigner.placePhoto(photoAsset);PageDesigner.placePhoto(photoAsset)");
  context.layerPage=run('PageDesigner.page');
  check("StudioUI.settings.pageDesign.pages[layerPage].extras.filter(e=>e.type==='image').length===2",'two photos on page');
  run("PageDesigner.moveLayer('front')");check("(()=>{const list=StudioUI.settings.pageDesign.pages[layerPage].extras;return list.at(-1).front===true&&'extra:'+list.at(-1).id===PageDesigner.selection})()",'bring to front puts the photo above page content');
  run("PageDesigner.moveLayer('back')");check("(()=>{const list=StudioUI.settings.pageDesign.pages[layerPage].extras;return list[0].front===false&&'extra:'+list[0].id===PageDesigner.selection})()",'send to back returns the photo to the background');
  run("PageDesigner.updateElement({width:800,height:500})");run("PageDesigner.scalePhoto(.5)");
  check("(()=>{const e=StudioUI.settings.pageDesign.pages[layerPage].extras[0];return e.width===400&&e.height===250&&e.x===200&&e.y===125})()",'shrink keeps the centre');
  run("StudioUI.apply({...StudioUI.exportData(),pageDesign:{...StudioUI.settings.pageDesign,pages:{...StudioUI.settings.pageDesign.pages,[layerPage]:{elements:{'button:select':{assetId:photoAsset}},enabled:true,extras:[]}}}},{refreshLegacy:false})");
  run("screen='title';PageUI.setPreview(layerPage);drawUI(true);PageUI.setPreview('')");
  check("PageUI.elements.find(e=>e.id==='button:select')?.assetId===photoAsset",'built-in button can be filled with a photo');
  run("StudioUI.apply({...StudioUI.exportData(),pageDesign:{...StudioUI.settings.pageDesign,pages:{...StudioUI.settings.pageDesign.pages,[layerPage]:{elements:{},enabled:true,extras:[]}}}},{refreshLegacy:false})");
  // 추가 버튼의 동작: 페이지에 맞는 기본값, 소개 페이지 열고 돌아오기, 설정 창, 링크 검사.
  assert.throws(()=>run("UIPageData.validate({pages:{drawTitle:{extras:[{id:'b',type:'button',action:'link',url:'http://bad'}]}}})"),/https/,'only https links');
  assert.throws(()=>run("UIPageData.validate({pages:{drawTitle:{extras:[{id:'b',type:'button',action:'link',url:'javascript:alert(1)'}]}}})"),'script links rejected');
  check("PageUI.command({action:'page',target:'p1'})==='page:p1'&&PageUI.command({action:'link',url:'https://a.b'})==='link:https://a.b'&&PageUI.command({})==='title'",'button commands');
  run("PageDesigner.managePage('add')");context.introPage=run('PageDesigner.page');
  run("StudioUI.apply({...StudioUI.exportData(),pageDesign:{...StudioUI.settings.pageDesign,pages:{...StudioUI.settings.pageDesign.pages,drawTitle:{elements:{},enabled:true,extras:[{id:'go',type:'button',action:'page',target:introPage,x:10,y:10,width:200,height:60,text:'소개'}]}}}},{refreshLegacy:false})");
  run("screen='title';drawUI();action(buttons.find(b=>b.id==='page:'+introPage).id)");
  check("screen==='custom-ui'",'page button opens the intro page');
  run("action('page-next')");check("screen==='title'",'next on a page opened from a button returns to where it came from');
  run("action('settings')");check("SettingsMenu.isOpen()",'settings button opens the settings window');run('SettingsMenu.close()');
  context.openedLinks=[];env.window.open=(url)=>{context.openedLinks.push(url);};run("action('link:https://www.bcmuseum.or.kr/ko/collection/')");assert.deepEqual(context.openedLinks,['https://www.bcmuseum.or.kr/ko/collection/'],'link button opens the museum page');
  run("PageDesigner.managePage('delete')");
  run("StudioUI.apply({...StudioUI.exportData(),pageDesign:{...StudioUI.settings.pageDesign,pages:{...StudioUI.settings.pageDesign.pages,drawTitle:{elements:{},enabled:true,extras:[]}}}},{refreshLegacy:false})");
  return 'PASS: editor entry/default project; per-pot radius, acceleration, damping, speed cap, restitution, invalid UI input and export; unit blocks; placement/history; map add/copy/delete/undo; sequential multi-map completion; original-map restore/GPU cleanup; UI fonts/layout; project import/export; invalid-input atomicity; OBJ/image resources; gyro projection/staleness/manual fallback; original screens (mock DOM/GPU).';
}
