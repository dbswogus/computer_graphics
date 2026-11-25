/* 담당별 설정 규격. 순수 데이터 함수: part → combine → stringify/parse.
 * UI: 유리 / 맵: 다유 / 물리: 재현. 파일명은 안정적으로 두고 이름은 주석과 편집기에 표시합니다. */
const TeamSource = (() => {
  const roles = {
    ui: { owner:'UI', name:'UIConfig.js', symbol:'TEAM_UI_SOURCE' },
    sound: { owner:'소리', name:'soundConfig.js', symbol:'TEAM_SOUND_SOURCE' },
    asset: { owner:'에셋', name:'assetConfig.js', symbol:'TEAM_ASSET_SOURCE' },
    physics: { owner:'물리', name:'PhysicsConfig.js', symbol:'TEAM_PHYSICS_SOURCE' },
    map: { owner:'맵', name:'MapConfig.js', symbol:'TEAM_MAP_SOURCE' }
  };
  const uiKeys=['fontFamily','fontScale','imageAssetId','imageX','imageY','imageW','imageH','texts','onggiTexts','layout','pageDesign'];
  const soundKeys=['bgmAssetId','sfx','sfxVolume'];
  const assetKeys=['onggiAssets','blockAssets','floorAssetId','modelTextures'];

  function settings(source, keys) {
    return Object.fromEntries(keys.filter(key => source?.[key] !== undefined).map(key => [key, source[key]]));
  }

  /** 읽기 1. @param role {string} ui/map/physics. @param project {object} 검증된 프로젝트.
   * @returns {object} 담당 설정과 그 설정이 실제 사용하는 에셋만 포함한 독립 데이터. */
  function part(role,project) {
    if(!roles[role])throw Error('담당 종류 오류');
    const ui=project.ui || {};
    const data = {
      ui: () => ({ settings: settings(ui,uiKeys) }),
      sound: () => ({ settings: settings(ui,soundKeys) }),
      asset: () => ({ settings: settings(ui,assetKeys), assets: project.assets }),
      physics: () => ({ onggiPhysics: ui.onggiPhysics || {} }),
      map: () => ({ maps: project.maps })
    }[role]();
    return JSON.parse(JSON.stringify({kind:'onggi-team-'+role,version:1,assets:[],...data}));
  }

  function combine(parts) {
    for (const role of Object.keys(roles)) {
      if (!parts[role] && ['sound','asset'].includes(role)) continue;
      if (parts[role]?.kind !== 'onggi-team-'+role || parts[role].version !== 1 || !Array.isArray(parts[role].assets)) {
        throw Error('설정 파일 규격 오류: '+role);
      }
    }
    const ui = {
      ...settings(parts.ui.settings,uiKeys),
      ...settings(parts.sound ? parts.sound.settings : parts.ui.settings,soundKeys),
      ...settings(parts.asset ? parts.asset.settings : {...parts.ui.settings,...parts.map},assetKeys),
      onggiPhysics: parts.physics.onggiPhysics || {}
    };
    const assets = new Map();
    for (const role of Object.keys(roles)) for (const asset of parts[role]?.assets || []) {
      const old = assets.get(asset.id);
      if (old && (old.kind !== asset.kind || old.name !== asset.name || old.data !== asset.data)) {
        throw Error('에셋 ID 충돌: '+asset.id);
      }
      assets.set(asset.id,asset);
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
  function fromScripts() {
    return combine({
      ui: TEAM_UI_SOURCE, map: TEAM_MAP_SOURCE, physics: TEAM_PHYSICS_SOURCE,
      sound: typeof TEAM_SOUND_SOURCE === 'undefined' ? undefined : TEAM_SOUND_SOURCE,
      asset: typeof TEAM_ASSET_SOURCE === 'undefined' ? undefined : TEAM_ASSET_SOURCE
    });
  }
  return {roles,part,combine,stringify,parse,fromScripts};
})();
