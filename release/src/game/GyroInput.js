/* 읽기: choose → enable → orientation → sample. 센서는 기기 내부에서만 사용하며 전송하지 않습니다. */
const GyroInput = (() => {
  let mode='manual', latest=null, neutral=null, filter={x:0,z:0}, stamp=0;
  let dialog, message, timer, requestId=0;

  /** @param event {DeviceOrientationEvent} beta/gamma(도). @returns {void} 유효한 센서 값만 저장. 화면 회전은 sample에서 변환. */
  function orientation(event) {
    if(!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
    latest={beta:event.beta,gamma:event.gamma};stamp=performance.now();
    if(!neutral) {calibrate();if(message)message.textContent='센서 준비 완료. 편한 자세가 중립으로 저장되었습니다.';}
  }

  /** 매개변수 없음. @returns {boolean} 최신 센서 자세를 중립으로 지정. stale/no-data면 false. */
  function calibrate() {
    if(mode!=='gyro'||!latest||performance.now()-stamp>1500)return false;
    neutral={...latest};filter={x:0,z:0};clearInput();return true;
  }

  /** @param beta {number} 앞뒤 각도 차(도). @param gamma {number} 좌우 차(도).
   * @param angle {number} 화면 회전(도). @returns {{x:number,z:number}} 현재 화면 방향에 맞춘 기울기 명령. */
  function project(beta,gamma,angle) {
    const a=angle*Math.PI/180;
    return {x:-(gamma*Math.cos(a)+beta*Math.sin(a))/20,z:(beta*Math.cos(a)-gamma*Math.sin(a))/20};
  }

  /** 매개변수 없음. @returns {{x:number,z:number}|null} 센서 모드가 아니면 null. 중립/백그라운드/오래된 값은 0. 단위 원으로 제한. */
  function sample() {
    if(mode!=='gyro')return null;
    if(!latest||!neutral||document.hidden||performance.now()-stamp>1500)return {x:0,z:0};
    const angle=window.screen?.orientation?.angle ?? window.orientation ?? 0;
    const delta=value=>((value+540)%360)-180;
    const raw=project(delta(latest.beta-neutral.beta),delta(latest.gamma-neutral.gamma),angle);
    const length=Math.max(1,Math.hypot(raw.x,raw.z));
    // 필터는 센서 이벤트 빈도와 무관하게 고정 물리 시간 간격으로 적용.
    const alpha=1-Math.exp(-12*GAME_CONFIG.physics.fixedStep);
    filter.x+=(raw.x/length-filter.x)*alpha;filter.z+=(raw.z/length-filter.z)*alpha;
    return {x:Math.abs(filter.x)<0.025?0:filter.x,z:Math.abs(filter.z)<0.025?0:filter.z};
  }

  /** 매개변수 없음. @returns {Promise<void>} 버튼 클릭 안에서 권한 요청. 거부/미지원 시 대화상자를 유지하며 대체 조작 안내. */
  async function enable() {
    const ticket=++requestId;
    try {
      if(typeof DeviceOrientationEvent==='undefined')throw Error('이 기기/브라우저에는 방향 센서 API가 없습니다.');
      if(!window.isSecureContext)throw Error('센서는 HTTPS 또는 localhost에서 열어야 합니다. 파일 실행이 차단되면 일반 조작을 선택하세요.');
      if(typeof DeviceOrientationEvent.requestPermission==='function') {
        const result=await DeviceOrientationEvent.requestPermission();
        if(result!=='granted')throw Error('동작/방향 센서 권한이 거부되었습니다. 일반 조작을 선택하거나 브라우저 권한을 확인하세요.');
      }
      if(ticket!==requestId)return;
      window.removeEventListener('deviceorientation',orientation);
      latest=neutral=null;filter={x:0,z:0};mode='gyro';
      window.addEventListener('deviceorientation',orientation);
      message.textContent='기기를 편한 자세로 잡고 기다려 주세요. 센서가 들어오면 중립을 맞춥니다.';
      clearTimeout(timer);
      timer=setTimeout(()=>{if(mode==='gyro'&&!latest){message.textContent='센서 값이 오지 않습니다. HTTPS 실행/기기 지원을 확인하거나 일반 조작을 선택하세요.';}},2500);
      document.getElementById('gyro-continue').hidden=false;
    } catch(error) {mode='manual';window.removeEventListener('deviceorientation',orientation);clearTimeout(timer);latest=neutral=null;message.textContent=error.message;}
  }

  /** 매개변수 없음. @returns {void} 입력을 비우고 시작 시/상단 조작 방식 버튼에서 선택 창 표시. */
  function choose() {dialog.hidden=false;clearInput();}

  /** 매개변수 없음. @returns {void} 시작 선택·재보정 버튼 구성. 권한 요청은 자동 실행하지 않음. */
  function initialize() {
    dialog=document.createElement('section');dialog.className='studio-dialog';dialog.id='control-dialog';
    dialog.innerHTML='<div class="studio-card"><h2 id="control-title">어떻게 조작할까요?</h2><p id="control-hint">키보드/화면 조이스틱 또는 기기를 기울이는 모드를 선택하세요.</p><button id="choose-manual">키보드 · 조이스틱</button> <button id="choose-gyro">휴대폰 · 태블릿 기울이기</button><p id="gyro-message" role="status">기울이기는 센서 지원과 권한이 필요합니다. 브라우저에 따라 HTTPS 실행이 필요합니다.</p><button id="gyro-continue" hidden>센서 모드로 계속</button></div>';
    document.body.append(dialog);message=document.getElementById('gyro-message');message.textContent=UI_TEXT.controls_permission_hint;
    document.getElementById('choose-manual').onclick=()=>{requestId++;mode='manual';window.removeEventListener('deviceorientation',orientation);clearTimeout(timer);dialog.hidden=true;clearInput();};
    document.getElementById('choose-gyro').onclick=enable;
    document.getElementById('gyro-continue').onclick=()=>{if(!latest){message.textContent='센서가 아직 준비되지 않았습니다. 일반 조작을 선택할 수 있습니다.';return;}calibrate();dialog.hidden=true;};
    const bar=document.createElement('div');bar.id='control-bar';
    const select=document.createElement('button');select.id='control-choose';select.textContent=UI_TEXT.controls_choose;select.onclick=choose;
    const reset=document.createElement('button');reset.id='control-calibrate';reset.textContent=UI_TEXT.controls_calibrate;reset.onclick=()=>{if(!calibrate()){choose();message.textContent='먼저 기울이기 모드를 선택하고 센서 값을 기다려 주세요.';}};
    bar.append(select,reset);document.body.append(bar);refreshLabels();
    window.addEventListener('orientationchange',()=>{neutral=null;filter={x:0,z:0};});
    window.addEventListener('blur',()=>{filter={x:0,z:0};stamp=0;});
  }

  /** 매개변수 없음. @returns {void} UI 편집에서 변경한 조작 메뉴 문구를 반영. 권한 오류 메시지는 덮어쓰지 않습니다. */
  function refreshLabels(){if(!dialog)return;for(const [id,key]of [['control-title','controls_title'],['control-hint','controls_hint'],['choose-manual','controls_manual'],['choose-gyro','controls_gyro'],['gyro-continue','controls_continue'],['control-choose','controls_choose'],['control-calibrate','controls_calibrate']]){const node=document.getElementById(id);if(node)node.textContent=UI_TEXT[key];}}

  return {refreshLabels,initialize,choose,enable,orientation,calibrate,project,sample,isChoosing:()=>dialog&&!dialog.hidden};
})();
