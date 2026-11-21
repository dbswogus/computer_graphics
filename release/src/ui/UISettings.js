const StudioUI=(()=>{const defaults={fontFamily:'sans-serif',fontScale:1,imageAssetId:'',imageX:1100,imageY:300,imageW:200,imageH:200,bgmAssetId:'',floorAssetId:'',onggiAssets:{},onggiPhysics:{},pageDesign:{},texts:{},onggiTexts:{}};let settings={...defaults};const defaultLayout=JSON.parse(JSON.stringify(UI_LAYOUT));const defaultTexts={...UI_TEXT},defaultOnggiTexts=collectOnggiText();
function collectOnggiText(){const result={};COLLECTION.forEach((item,i)=>{for(const field of ['name','shape','question'])result[i+'.'+field]=item[field];item.lines.forEach((line,j)=>{result[i+'.lines.'+j]=line;});});return result;}
function applyTextSettings(next){Object.assign(UI_TEXT,next.texts);for(const [key,value]of Object.entries(next.onggiTexts)){const [id,field,index]=key.split('.');if(field==='lines')COLLECTION[id].lines[Number(index)]=value;else COLLECTION[id][field]=value;}refreshNarrativeText();PageUI.syncNarrative(next.pageDesign);if(typeof GyroInput!=='undefined')GyroInput.refreshLabels();}
function validate(value={}) {
    const next={...defaults,layout:JSON.parse(JSON.stringify(defaultLayout)),texts:{...defaultTexts},onggiTexts:{...defaultOnggiTexts},onggiAssets:{}};
    if(value.fontFamily!==undefined){if(typeof value.fontFamily!=='string'||value.fontFamily.length>150)throw Error('폰트 이름이 올바르지 않습니다.');next.fontFamily=value.fontFamily;}
    for(const [key,min,max]of [['fontScale',.5,2],['imageX',-1600,3200],['imageY',-1000,2000],['imageW',1,1600],['imageH',1,1000]]){
      if(value[key]!==undefined){if(typeof value[key]!=='number'||!Number.isFinite(value[key])||value[key]<min||value[key]>max)throw Error('UI 설정 범위 오류: '+key);next[key]=value[key];}
    }
    if(value.imageAssetId!==undefined){if(typeof value.imageAssetId!=='string')throw Error('이미지 ID가 잘못되었습니다.');next.imageAssetId=value.imageAssetId.slice(0,80);}
    if(value.bgmAssetId!==undefined){if(typeof value.bgmAssetId!=='string')throw Error('BGM ID가 잘못되었습니다.');next.bgmAssetId=value.bgmAssetId.slice(0,80);}
    for(const key of ['floorAssetId']){if(value[key]!==undefined){if(typeof value[key]!=='string')throw Error('바닥 에셋 ID 오류');next[key]=value[key].slice(0,80);}}
    for(const [field,allowed]of [['texts',defaultTexts],['onggiTexts',defaultOnggiTexts]]){
      if(value[field]!==undefined){if(!value[field]||typeof value[field]!=='object'||Array.isArray(value[field]))throw Error('텍스트 설정은 객체여야 합니다.');for(const [key,text]of Object.entries(value[field])){if(!Object.hasOwn(allowed,key)||typeof text!=='string'||text.length>500)throw Error('허용된 문구 키와 500자 이하 텍스트가 필요합니다.');next[field][key]=text;}}
    }
    if(value.onggiAssets!==undefined){if(!value.onggiAssets||typeof value.onggiAssets!=='object'||Array.isArray(value.onggiAssets))throw Error('옹기 에셋 설정 오류');for(const [id,asset]of Object.entries(value.onggiAssets)){if(!/^[0-5]$/.test(id)||typeof asset!=='string'||!/^[\w-]{1,80}$/.test(asset))throw Error('옹기 번호/모델 ID 오류');next.onggiAssets[id]=asset;}}
    // 읽기: 종류별 외형 → 효과음 → 물리값. 모두 ID만 저장하며 외부 URL을 받지 않습니다.
    for (const [field, keys] of [
      ['blockAssets', ['floor','wall','hole','sweeper','crumble','checkpoint','start','goal']],
      ['sfx', ['checkpoint','arrival','projectSave','fail']]
    ]) {
      next[field] = {};
      if (value[field] !== undefined) {
        if (!value[field] || typeof value[field] !== 'object' || Array.isArray(value[field])) throw Error('에셋 설정은 객체여야 합니다.');
        for (const [key, id] of Object.entries(value[field])) {
          if (!keys.includes(key) || typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id)) throw Error('에셋 종류 또는 ID가 올바르지 않습니다.');
          next[field][key] = id;
        }
      }
    }
    if (value.sfxVolume !== undefined) {
      if (typeof value.sfxVolume !== 'number' || !Number.isFinite(value.sfxVolume) || value.sfxVolume < 0 || value.sfxVolume > 1) throw Error('효과음 음량은 0~1입니다.');
      next.sfxVolume = value.sfxVolume;
    }
    next.pageDesign=UIPageData.validate(value.pageDesign||{});
    next.onggiPhysics=OnggiPhysics.validate(value.onggiPhysics||{});
    if(value.layout){for(const [screen,items]of Object.entries(value.layout)){
      if(!Object.hasOwn(defaultLayout,screen)||!items||typeof items!=='object')throw Error('알 수 없는 UI 화면입니다.');
      for(const [id,props]of Object.entries(items)){
        if(!Object.hasOwn(defaultLayout[screen],id)||!props||typeof props!=='object')throw Error('알 수 없는 UI 요소입니다.');
        for(const [key,number]of Object.entries(props)){
          if(!Object.hasOwn(defaultLayout[screen][id],key)||typeof number!=='number'||!Number.isFinite(number)||Math.abs(number)>4000)throw Error('UI 위치/크기 값이 잘못되었습니다.');
          if(['width','height','fontSize','radius','lineWidth','scale'].includes(key)&&number<=0)throw Error('UI 크기는 0보다 커야 합니다.');
          next.layout[screen][id][key]=number;
        }
      }
    }}
    return next;
  }
function apply(value){const next=validate(value);settings={...next};delete settings.layout;GAME_CONFIG.ui.fontFamily=settings.fontFamily;applyTextSettings(next);OnggiPhysics.applySelected();for(const [screen,items]of Object.entries(next.layout))for(const [id,props]of Object.entries(items))Object.assign(UI_LAYOUT[screen][id],props);dirty=true;}return {validate,apply,get settings(){return settings;}};})();
