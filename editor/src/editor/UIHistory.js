/* UI 전용 기록. 맵·옹기 물리값·에셋 바이너리는 기록하지 않습니다.
 * 읽기: record → begin/end(드래그 묶음) → undo/redo → restore. */
const UIHistory = (() => {
  const keys=['fontFamily','fontScale','imageAssetId','imageX','imageY','imageW','imageH','bgmAssetId','onggiAssets','texts','onggiTexts','layout','sfx','sfxVolume','pageDesign'];
  const past=[],future=[];let groupBefore=null,restoring=false,host;
  /** @param settings {object} UI 설정. @returns {string} UI 소유 필드만 담은 작은 기록. */
  function snapshot(settings){const value={};for(const key of keys)if(settings[key]!==undefined)value[key]=settings[key];return JSON.stringify(value);}
  /** 매개변수 없음. @returns {void} 최대 60단계/약 8MiB 이내로 기록 유지. */
  function trim(){let bytes=[...past,...future].reduce((sum,s)=>sum+s.length*2,0);while(past.length>60||bytes>8*1024*1024&&past.length>1)bytes-=past.shift().length*2;}
  /** @param before {object} 변경 전 설정. @param after {object} 변경 후 설정. @returns {void} 실제 UI 변경만 기록. */
  function record(before,after){if(restoring)return;const a=snapshot(before),b=snapshot(after);if(a===b)return;SaveStatus.changed();if(groupBefore!==null)return;past.push(a);future.length=0;trim();render();}
  /** 매개변수 없음. @returns {void} 드래그 시작의 UI 상태를 한 번만 기록할 준비. */
  function begin(){if(groupBefore===null)groupBefore=snapshot(StudioUI.exportData());}
  /** 매개변수 없음. @returns {void} 드래그 여러 프레임을 실행 취소 한 단계로 묶음. */
  function end(){if(groupBefore===null)return;const before=groupBefore;groupBefore=null;const after=snapshot(StudioUI.exportData());if(before!==after){past.push(before);future.length=0;trim();render();}}
  /** @param value {string} UI 기록. @returns {void} 현재 맵/물리 설정을 유지하며 UI만 복원·저장. */
  function restore(value){const next={...StudioUI.exportData(),...JSON.parse(value)};ProjectData.validate({...MapEditor.exportProject(),ui:next});restoring=true;try{StudioUI.apply(next,{history:false,refreshLegacy:false});StudioUI.save();if(typeof PageDesigner!=='undefined')PageDesigner.refresh();}finally{restoring=false;}render();}
  /** @param isUndo {boolean} true=취소, false=다시 실행. @returns {void} 입력 중인 드래그를 마무리하고 해당 기록 복원. */
  function move(isUndo){if(typeof PageDesigner!=='undefined')PageDesigner.finishDrag();end();const from=isUndo?past:future,to=isUndo?future:past;if(!from.length)return;const value=from[from.length-1],current=snapshot(StudioUI.exportData());try{restore(value);from.pop();to.push(current);trim();render();}catch(error){if(host)host.querySelector('#ui-history-state').textContent='복원 실패: '+error.message;}}
  /** 매개변수 없음. @returns {void} 프로젝트/담당 파일을 불러온 뒤 이전 문서의 기록 삭제. */
  function reset(){past.length=0;future.length=0;groupBefore=null;render();}
  /** 매개변수 없음. @returns {void} 기록 개수와 버튼 활성 상태 갱신. */
  function render(){if(!host)return;host.querySelector('#ui-undo').disabled=!past.length;host.querySelector('#ui-redo').disabled=!future.length;host.querySelector('#ui-history-state').textContent='UI 기록 '+past.length+'단계 · 드래그 한 번은 한 단계';}
  /** @param container {HTMLElement} UI 편집기. @returns {void} UI 전용 취소/다시 실행 버튼. */
  function mount(container){host=document.createElement('div');host.className='ui-history-toolbar';host.innerHTML='<button id="ui-undo" title="Ctrl+Z">↶ UI 실행 취소</button><button id="ui-redo" title="Ctrl+Shift+Z 또는 Ctrl+Y">↷ 다시 실행</button><span id="ui-history-state" role="status"></span>';container.querySelector('.page-toolbar').after(host);host.querySelector('#ui-undo').onclick=()=>move(true);host.querySelector('#ui-redo').onclick=()=>move(false);render();}
  return {record,begin,end,reset,mount,undo:()=>move(true),redo:()=>move(false),getState:()=>({undo:past.length,redo:future.length,grouping:groupBefore!==null})};
})();
