/* 담당: UI / 유리. 페이지 설정 데이터 검증. DOM·WebGL 의존 없음. */
const UIPageData = (() => {
  const screens={drawTitle:'시작',drawSelect:'옹기 선택',drawGuide:'설명',drawPlay:'게임 중',drawFinish:'결과',drawStory:'도입 이야기',drawMonologue:'캐릭터 독백'};
  /** @param value {object} 페이지 설정. @returns {object} 허용 값만 복사. 불량 입력은 오류로 중단. */
  function validate(value={}) {
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('페이지 설정 오류');
    const result={pages:{},extraPages:[],dialogues:{}};
    const color=v=>{if(typeof v!=='string'||!/^#[0-9a-fA-F]{6}$/.test(v))throw Error('색상은 #RRGGBB 형식입니다.');return v;};
    const word=(v,max=500)=>{if(typeof v!=='string'||v.length>max)throw Error('문구 길이 오류');return v;};
    const number=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('UI 숫자 범위 오류');return v;};
    const element=(raw,extra)=>{
      if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('요소 설정 오류');
      const e={};
      for(const k of ['x','y'])if(raw[k]!==undefined)e[k]=number(raw[k],-4000,4000);
      for(const k of ['width','height'])if(raw[k]!==undefined)e[k]=number(raw[k],1,3200);
      if(raw.size!==undefined)e.size=number(raw.size,8,160);
      for(const k of ['color','background'])if(raw[k]!==undefined)e[k]=color(raw[k]);
      if(raw.text!==undefined)e.text=word(raw.text);
      if(raw.hidden!==undefined){if(typeof raw.hidden!=='boolean')throw Error('표시 여부 오류');e.hidden=raw.hidden;}
      if(raw.align!==undefined){if(!['left','center','right'].includes(raw.align))throw Error('정렬 오류');e.align=raw.align;}
      if(raw.action!==undefined){if(!['title','select','guide','start','replay','page-next'].includes(raw.action))throw Error('버튼 동작 오류');e.action=raw.action;}
      if(extra){if(!/^[\w-]{1,80}$/.test(raw.id)||!['text','button','shape'].includes(raw.type))throw Error('추가 요소 종류/ID 오류');e.id=raw.id;e.type=raw.type;}
      return e;
    };
    const page=raw=>{
      if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('페이지 오류');
      const p={elements:{},extras:[],enabled:raw.enabled!==false};
      if(raw.name!==undefined)p.name=word(raw.name,60);
      for(const k of ['background','textColor'])if(raw[k]!==undefined)p[k]=color(raw[k]);
      if(Object.keys(raw.elements||{}).length>300)throw Error('페이지 요소는 300개까지입니다.');
      for(const [id,e]of Object.entries(raw.elements||{})){if(!/^[\w:-]{1,100}$/.test(id))throw Error('요소 ID 오류');p.elements[id]=element(e,false);}
      if(!Array.isArray(raw.extras||[])||(raw.extras||[]).length>100)throw Error('추가 요소는 100개까지입니다.');
      const ids=new Set();for(const e of raw.extras||[]){const item=element(e,true);if(ids.has(item.id))throw Error('요소 ID 중복');ids.add(item.id);p.extras.push(item);}
      return p;
    };
    for(const [id,raw]of Object.entries(value.pages||{})){if(!Object.hasOwn(screens,id))throw Error('알 수 없는 기본 페이지');result.pages[id]=page(raw);}
    if(!Array.isArray(value.extraPages||[])||(value.extraPages||[]).length>20)throw Error('추가 페이지는 20개까지입니다.');
    const ids=new Set();for(const raw of value.extraPages||[]){if(!/^[\w-]{1,80}$/.test(raw.id)||ids.has(raw.id))throw Error('페이지 ID 오류');ids.add(raw.id);result.extraPages.push({...page(raw),id:raw.id});}
    for(const [id,list]of Object.entries(value.dialogues||{})){
      if(!/^(?:[0-9]|1[0-9])$/.test(id)||!Array.isArray(list)||list.length>30)throw Error('독백은 맵별 30페이지까지입니다.');
      result.dialogues[id]=list.map(item=>({speaker:word(item.speaker||'',60),text:word(item.text||'',1000)}));
    }
    return result;
  }
  return {screens,validate};
})();
