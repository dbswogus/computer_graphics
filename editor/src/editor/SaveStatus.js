/* 수동 파일 저장 안내. localStorage에 쓰지 않으며 다운로드 완료로 오인하지 않습니다. */
const SaveStatus = (() => {
  let host,revision=0,backupRevision=-1,lastBackupAt=0,phase='idle',reason='';
  const time=n=>new Date(n).toLocaleTimeString('ko-KR',{hour12:false});
  /** 매개변수 없음. @returns {void} 메모리에만 변경이 있음을 표시. */
  function changed(){revision++;phase='dirty';reason='';render();}
  /** 매개변수 없음. @returns {void} 파일/소스에서 불러온 상태 표시. 자동 저장 완료를 의미하지 않음. */
  function sourceLoaded(){phase='idle';reason='';backupRevision=-1;lastBackupAt=0;render();}
  /** 매개변수 없음. @returns {void} 파일 다운로드 요청 기록. 실제 다운로드 파일은 사용자가 확인. */
  function backupRequested(){lastBackupAt=Date.now();backupRevision=revision;phase='backup-requested';reason='';render();}
  /** @param message {string} 요청 오류. @returns {void} 파일 백업 실패 표시. */
  function backupFailed(message){phase='failed';reason=message;render();}
  /** 매개변수 없음. @returns {void} 브라우저 자동 저장 대신 수동 저장 안내. */
  function render(){if(!host)return;host.dataset.phase=phase;
    const label={idle:'수동 저장 방식 · 자동 저장 없음',dirty:'저장하지 않은 변경 있음', 'backup-requested':'백업 다운로드 요청됨',failed:'백업 요청 실패'}[phase];
    const detail=phase==='backup-requested'?time(lastBackupAt)+' · 다운로드된 JSON 파일을 확인하고 보관하세요.':phase==='failed'?reason+' · 프로젝트 백업을 다시 시도하세요.':'종료·새로고침 전에 프로젝트 백업 또는 담당별 내보내기를 해주세요.';
    if(host.querySelector('#save-status-label').textContent!==label)host.querySelector('#save-status-label').textContent=label;
    if(host.querySelector('#save-status-detail').textContent!==detail)host.querySelector('#save-status-detail').textContent=detail;
    host.querySelector('#save-backup-now').hidden=phase==='backup-requested';
  }
  /** @param panel {HTMLElement} 편집기. @returns {void} 상단의 수동 백업 버튼 구성. */
  function mount(panel){host=document.createElement('section');host.id='editor-save-state';host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.innerHTML='<strong id="save-status-label"></strong><span id="save-status-detail"></span><button id="save-backup-now">프로젝트 백업</button>';panel.querySelector('.editor-top').after(host);host.querySelector('#save-backup-now').onclick=()=>document.getElementById('editor-save').click();const header=panel.querySelector('.editor-top'),position=()=>{host.style.top=Math.round(header.getBoundingClientRect().height+6)+'px';};position();window.addEventListener('resize',position);if(typeof ResizeObserver!=='undefined')new ResizeObserver(position).observe(header);render();}
  return {changed,sourceLoaded,backupRequested,backupFailed,mount,getState:()=>({phase,reason,revision,lastBackupAt,backupNeeded:revision!==backupRevision})};
})();
