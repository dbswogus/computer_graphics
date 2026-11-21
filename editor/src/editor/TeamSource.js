/* 담당별 설정 규격. 순수 데이터 함수: part → combine → stringify/parse.
 * UI: 유리 / 맵: 다유 / 물리: 재현. 파일명은 안정적으로 두고 이름은 주석과 편집기에 표시합니다. */
const TeamSource = (() => {
  const roles={ui:{owner:'유리',name:'UIConfig.js',symbol:'TEAM_UI_SOURCE'},map:{owner:'다유',name:'MapConfig.js',symbol:'TEAM_MAP_SOURCE'},physics:{owner:'재현',name:'PhysicsConfig.js',symbol:'TEAM_PHYSICS_SOURCE'}};
  const uiKeys=['fontFamily','fontScale','imageAssetId','imageX','imageY','imageW','imageH','bgmAssetId','onggiAssets','texts','onggiTexts','layout','sfx','sfxVolume'];

  /** 읽기 1. @param role {string} ui/map/physics. @param project {object} 검증된 프로젝트.
   * @returns {object} 담당 설정과 그 설정이 실제 사용하는 에셋만 포함한 독립 데이터. */
  function part(role,project) {
    if(!roles[role])throw Error('담당 종류 오류');
    const ui=project.ui || {}, refs=new Set();let data={};
    if(role==='ui') {
      data.settings={};for(const key of uiKeys)if(ui[key]!==undefined)data.settings[key]=ui[key];
      for(const id of [ui.imageAssetId,ui.bgmAssetId,...Object.values(ui.onggiAssets||{}),...Object.values(ui.sfx||{})])if(id)refs.add(id);
      for(const a of project.assets || [])if(a.kind==='font' && ui.fontFamily==='onggi_'+a.id.replace(/[^a-zA-Z0-9]/g,''))refs.add(a.id);
    }
    if(role==='map') {
      data.maps=project.maps;data.blockAssets=ui.blockAssets||{};data.floorAssetId=ui.floorAssetId||'';
      for(const id of [data.floorAssetId,...Object.values(data.blockAssets)])if(id)refs.add(id);
      for(const m of project.maps)for(const b of m.blocks)for(const id of [b.assetId,b.skinAssetId])if(id)refs.add(id);
    }
    if(role==='physics')data.onggiPhysics=ui.onggiPhysics||{};
    const assets=(project.assets||[]).filter(a=>refs.has(a.id)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    if(assets.length!==refs.size)throw Error('담당 설정에서 사용하는 에셋이 없습니다.');
    return JSON.parse(JSON.stringify({kind:'onggi-team-'+role,version:1,...data,assets}));
  }

  /** 읽기 2. @param parts {object} {ui,map,physics}. @returns {object} 담당 데이터를 합친 v4 프로젝트.
   * 다른 담당 필드를 섞지 않고, 같은 에셋 ID의 내용이 다르면 오류로 멈춥니다. 이후 ProjectData/StudioUI 검증이 필요합니다. */
  function combine(parts) {
    for(const role of Object.keys(roles))if(parts[role]?.kind!=='onggi-team-'+role || parts[role].version!==1 || !Array.isArray(parts[role].assets))throw Error('담당 파일 규격 오류: '+role);
    const ui={};for(const key of uiKeys)if(parts.ui.settings?.[key]!==undefined)ui[key]=parts.ui.settings[key];
    Object.assign(ui,{blockAssets:parts.map.blockAssets||{},floorAssetId:parts.map.floorAssetId||'',onggiPhysics:parts.physics.onggiPhysics||{}});
    const assets=new Map();
    for(const role of Object.keys(roles))for(const a of parts[role].assets) {
      const old=assets.get(a.id);
      if(old && (old.kind!==a.kind || old.name!==a.name || old.data!==a.data))throw Error('에셋 ID 충돌: '+a.id+' / 한쪽 파일을 새 에셋으로 다시 추가하세요.');
      assets.set(a.id,a);
    }
    return JSON.parse(JSON.stringify({kind:'onggi-project',version:4,maps:parts.map.maps,ui,assets:[...assets.values()]}));
  }

  /** 읽기 3. @param role {string} 담당 종류. @param value {object} part 반환값.
   * @returns {string} 주석과 JSON 상수만 있는 JS. HTML 안에 넣어도 안전하도록 < 문자를 이스케이프합니다. */
  function stringify(role,value) {
    const info=roles[role];if(!info)throw Error('담당 종류 오류');
    return '// 담당: '+info.owner+' | '+info.name+' | 편집기에서 담당별 내보내기로 생성\nconst '+info.symbol+' = '+JSON.stringify(value,null,2).replace(/</g,'\\u003c')+';\n';
  }

  /** 읽기 4. @param role {string} 담당 종류. @param text {string} 내보낸 JS 원문.
   * @returns {object} 정확한 상수 선언 안의 JSON만 해석. import/eval/스크립트 실행은 하지 않습니다. */
  function parse(role,text) {
    const info=roles[role];if(!info || typeof text!=='string' || text.length>100*1024*1024)throw Error('담당 파일을 확인하세요.');
    const clean=text.replace(/^\s*\/\/[^\n]*(?:\n|$)/,'').trim();
    const prefix='const '+info.symbol+' = ';
    if(!clean.startsWith(prefix)||!clean.endsWith(';'))throw Error(info.name+' 형식이 아닙니다. 편집기에서 내보낸 파일을 선택하세요.');
    const data=JSON.parse(clean.slice(prefix.length,-1));
    if(data.kind!=='onggi-team-'+role || data.version!==1 || !Array.isArray(data.assets))throw Error('담당 파일 종류/버전 오류');
    return data;
  }
  return {roles,part,combine,stringify,parse};
})();
