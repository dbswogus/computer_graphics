/* 담당: UI / 유리. 기존 UI의 실제 그리기/버튼 판정에 페이지별 편집값 적용.
 * 읽기: begin → resolve → finish → enterStage/action. */
const PageUI = (() => {
  const mapping={title:'drawTitle',select:'drawSelect',guide:'drawGuide',play:'drawPlay',finish:'drawFinish',story:'drawStory',monologue:'drawMonologue'};
  let pageId='',items=[],counts={},locked=0,previewId='',introIndex=-1;
  const design=()=>StudioUI.settings.pageDesign||{pages:{},extraPages:[],dialogues:{}};
  /** @param id {string} 페이지 ID. @returns {object} 해당 페이지 설정 또는 빈 기본 설정. */
  function page(id=pageId){return design().pages?.[id]||design().extraPages?.find(p=>p.id===id)||{};}
  /** 매개변수 없음. @returns {void} 이번 프레임의 요소 목록/순서 초기화 및 배경색 적용. */
  function begin(){pageId=previewId||(screen==='custom-ui'?design().extraPages?.[introIndex]?.id:mapping[screen])||'';items=[];counts={};locked=0;const p=page();if(p.background){ctx.fillStyle=p.background;ctx.fillRect(0,0,1600,1000);}}
  /** @param type {string} text/button/shape. @param raw {object} 원래 출력값.
   * @returns {object} 수정값을 적용한 좌표·문구·색. 버튼 내부 장식은 독립 요소로 등록하지 않음. */
  function resolve(type,raw){
    if(locked||!pageId)return raw;
    const id=type==='button'?'button:'+raw.id:type+':'+(counts[type]=(counts[type]||0)+1);
    const p=page(),change=p.elements?.[id]||{},item={...raw,...change,id,type};
    if(type==='text'){item.color=change.color||p.textColor||raw.color;item.width=Math.max(20,...String(item.text).split('\n').map(t=>t.length*(item.size||24)*.62));item.height=String(item.text).split('\n').length*(item.size||24)*1.3;}
    if(type==='button'){if(raw.id==='page-next')item.hidden=false;item.action=change.action||raw.id;item.color=change.color||p.textColor||raw.color;item.background=change.background||raw.background;const target={select:'drawSelect',guide:'drawGuide'}[raw.id];if(target&&page(target).enabled===false)item.hidden=true;}
    items.push(item);return item;
  }
  /** @param id {string} 요소 ID. @param width {number} 실제 글꼴 측정 폭. @param height {number} 실제 줄 높이.
   * @returns {void} 클릭 판정을 실제 출력한 글자 크기로 보정. */
  function measureText(id,width,height){const e=items.find(e=>e.id===id);if(e){e.width=Math.max(12,width);e.height=Math.max(12,height);}}
  /** @param value {number} +1 또는 -1. @returns {void} 복합 요소 내부의 중복 등록 방지. */
  function lock(value){locked=Math.max(0,locked+value);}
  /** 매개변수 없음. @returns {void} 사용자 추가 요소 표시. 새 버튼의 표시와 클릭 영역을 함께 등록. */
  function finish(){
    for(const e of page().extras||[]){if(e.hidden)continue;const item={x:100,y:200,width:300,height:70,size:30,color:'#294732',background:'#dfe8d8',align:'left',...e};items.push({...item,id:'extra:'+e.id});lock(1);
      if(e.type==='text')text(item.text||'텍스트',item.x,item.y,item.size,item.color,500,item.align);
      if(e.type==='shape')fillRound(item.x,item.y,item.width,item.height,item.background,12);
      if(e.type==='button'){fillRound(item.x,item.y,item.width,item.height,item.background,12);text(item.text||'버튼',item.x+item.width/2,item.y+item.height/2,item.size,item.color,700,'center');buttons.push({id:item.action==='page-next'?'page-next':item.action||'title',x:item.x,y:item.y,w:item.width,h:item.height});}
      lock(-1);
    }
    if((design().extraPages||[]).some(p=>p.id===pageId)&&!(page().extras||[]).some(e=>e.type==='button'&&e.action==='page-next'&&!e.hidden))btn('page-next',1280,880,240,65,'다음',true);
  }
  /** @param x {number} 논리 X. @param y {number} 논리 Y. @returns {object|null} 실제 경계 안의 맨 위 요소. */
  function hit(x,y){const inside=e=>{let left=e.x,top=e.y;if(e.type==='text'){left-=e.align==='center'?e.width/2:e.align==='right'?e.width:0;top-=(e.size||24)*.65;}return !e.hidden&&x>=left&&x<=left+e.width&&y>=top&&y<=top+e.height;};return [...items].reverse().filter(e=>e.type!=='shape').find(inside)||[...items].reverse().find(inside)||null;}
  /** @param settings {object} 페이지 설정. @returns {void} 추가/삭제한 독백을 런타임 대사 배열에 반영. */
  function syncNarrative(settings){for(let i=0;i<20;i++){if(!STAGE_MONOLOGUES[i])STAGE_MONOLOGUES[i]=[['']];const list=settings?.dialogues?.[i];if(list!==undefined)STAGE_MONOLOGUES[i]=list.map(p=>p.text.split('\n'));}}
  /** @param index {number} 맵 번호. @param n {number} 독백 페이지 번호. @returns {string} 입력한 화자 이름. */
  function speaker(index,n){return design().dialogues?.[index]?.[n]?.speaker||COLLECTION[selected].name;}
  /** @param first {boolean} 캠페인 첫 맵 여부. @returns {void} 추가 소개 페이지 → 맵별 독백 → 플레이 순으로 전환. */
  function enterStage(first){const extras=(design().extraPages||[]);introIndex=first?extras.findIndex(p=>p.enabled!==false):-1;if(introIndex>=0)screen='custom-ui';else beginDialogue();dirty=true;}
  /** 매개변수 없음. @returns {void} 명시적으로 편집한 독백이 있으면 표시하고 없으면 바로 플레이. */
  function beginDialogue(){const list=design().dialogues?.[stage];screen=list?.length&&page('drawMonologue').enabled!==false?'monologue':'play';dialoguePage=0;dialogueTime=0;}
  /** @param id {string} UI 버튼 명령. @returns {boolean} 추가 페이지 넘기기를 처리했으면 true. */
  function action(id){if(id!=='page-next')return false;const extras=design().extraPages||[];introIndex=extras.findIndex((p,i)=>i>introIndex&&p.enabled!==false);if(introIndex<0)beginDialogue();dirty=true;return true;}
  /** @param id {string} 미리보기 페이지. @returns {void} 화면 상태를 바꾸지 않고 사용할 페이지 지정. */
  function setPreview(id){previewId=id||'';}
  return {begin,resolve,measureText,lock,finish,hit,page,syncNarrative,speaker,enterStage,action,setPreview,get elements(){return items.map(e=>({...e}));}};
})();
