/* 읽기: defaults → validate → get/current → applySelected.
 * 옹기별 설정이 없는 항목은 GameConfig 기본값을 사용합니다. 무게 kg를 흉내 내는 대신 실제 계산에 쓰는 값을 조절합니다. */
const OnggiPhysics = (() => {
  const limits={radius:[0.15,0.7],accelerationScale:[0,3],damping:[0,8],maxSpeed:[0.1,20],wallRestitution:[0,1]};

  /** 매개변수 없음. @returns {object} 현재 전역 설정에서 파생한 기본 물리값. */
  function defaults() {
    return {radius:GAME_CONFIG.physics.playerRadius,accelerationScale:1,damping:GAME_CONFIG.physics.damping,maxSpeed:GAME_CONFIG.physics.maxSpeed,wallRestitution:GAME_CONFIG.physics.wallRestitution};
  }

  /** @param value {object} 옹기 번호 0~5 → 물리값. @returns {object} 허용 키·범위만 남긴 복사본. 오류는 Error. */
  function validate(value={}) {
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('옹기 물리 설정은 객체여야 합니다.');
    const result={};
    for(const [id,profile]of Object.entries(value)) {
      if(!/^[0-5]$/.test(id)||!profile||typeof profile!=='object'||Array.isArray(profile))throw Error('옹기 번호/물리값 형식 오류');
      result[id]={};
      for(const [key,number]of Object.entries(profile)) {
        const range=limits[key];
        if(!Object.hasOwn(limits,key)||typeof number!=='number'||!Number.isFinite(number)||number<range[0]||number>range[1])throw Error('옹기 물리값 범위 오류: '+key);
        result[id][key]=number;
      }
    }
    return result;
  }

  /** @param id {number|string} 옹기 0~5. @param profiles {object|undefined} 지정하지 않으면 현재 편집/게임 설정.
   * @returns {object} 기본값과 옹기별 값을 합친 계산용 설정. 원본을 수정하지 않음. */
  function get(id,profiles) {
    if(profiles===undefined)profiles=StudioUI.settings.onggiPhysics||{};
    return {...defaults(),...(profiles[String(id)]||{})};
  }

  /** 매개변수 없음. @returns {object} 현재 선택한 옹기의 설정. */
  function current() {return get(selected);}

  /** @param profiles {object} 검증된 옹기별 설정. @returns {number} 여섯 옹기가 모두 출발할 수 있는지 검사할 최대 반지름. */
  function maxRadius(profiles={}) {return Math.max(...Array.from({length:6},(_,id)=>get(id,profiles).radius));}

  /** 매개변수 없음. @returns {void} 충돌·굴림 계산에서 공유하는 R을 현재 옹기 반지름으로 갱신. */
  function applySelected() {R=current().radius;}
  return {defaults,validate,get,current,maxRadius,applySelected,limits};
})();
