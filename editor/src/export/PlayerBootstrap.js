/* 배포본 전용. 편집기/파일 선택/맵 관리 UI 없이, 내장 프로젝트로만 실행합니다.
 * 읽기: initialize → start → advance. 이 파일은 tools/build-player.mjs가 게임 HTML에 넣습니다. */
const PlayerGame = (() => {
  let ready=false;

  /** 매개변수 없음. @returns {void} 선택한 옹기로 첫 맵 시작. 사용자 클릭에서 BGM을 재생하며 거부되면 게임만 진행. */
  function start() {
    if(!ready)return;
    AssetBank.unlockEffects();
    failures=0;totalTime=0;simulationTime=0;startStage(0);screen='play';dirty=true;
    const sound=StudioUI.settings.bgmAssetId;
    if(sound)AssetBank.playSound(sound).catch(()=>notify('소리가 차단되었습니다. 상단 소리 버튼으로 다시 재생할 수 있어요.',4));
  }

  /** 매개변수 없음. @returns {boolean} 다음 프로젝트 맵이 있으면 이동 후 true, 마지막이면 false. */
  function advance() {
    if(stage>=STAGES.length-1)return false;
    startStage(stage+1);screen='play';dirty=true;return true;
  }

  /** 매개변수 없음. @returns {Promise<void>} 내장 JSON/에셋을 검증·로딩하고 타이틀/조작 선택 시작. 실패하면 안내 문구 표시. */
  async function initialize() {
    const loading=document.getElementById('player-loading');
    try {
      const project=ProjectData.validate(JSON.parse(document.getElementById('onggi-project').textContent));
      const uiSettings=StudioUI.validate(project.ui);
      const stages=project.maps.map(m=>BlockMap.compile(m,OnggiPhysics.maxRadius(uiSettings.onggiPhysics)));
      const prepared=await AssetBank.prepare(project.assets);
      AssetBank.applyPrepared(prepared);StudioUI.apply(uiSettings);
      STAGES.splice(0,STAGES.length,...stages);
      buildStageGeometry();
      for(const st of STAGES)for(const sf of st.surfaces)sf.wallSegments.push(...st.editorWalls);
      resize();ready=true;loading.hidden=true;
      GyroInput.initialize();
      const bar=document.getElementById('control-bar');
      const home=document.createElement('button');home.textContent=UI_TEXT.controls_home;
      home.onclick=()=>{screen='title';clearInput();AssetBank.stopSound();dirty=true;};
      const sound=document.createElement('button');sound.textContent=UI_TEXT.controls_sound;
      sound.onclick=()=>{AssetBank.unlockEffects();const id=StudioUI.settings.bgmAssetId;if(!id){notify('이 게임에는 BGM이 지정되어 있지 않습니다.',3);return;}AssetBank.playSound(id).catch(()=>notify('이 브라우저에서 소리를 재생하지 못했습니다.',3));};
      const mute=document.createElement('button');mute.textContent=UI_TEXT.controls_mute;mute.onclick=()=>AssetBank.setMuted(true);
      bar.append(home,sound,mute);
      requestAnimationFrame(frame);
    }catch(error){loading.hidden=false;loading.textContent='게임을 불러오지 못했습니다: '+error.message;}
  }
  return {start,advance,initialize,isReady:()=>ready};
})();
PlayerGame.initialize();
