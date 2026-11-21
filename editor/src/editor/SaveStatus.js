/* 편집기 저장 상태. 자동 저장과 파일 다운로드 요청을 구분합니다. */
const SaveStatus = (() => {
  let host,revision=0,backupRevision=-1,lastSavedAt=0,lastBackupAt=0,phase='idle',reason='',backupError='';
  const time=n=>new Date(n).toLocaleTimeString('ko-KR',{hour12:false});
  /** 매개변수 없음. @returns {void} 수정이 저장되기 전 상태로 표시. */
  function changed(){revision++;phase='dirty';reason='';backupError='';render();}
  /** 매개변수 없음. @returns {void} 직렬화/저장 시도 중 표시. */
  function saving(){phase='saving';render();}
  /** 매개변수 없음. @returns {void} 브라우저 저장 API 성공을 기록. */
  function saved(){phase='saved';reason='';lastSavedAt=Date.now();render();}
  /** @param error {Error} 저장 오류. @returns {void} 실패 이유와 백업 버튼 표시. */
  function failed(error){phase='failed';reason=error?.name==='QuotaExceededError'?'브라우저 저장 공간이 부족합니다.':error?.name==='SecurityError'?'브라우저가 자동 저장을 차단했습니다.':'브라우저 자동 저장에 실패했습니다.';render();}
  /** 매개변수 없음. @returns {void} 백업 다운로드 요청 시각 기록. 실제 파일 저장 완료로 간주하지 않음. */
  function backupRequested(){lastBackupAt=Date.now();backupRevision=revision;backupError='';render();}
  /** @param message {string} 백업 오류. @returns {void} 백업 요청 실패 표시. */
  function backupFailed(message){backupError=message;render();}
  /** 매개변수 없음. @returns {void} 다른 작업 안내와 별개의 지속적인 저장 상태 표시. */
  function render(){if(!host)return;host.dataset.phase=phase;
    const label={idle:'저장 대기',dirty:'저장 전 변경 있음',saving:'자동 저장 중…',saved:'자동 저장 완료 · '+(lastSavedAt?time(lastSavedAt):''),failed:'자동 저장 실패 · 파일 백업 필요'}[phase];if(host.querySelector('#save-status-label').textContent!==label)host.querySelector('#save-status-label').textContent=label;
    const backup=backupError?'백업 요청 실패: '+backupError:lastBackupAt&&backupRevision===revision?'백업 다운로드 요청 · '+time(lastBackupAt)+' · 다운로드 파일을 확인하세요.':lastBackupAt?'이전 백업 이후 변경됨 · 새 파일 백업을 권장합니다.':'파일 백업은 별도입니다. 중요한 작업은 프로젝트 백업을 해두세요.';
    const detail=(reason?reason+' ':'')+backup;if(host.querySelector('#save-status-detail').textContent!==detail)host.querySelector('#save-status-detail').textContent=detail;
    host.querySelector('#save-backup-now').hidden=phase!=='failed'&&!backupError;
  }
  /** @param panel {HTMLElement} 편집기. @returns {void} 상단 저장 표시와 즉시 백업 연결. */
  function mount(panel){host=document.createElement('section');host.id='editor-save-state';host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.innerHTML='<strong id="save-status-label"></strong><span id="save-status-detail"></span><button id="save-backup-now" hidden>지금 프로젝트 백업</button>';panel.querySelector('.editor-top').after(host);host.querySelector('#save-backup-now').onclick=()=>document.getElementById('editor-save').click();const header=panel.querySelector('.editor-top');const position=()=>{host.style.top=Math.round(header.getBoundingClientRect().height+6)+'px';};position();window.addEventListener('resize',position);if(typeof ResizeObserver!=='undefined')new ResizeObserver(position).observe(header);render();}
  return {changed,saving,saved,failed,backupRequested,backupFailed,mount,getState:()=>({phase,reason,revision,lastSavedAt,lastBackupAt,backupNeeded:phase==='failed'||revision!==backupRevision})};
})();
