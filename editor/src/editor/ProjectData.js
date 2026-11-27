/* 읽기 1: 단위 블록 변환 → 프로젝트 검사 → 맵 편집기. 외부 파일이나 DOM에 접근하지 않는 데이터 계층. */
const ProjectData = (() => {
  /** @param value {object} v3 또는 단위 블록 맵. @returns {object} 바닥 사각형을 1칸씩 분할하고 나머지를 격자 중앙에 맞춘 맵. */
  function unitMap(value) {
    const old = BlockMap.validate(value);
    const blocks = [], occupied = new Set();
    for (const source of old.blocks) {
      const rect = BlockMap.rectangle(source);
      const points = [];
      if (source.type === 'floor') {
        for (let x = Math.ceil(rect.x-rect.w/2-0.5); x <= Math.floor(rect.x+rect.w/2-0.5); x++) {
          for (let z = Math.ceil(rect.z-rect.d/2-0.5); z <= Math.floor(rect.z+rect.d/2-0.5); z++) {
            if (x+0.5>=rect.x-rect.w/2 && z+0.5>=rect.z-rect.d/2) points.push([x+0.5,z+0.5]);
          }
        }
      } else points.push([Math.floor(source.x)+0.5,Math.floor(source.z)+0.5]);
      for (const [x,z] of points) {
        if (x < -8.5 || x > 7.5 || z < -5.5 || z > 5.5) continue;
        const key = `${source.type}:${source.preset || ''}:${x}:${z}`;
        if (occupied.has(key)) continue;
        occupied.add(key);
        blocks.push({...source,id:`unit-${blocks.length}`,x,z,w:source.room?3:1,d:source.room?3:1});
      }
    }
    return BlockMap.validate({...old,blocks});
  }

  /** @param value {unknown} 단일맵 또는 v4 프로젝트 JSON. @returns {object} 검증된 프로젝트. 맵 수 1~20, 에셋/설정은 각 모듈이 추가 검사. */
  function validate(value) {
    const project = value?.kind === 'onggi-project' ? value : {kind:'onggi-project',version:4,maps:[value],ui:{},assets:[]};
    if (project.version !== 4 || !Array.isArray(project.maps) || project.maps.length < 1 || project.maps.length > 20) {
      throw Error('프로젝트는 버전 4, 맵 개수는 1~20개여야 합니다.');
    }
    if (!Array.isArray(project.assets) || project.assets.length > 30) throw Error('에셋은 최대 30개입니다.');
    const maps=project.maps.map(unitMap);
    const ids=new Set();let dataSize=0;
    for(const asset of project.assets){
      if(!asset||typeof asset.id!=='string'||!/^[\w-]{1,80}$/.test(asset.id)||ids.has(asset.id)||typeof asset.name!=='string'||typeof asset.data!=='string'||!['image','font','audio','model'].includes(asset.kind))throw Error('에셋의 ID/종류/데이터를 확인하세요.');
      ids.add(asset.id);dataSize+=asset.data.length;
      if(asset.data.length>(Math.ceil(20*1024*1024/3)*4+128)||dataSize>80*1024*1024)throw Error('에셋 용량이 너무 큽니다. 개별 20MB, 전체 약 60MB 이내로 줄여 주세요.');
    }
    for(const [key,kind]of [['imageAssetId','image'],['bgmAssetId','audio'],['floorAssetId','image']])if(project.ui?.[key]&&!project.assets.some(a=>a.id===project.ui[key]&&a.kind===kind))throw Error('UI/BGM이 참조하는 에셋이 없습니다.');
    for(const id of Object.values(project.ui?.onggiAssets||{}))if(!project.assets.some(a=>a.id===id&&a.kind==='model'))throw Error('옹기가 참조하는 OBJ 에셋이 없습니다.');
    for(const map of maps)for(const block of map.blocks)if(block.assetId&&!ids.has(block.assetId))throw Error('블록이 참조하는 에셋이 JSON에 없습니다.');
    for (const [model,image] of Object.entries(project.ui?.modelTextures||{})) {
      if (!project.assets.some(a=>a.id===model&&a.kind==='model') ||
          !project.assets.some(a=>a.id===image&&a.kind==='image')) throw Error('OBJ 텍스처에 연결된 모델 또는 이미지가 없습니다.');
    }
    const visual = (id, type) => {
      const asset = project.assets.find(a => a.id === id);
      const allowed = ['floor','hole'].includes(type) ? ['image'] : ['image','model'];
      if (!asset || !allowed.includes(asset.kind)) throw Error(type + ': 이미지 또는 지원하는 OBJ 에셋을 지정하세요. 바닥·구멍은 이미지만 지원합니다.');
    };
    for (const [type,id] of Object.entries(project.ui?.blockAssets || {})) visual(id,type);
    for (const id of Object.values(project.ui?.sfx || {})) if (!project.assets.some(a=>a.id===id && a.kind==='audio')) throw Error('효과음이 참조하는 오디오가 없습니다.');
    for (const m of maps) for (const b of m.blocks) if (b.skinAssetId) visual(b.skinAssetId,b.type);
    return {kind:'onggi-project',version:4,maps,ui:project.ui||{},assets:project.assets};
  }
  /** @param value {object} 전체 프로젝트. @param id {string} 삭제할 에셋 ID.
   * @returns {object} {project,removedBlocks,clearedBindings}. 원본 객체/파일은 변경하지 않음.
   * 외형은 기본값으로, 소리는 해제로 복구하며 해당 에셋 장식 블록만 제거합니다. */
  function withoutAsset(value,id) {
    const checked=validate(value);
    const project={...checked,ui:JSON.parse(JSON.stringify(checked.ui)),assets:checked.assets.map(a=>({...a}))};
    if(!project.assets.some(a=>a.id===id))throw Error('삭제할 에셋을 선택하세요.');
    let removedBlocks=0,clearedBindings=0;
    project.assets=project.assets.filter(a=>a.id!==id);
    for(const map of project.maps) {
      map.blocks=map.blocks.filter(b=>{if(b.type==='asset'&&b.assetId===id){removedBlocks++;return false;}return true;});
      for(const b of map.blocks)for(const key of ['assetId','skinAssetId'])if(b[key]===id){delete b[key];clearedBindings++;}
    }
    for(const key of ['imageAssetId','floorAssetId','bgmAssetId'])if(project.ui[key]===id){project.ui[key]='';clearedBindings++;}
    for(const field of ['onggiAssets','blockAssets','sfx'])for(const [key,asset]of Object.entries(project.ui[field]||{}))if(asset===id){delete project.ui[field][key];clearedBindings++;}
    for (const [model,image] of Object.entries(project.ui.modelTextures||{})) {
      if (model===id || image===id) {
        delete project.ui.modelTextures[model];
        clearedBindings++;
      }
    }
    for(const p of [...Object.values(project.ui.pageDesign?.pages||{}),...(project.ui.pageDesign?.extraPages||[])]){
      const before=(p.extras||[]).length;
      p.extras=(p.extras||[]).filter(e=>!(e.type==='image'&&e.assetId===id));
      clearedBindings+=before-p.extras.length;
    }
    if(project.ui.fontFamily==='onggi_'+id.replace(/[^a-zA-Z0-9]/g,'')){project.ui.fontFamily='sans-serif';clearedBindings++;}
    return {project:validate(project),removedBlocks,clearedBindings};
  }
  return {unitMap,validate,withoutAsset};
})();
