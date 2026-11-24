// 담당: UI / 유리
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

let buttons = [];
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 62] notify
 * 역할: 일정 시간 표시할 안내 문구를 설정합니다.
 * @param t — string: 화면 안내 문구
 * @param d — number: 표시할 시간, 초 (생략 시 3)
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function notify(t, d = 3) {
  toast = t;
  toastTime = d;
  dirty = true;
}
const STAGE_MONOLOGUES = [[[UI_TEXT.STAGE_MONOLOGUES_01,
UI_TEXT.STAGE_MONOLOGUES_02],
[UI_TEXT.STAGE_MONOLOGUES_03,
UI_TEXT.STAGE_MONOLOGUES_04]],
[[UI_TEXT.STAGE_MONOLOGUES_05,
UI_TEXT.STAGE_MONOLOGUES_06],
[UI_TEXT.STAGE_MONOLOGUES_07,
UI_TEXT.STAGE_MONOLOGUES_08]],
[[UI_TEXT.STAGE_MONOLOGUES_09,
UI_TEXT.STAGE_MONOLOGUES_10],
[UI_TEXT.STAGE_MONOLOGUES_11,
UI_TEXT.STAGE_MONOLOGUES_12]]];
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 63] round
 * 역할: 둥근 사각형 경로를 만듭니다.
 * @param x — number: UI 왼쪽 기준 X, 논리 픽셀
 * @param y — number: UI 위쪽 기준 Y, 논리 픽셀
 * @param w — number: UI 사각형 전체 너비, 논리 픽셀
 * @param h — number: UI 사각형 전체 높이, 논리 픽셀
 * @param r — number: 모서리 반지름, UI 논리 픽셀 (생략 시 20)
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function round(x, y, w, h, r = 20) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 64] fillRound
 * 역할: 둥근 사각형을 색으로 채웁니다.
 * @param x — number: UI 왼쪽 기준 X, 논리 픽셀
 * @param y — number: UI 위쪽 기준 Y, 논리 픽셀
 * @param w — number: UI 사각형 전체 너비, 논리 픽셀
 * @param h — number: UI 사각형 전체 높이, 논리 픽셀
 * @param col — string: CSS/16진 색상
 * @param r — number: 모서리 반지름, UI 논리 픽셀 (생략 시 20)
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: round
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function fillRound(x, y, w, h, col, r = 20) {
  const edit=PageUI.resolve('shape',{x,y,width:w,height:h,background:col});if(edit.hidden)return;
  x=edit.x;y=edit.y;w=edit.width;h=edit.height;col=edit.background;
  ctx.fillStyle = col;
  round(x, y, w, h, r);
  ctx.fill();
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 65] text
 * 역할: 폰트·정렬·색을 지정해 글자를 그립니다.
 * @param str — string: 출력할 문구
 * @param x — number: UI 왼쪽 기준 X, 논리 픽셀
 * @param y — number: UI 위쪽 기준 Y, 논리 픽셀
 * @param size — number: 글자 크기, UI 논리 픽셀 (생략 시 24)
 * @param col — string: CSS/16진 색상 (생략 시 C.ink)
 * @param weight — number|string: CSS 글꼴 굵기 (생략 시 500)
 * @param align — string: 'left', 'center', 'right' 중 정렬 방식 (생략 시 'left')
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function text(str, x, y, size = 24, col = C.ink, weight = 500, align = 'left') {
  const edit=PageUI.resolve('text',{text:String(str),x,y,size,color:col,weight,align});if(edit.hidden)return;
  str=edit.text;x=edit.x;y=edit.y;size=edit.size;col=edit.color;weight=edit.weight;align=edit.align;
  ctx.fillStyle = col;
  ctx.font = `${weight} ${size * StudioUI.settings.fontScale}px ${GAME_CONFIG.ui.fontFamily}`;
PageUI.measureText(edit.id,Math.max(...String(str).split('\n').map(line=>ctx.measureText(line).width)),String(str).split('\n').length*size*StudioUI.settings.fontScale*1.3);
ctx.textAlign = align;
ctx.textBaseline = 'middle';
String(str).split('\n').forEach((line,index)=>ctx.fillText(line,x,y+index*size*StudioUI.settings.fontScale*1.3));
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 66] line
 * 역할: 두 점 사이에 선을 그립니다.
 * @param x1 — number: 시작점 UI X
 * @param y1 — number: 시작점 UI Y
 * @param x2 — number: 끝점 UI X
 * @param y2 — number: 끝점 UI Y
 * @param col — string: CSS/16진 색상 (생략 시 C.line)
 * @param width — number: 선 두께, UI 논리 픽셀 (생략 시 2)
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function line(x1, y1, x2, y2, col = C.line, width = 2) {
  ctx.strokeStyle = col;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 67] label
 * 역할: 작은 제목 레이블을 그립니다.
 * @param str — string: 표시 문구
 * @param x — number: UI 왼쪽 기준 X, 논리 픽셀
 * @param y — number: UI 위쪽 기준 Y, 논리 픽셀
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: text
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function label(str, x, y) {
  text(str, x, y, UI_LAYOUT.label.text_01.fontSize, C.green, 700);
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 68] btn
 * 역할: 버튼을 그리고 클릭 판정 영역에 등록합니다.
 * @param id — string: action(id)에서 구분할 명령 ID
 * @param x — number: UI 왼쪽 기준 X, 논리 픽셀
 * @param y — number: UI 위쪽 기준 Y, 논리 픽셀
 * @param w — number: UI 사각형 전체 너비, 논리 픽셀
 * @param h — number: UI 사각형 전체 높이, 논리 픽셀
 * @param str — string: 버튼 문구
 * @param primary — boolean: true이면 강조 버튼 색상 (생략 시 false)
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: fillRound → round → text
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function btn(id, x, y, w, h, str, primary = false) {
  const edit=PageUI.resolve('button',{id,x,y,width:w,height:h,text:str,color:primary?'#ffffff':C.ink,background:primary?C.green:C.paper});if(edit.hidden)return;
  id=edit.action;x=edit.x;y=edit.y;w=edit.width;h=edit.height;str=edit.text;PageUI.lock(1);
  fillRound(x, y, w, h, edit.background, UI_LAYOUT.btn.fillRound_01.radius);
  if(! primary) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    round(x, y, w, h, UI_LAYOUT.btn.round_01.radius);
    ctx.stroke();
  }
  text(str, x + w / 2, y + h / 2, edit.size || UI_LAYOUT.btn.text_01.fontSize, edit.color, 700, 'center');
  PageUI.lock(-1);
  buttons.push({
    id, x, y, w, h
  }
  );
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 69] leaf
 * 역할: 장식 잎을 그립니다.
 * @param x — number: UI 왼쪽 기준 X, 논리 픽셀
 * @param y — number: UI 위쪽 기준 Y, 논리 픽셀
 * @param s — number: 장식 크기 배율 (생략 시 1)
 * @param col — string: CSS/16진 색상 (생략 시 C.green)
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: translate → scale
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function leaf(x, y, s = 1, col = C.green) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.quadraticCurveTo(- 12, - 2, 1, - 31);
  ctx.quadraticCurveTo(25, - 20, 0, 22);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.quadraticCurveTo(20, 5, 34, 5);
  ctx.quadraticCurveTo(37, 28, 0, 20);
  ctx.fill();
  ctx.restore();
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 70] header
 * 역할: 공통 상단 제목을 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: leaf → text → line
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function header() {
  leaf(UI_LAYOUT.header.leaf_01.x, UI_LAYOUT.header.leaf_01.y, UI_LAYOUT.header.leaf_01.scale);
  text(UI_TEXT.header_01, UI_LAYOUT.header.text_01.x, UI_LAYOUT.header.text_01.y, UI_LAYOUT.header.text_01.fontSize, C.ink, 700);
  text('PLAYFUL MUSEUM', UI_LAYOUT.header.text_02.x, UI_LAYOUT.header.text_02.y, UI_LAYOUT.header.text_02.fontSize, C.muted, 600, 'right');
  line(UI_LAYOUT.header.line_01.x1, UI_LAYOUT.header.line_01.y1, UI_LAYOUT.header.line_01.x2, UI_LAYOUT.header.line_01.y2);
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 71] photoPlaceholder
 * 역할: 확인되지 않은 소장품 사진 영역을 표시합니다.
 * @param x — number: UI 왼쪽 기준 X, 논리 픽셀
 * @param y — number: UI 위쪽 기준 Y, 논리 픽셀
 * @param w — number: UI 사각형 전체 너비, 논리 픽셀
 * @param h — number: UI 사각형 전체 높이, 논리 픽셀
 * @param id — number: 옹기 인덱스. 해당 옹기의 사진 안내에 사용
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: fillRound → round → text
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function photoPlaceholder(x, y, w, h, id) {
  fillRound(x, y, w, h, '#eee7d8', UI_LAYOUT.photoPlaceholder.fillRound_01.radius);
  ctx.save();
  ctx.strokeStyle = '#d4c9b4';
  ctx.setLineDash([6, 7]);
  ctx.lineWidth = 2;
  round(x + 12, y + 12, w - 24, h - 24, UI_LAYOUT.photoPlaceholder.round_01.radius);
  ctx.stroke();
  ctx.restore();
  text(UI_TEXT.photoPlaceholder_01, x + w / 2, y + h - 25, UI_LAYOUT.photoPlaceholder.text_01.fontSize, C.muted, 500, 'center');
  text(` 소장품 ${ String.fromCharCode(65 + id)
}
`, x + w / 2, y + 30, UI_LAYOUT.photoPlaceholder.text_02.fontSize, C.muted, 700, 'center');
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 72] drawTitle
 * 역할: 시작 화면을 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: header → label → text → btn → fillRound → line
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawTitle() {
  header();
  label('A LITTLE JOURNEY HOME', UI_LAYOUT.drawTitle.label_01.x, UI_LAYOUT.drawTitle.label_01.y);
  text(UI_TEXT.drawTitle_01, UI_LAYOUT.drawTitle.text_01.x, UI_LAYOUT.drawTitle.text_01.y, UI_LAYOUT.drawTitle.text_01.fontSize, C.ink, 800);
  text(UI_TEXT.drawTitle_02, UI_LAYOUT.drawTitle.text_02.x, UI_LAYOUT.drawTitle.text_02.y, UI_LAYOUT.drawTitle.text_02.fontSize, C.green, 600);
  text(UI_TEXT.drawTitle_03, UI_LAYOUT.drawTitle.text_03.x, UI_LAYOUT.drawTitle.text_03.y, UI_LAYOUT.drawTitle.text_03.fontSize, C.ink);
  text(UI_TEXT.drawTitle_04, UI_LAYOUT.drawTitle.text_04.x, UI_LAYOUT.drawTitle.text_04.y, UI_LAYOUT.drawTitle.text_04.fontSize, C.ink);
  text(UI_TEXT.drawTitle_05, UI_LAYOUT.drawTitle.text_05.x, UI_LAYOUT.drawTitle.text_05.y, UI_LAYOUT.drawTitle.text_05.fontSize, C.muted);
  btn('select', UI_LAYOUT.drawTitle.btn_01.x, UI_LAYOUT.drawTitle.btn_01.y, UI_LAYOUT.drawTitle.btn_01.width, UI_LAYOUT.drawTitle.btn_01.height, UI_TEXT.drawTitle_06, true);
  fillRound(UI_LAYOUT.drawTitle.fillRound_01.x, UI_LAYOUT.drawTitle.fillRound_01.y, UI_LAYOUT.drawTitle.fillRound_01.width, UI_LAYOUT.drawTitle.fillRound_01.height, '#e7e9d6', UI_LAYOUT.drawTitle.fillRound_01.radius);
  ctx.fillStyle = '#cbd0b9';
  ctx.beginPath();
  ctx.ellipse(1165, 664, 146, 19, 0, 0, TAU);
  ctx.fill();
  text(UI_TEXT.drawTitle_07, UI_LAYOUT.drawTitle.text_06.x, UI_LAYOUT.drawTitle.text_06.y, UI_LAYOUT.drawTitle.text_06.fontSize, C.green, 600, 'center');
  line(UI_LAYOUT.drawTitle.line_01.x1, UI_LAYOUT.drawTitle.line_01.y1, UI_LAYOUT.drawTitle.line_01.x2, UI_LAYOUT.drawTitle.line_01.y2);
  text(UI_TEXT.drawTitle_08, UI_LAYOUT.drawTitle.text_07.x, UI_LAYOUT.drawTitle.text_07.y, UI_LAYOUT.drawTitle.text_07.fontSize, C.muted, 400, 'right');
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 73] drawSelect
 * 역할: 옹기 선택 화면을 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: header → label → text → fillRound → round → line → btn
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawSelect() {
  header();
  label('MEET YOUR ONGGI', UI_LAYOUT.drawSelect.label_01.x, UI_LAYOUT.drawSelect.label_01.y);
  text(UI_TEXT.drawSelect_01, UI_LAYOUT.drawSelect.text_01.x, UI_LAYOUT.drawSelect.text_01.y, UI_LAYOUT.drawSelect.text_01.fontSize, C.ink, 800);
  text(UI_TEXT.drawSelect_02, UI_LAYOUT.drawSelect.text_02.x, UI_LAYOUT.drawSelect.text_02.y, UI_LAYOUT.drawSelect.text_02.fontSize, C.muted);
  for(let i = 0; i < COLLECTION.length; i ++) {
    const x = 70 +(i % 3) * 300,
    y = 293 + Math.floor(i / 3) * 241,
    info = COLLECTION [i];
    fillRound(x, y, UI_LAYOUT.drawSelect.fillRound_01.width, UI_LAYOUT.drawSelect.fillRound_01.height, selected === i ? '#e8edda' : C.paper, UI_LAYOUT.drawSelect.fillRound_01.radius);
    ctx.strokeStyle = selected === i ? C.green : C.line;
    ctx.lineWidth = selected === i ? 4 : 2;
    round(x, y, UI_LAYOUT.drawSelect.round_01.width, UI_LAYOUT.drawSelect.round_01.height, UI_LAYOUT.drawSelect.round_01.radius);
    ctx.stroke();
    text(info.name, x + 139, y + 154, UI_LAYOUT.drawSelect.text_03.fontSize, C.ink, 700, 'center');
    text(info.shape, x + 139, y + 189, UI_LAYOUT.drawSelect.text_04.fontSize, C.muted, 500, 'center');
    if(selected === i) {
      fillRound(x + 16, y + 13, UI_LAYOUT.drawSelect.fillRound_02.width, UI_LAYOUT.drawSelect.fillRound_02.height, C.green, UI_LAYOUT.drawSelect.fillRound_02.radius);
      text(UI_TEXT.drawSelect_03, x + 46, y + 27, UI_LAYOUT.drawSelect.text_05.fontSize, '#fff', 700, 'center');
    }
    buttons.push({
      id : 'pot' + i, x, y, w : 278, h : 219
    }
    );
  }
  const item = COLLECTION [selected];
  fillRound(UI_LAYOUT.drawSelect.fillRound_03.x, UI_LAYOUT.drawSelect.fillRound_03.y, UI_LAYOUT.drawSelect.fillRound_03.width, UI_LAYOUT.drawSelect.fillRound_03.height, C.paper, UI_LAYOUT.drawSelect.fillRound_03.radius);
  label(UI_TEXT.drawSelect_04, UI_LAYOUT.drawSelect.label_02.x, UI_LAYOUT.drawSelect.label_02.y);
  text(item.name, UI_LAYOUT.drawSelect.text_06.x, UI_LAYOUT.drawSelect.text_06.y, UI_LAYOUT.drawSelect.text_06.fontSize, C.green, 800, 'center');
  text(item.shape, UI_LAYOUT.drawSelect.text_07.x, UI_LAYOUT.drawSelect.text_07.y, UI_LAYOUT.drawSelect.text_07.fontSize, C.muted, 600, 'center');
  line(UI_LAYOUT.drawSelect.line_01.x1, UI_LAYOUT.drawSelect.line_01.y1, UI_LAYOUT.drawSelect.line_01.x2, UI_LAYOUT.drawSelect.line_01.y2);
  item.lines.forEach((str, i) => text(str, UI_LAYOUT.drawSelect.text_08.x, 618 + i * 34, UI_LAYOUT.drawSelect.text_08.fontSize, C.ink));
  text(item.question, UI_LAYOUT.drawSelect.text_09.x, UI_LAYOUT.drawSelect.text_09.y, UI_LAYOUT.drawSelect.text_09.fontSize, C.green, 600);
  text(UI_TEXT.drawSelect_05, UI_LAYOUT.drawSelect.text_10.x, UI_LAYOUT.drawSelect.text_10.y, UI_LAYOUT.drawSelect.text_10.fontSize, C.green, 700);
  fillRound(UI_LAYOUT.drawSelect.fillRound_04.x, UI_LAYOUT.drawSelect.fillRound_04.y, UI_LAYOUT.drawSelect.fillRound_04.width, UI_LAYOUT.drawSelect.fillRound_04.height, '#e9eddf', UI_LAYOUT.drawSelect.fillRound_04.radius);
  text(UI_TEXT.drawSelect_06, UI_LAYOUT.drawSelect.text_11.x, UI_LAYOUT.drawSelect.text_11.y, UI_LAYOUT.drawSelect.text_11.fontSize, C.muted, 500, 'center');
  btn('title', UI_LAYOUT.drawSelect.btn_01.x, UI_LAYOUT.drawSelect.btn_01.y, UI_LAYOUT.drawSelect.btn_01.width, UI_LAYOUT.drawSelect.btn_01.height, UI_TEXT.drawSelect_07);
  btn('guide', UI_LAYOUT.drawSelect.btn_02.x, UI_LAYOUT.drawSelect.btn_02.y, UI_LAYOUT.drawSelect.btn_02.width, UI_LAYOUT.drawSelect.btn_02.height, item.name + UI_TEXT.drawSelect_08, true);
  text(UI_TEXT.drawSelect_09, UI_LAYOUT.drawSelect.text_12.x, UI_LAYOUT.drawSelect.text_12.y, UI_LAYOUT.drawSelect.text_12.fontSize, C.muted, 400, 'center');
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 74] drawGuide
 * 역할: 조작 방법 설명을 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: header → label → text → fillRound → btn
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawGuide() {
  header();
  label('HOW TO PLAY', UI_LAYOUT.drawGuide.label_01.x, UI_LAYOUT.drawGuide.label_01.y);
  text(UI_TEXT.drawGuide_01, UI_LAYOUT.drawGuide.text_01.x, UI_LAYOUT.drawGuide.text_01.y, UI_LAYOUT.drawGuide.text_01.fontSize, C.ink, 800);
  const cards = [['01',
  UI_TEXT.drawGuide_02,
  UI_TEXT.drawGuide_03],
  ['02',
  UI_TEXT.drawGuide_04,
  UI_TEXT.drawGuide_05],
  ['03',
  UI_TEXT.drawGuide_06,
  UI_TEXT.drawGuide_07]];
  cards.forEach((a, i) => {
    const y = 320 + i * 146; fillRound(UI_LAYOUT.drawGuide.fillRound_01.x, y, UI_LAYOUT.drawGuide.fillRound_01.width, UI_LAYOUT.drawGuide.fillRound_01.height, C.paper, UI_LAYOUT.drawGuide.fillRound_01.radius); text(a [0], UI_LAYOUT.drawGuide.text_02.x, y + 43, UI_LAYOUT.drawGuide.text_02.fontSize, C.orange, 800); text(a [1], UI_LAYOUT.drawGuide.text_03.x, y + 40, UI_LAYOUT.drawGuide.text_03.fontSize, C.ink, 700); text(a [2], UI_LAYOUT.drawGuide.text_04.x, y + 84, UI_LAYOUT.drawGuide.text_04.fontSize, C.muted);
  }
  );
  fillRound(UI_LAYOUT.drawGuide.fillRound_02.x, UI_LAYOUT.drawGuide.fillRound_02.y, UI_LAYOUT.drawGuide.fillRound_02.width, UI_LAYOUT.drawGuide.fillRound_02.height, '#e6ebd8', UI_LAYOUT.drawGuide.fillRound_02.radius);
  text(UI_TEXT.drawGuide_08, UI_LAYOUT.drawGuide.text_05.x, UI_LAYOUT.drawGuide.text_05.y, UI_LAYOUT.drawGuide.text_05.fontSize, C.orange, 800, 'center');
  text(UI_TEXT.drawGuide_09, UI_LAYOUT.drawGuide.text_06.x, UI_LAYOUT.drawGuide.text_06.y, UI_LAYOUT.drawGuide.text_06.fontSize, C.ink, 500, 'center');
  text(UI_TEXT.drawGuide_10, UI_LAYOUT.drawGuide.text_07.x, UI_LAYOUT.drawGuide.text_07.y, UI_LAYOUT.drawGuide.text_07.fontSize, C.ink, 500, 'center');
  text(UI_TEXT.drawGuide_11, UI_LAYOUT.drawGuide.text_08.x, UI_LAYOUT.drawGuide.text_08.y, UI_LAYOUT.drawGuide.text_08.fontSize, C.ink, 500, 'center');
  text(UI_TEXT.drawGuide_12, UI_LAYOUT.drawGuide.text_09.x, UI_LAYOUT.drawGuide.text_09.y, UI_LAYOUT.drawGuide.text_09.fontSize, C.green, 700, 'center');
  btn('select', UI_LAYOUT.drawGuide.btn_01.x, UI_LAYOUT.drawGuide.btn_01.y, UI_LAYOUT.drawGuide.btn_01.width, UI_LAYOUT.drawGuide.btn_01.height, UI_TEXT.drawGuide_13);
  btn('start', UI_LAYOUT.drawGuide.btn_02.x, UI_LAYOUT.drawGuide.btn_02.y, UI_LAYOUT.drawGuide.btn_02.width, UI_LAYOUT.drawGuide.btn_02.height, UI_TEXT.drawGuide_14, true);
}
const STORY = [{
  tag : UI_TEXT.STORY_01,
  title : UI_TEXT.STORY_02,
  lines : [UI_TEXT.STORY_03,
  UI_TEXT.STORY_04],
  quote : UI_TEXT.STORY_05
}
,
{
  tag : UI_TEXT.STORY_06,
  title : UI_TEXT.STORY_07,
  lines : [UI_TEXT.STORY_08,
  UI_TEXT.STORY_09],
  quote : UI_TEXT.STORY_10
}
,
{
  tag : UI_TEXT.STORY_11,
  title : UI_TEXT.STORY_12,
  lines : [UI_TEXT.STORY_13,
  UI_TEXT.STORY_14],
  quote : UI_TEXT.STORY_15
}
];
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 75] drawStory
 * 역할: 도입 이야기를 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: header → label → text → fillRound → btn
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawStory() {
  header();
  const item = STORY [storyIndex];
  label(` STORY ${ storyIndex + 1
}
 / 3  ·  ${ item.tag
}
`, UI_LAYOUT.drawStory.label_01.x, UI_LAYOUT.drawStory.label_01.y);
text(item.title, UI_LAYOUT.drawStory.text_01.x, UI_LAYOUT.drawStory.text_01.y, UI_LAYOUT.drawStory.text_01.fontSize, C.ink, 800);
item.lines.forEach((t, i) => text(t, UI_LAYOUT.drawStory.text_02.x, 393 + i * 49, UI_LAYOUT.drawStory.text_02.fontSize, C.muted));
fillRound(UI_LAYOUT.drawStory.fillRound_01.x, UI_LAYOUT.drawStory.fillRound_01.y, UI_LAYOUT.drawStory.fillRound_01.width, UI_LAYOUT.drawStory.fillRound_01.height, '#e6ebd8', UI_LAYOUT.drawStory.fillRound_01.radius);
text(item.quote, UI_LAYOUT.drawStory.text_03.x, UI_LAYOUT.drawStory.text_03.y, UI_LAYOUT.drawStory.text_03.fontSize, C.green, 700, 'center');
fillRound(UI_LAYOUT.drawStory.fillRound_02.x, UI_LAYOUT.drawStory.fillRound_02.y, UI_LAYOUT.drawStory.fillRound_02.width, UI_LAYOUT.drawStory.fillRound_02.height, '#e5e8d5', UI_LAYOUT.drawStory.fillRound_02.radius);
text(UI_TEXT.drawStory_01, UI_LAYOUT.drawStory.text_04.x, UI_LAYOUT.drawStory.text_04.y, UI_LAYOUT.drawStory.text_04.fontSize, C.muted, 500, 'center');
for(let i = 0; i < 3; i ++) {
  ctx.fillStyle = i === storyIndex ? C.green : '#ced6bf';
  ctx.beginPath();
  ctx.arc(1210 + i * 30, 790, 6, 0, TAU);
  ctx.fill();
}
text(UI_TEXT.drawStory_02, UI_LAYOUT.drawStory.text_05.x, UI_LAYOUT.drawStory.text_05.y, UI_LAYOUT.drawStory.text_05.fontSize, C.muted);
btn('story-next', UI_LAYOUT.drawStory.btn_01.x, UI_LAYOUT.drawStory.btn_01.y, UI_LAYOUT.drawStory.btn_01.width, UI_LAYOUT.drawStory.btn_01.height, storyIndex < 2 ? UI_TEXT.drawStory_03 : UI_TEXT.drawStory_04, true);
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 76] drawMonologue
 * 역할: 스테이지 시작 대사를 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: fillRound → round → text → dialogueLength → btn
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawMonologue() {
  fillRound(UI_LAYOUT.drawMonologue.fillRound_01.x, UI_LAYOUT.drawMonologue.fillRound_01.y, UI_LAYOUT.drawMonologue.fillRound_01.width, UI_LAYOUT.drawMonologue.fillRound_01.height, 'rgba(32,42,35,.95)', UI_LAYOUT.drawMonologue.fillRound_01.radius);
  ctx.strokeStyle = '#a4b398';
  ctx.lineWidth = 2;
  round(UI_LAYOUT.drawMonologue.round_01.x, UI_LAYOUT.drawMonologue.round_01.y, UI_LAYOUT.drawMonologue.round_01.width, UI_LAYOUT.drawMonologue.round_01.height, UI_LAYOUT.drawMonologue.round_01.radius);
  ctx.stroke();
  fillRound(UI_LAYOUT.drawMonologue.fillRound_02.x, UI_LAYOUT.drawMonologue.fillRound_02.y, UI_LAYOUT.drawMonologue.fillRound_02.width, UI_LAYOUT.drawMonologue.fillRound_02.height, '#394e3d', UI_LAYOUT.drawMonologue.fillRound_02.radius);
  ctx.fillStyle = '#253a2c';
  ctx.beginPath();
  ctx.ellipse(224, 875, 84, 13, 0, 0, TAU);
  ctx.fill();
  fillRound(UI_LAYOUT.drawMonologue.fillRound_03.x, UI_LAYOUT.drawMonologue.fillRound_03.y, UI_LAYOUT.drawMonologue.fillRound_03.width, UI_LAYOUT.drawMonologue.fillRound_03.height, '#f4efdb', UI_LAYOUT.drawMonologue.fillRound_03.radius);
  text(PageUI.speaker(stage,dialoguePage) + UI_TEXT.drawMonologue_01, UI_LAYOUT.drawMonologue.text_01.x, UI_LAYOUT.drawMonologue.text_01.y, UI_LAYOUT.drawMonologue.text_01.fontSize, C.ink, 700, 'center');
  text(STAGES [stage].name, UI_LAYOUT.drawMonologue.text_02.x, UI_LAYOUT.drawMonologue.text_02.y, UI_LAYOUT.drawMonologue.text_02.fontSize, '#bac9b0', 600);
  text((dialoguePage + 1) + ' / ' + STAGE_MONOLOGUES [stage].length, UI_LAYOUT.drawMonologue.text_03.x, UI_LAYOUT.drawMonologue.text_03.y, UI_LAYOUT.drawMonologue.text_03.fontSize, '#bac9b0', 500, 'right');
  let remaining = Math.floor(dialogueTime * GAME_CONFIG.ui.dialogueCharactersPerSecond + 1e-6);
  const lines = STAGE_MONOLOGUES [stage] [dialoguePage];
  for(let i = 0; i < lines.length; i ++) {
    const chars = Array.from(lines [i]);
    text(chars.slice(0, Math.max(0, remaining)).join(''), UI_LAYOUT.drawMonologue.text_04.x, 791 + i * 43, UI_LAYOUT.drawMonologue.text_04.fontSize, '#fff9e9', 500);
    remaining -= chars.length;
  }
  const ready = dialogueTime * GAME_CONFIG.ui.dialogueCharactersPerSecond + 1e-6 >= dialogueLength();
  text(ready ? UI_TEXT.drawMonologue_02 : UI_TEXT.drawMonologue_03, UI_LAYOUT.drawMonologue.text_05.x, UI_LAYOUT.drawMonologue.text_05.y, UI_LAYOUT.drawMonologue.text_05.fontSize, '#bac9b0');
  buttons.push({
    id : 'dialogue-next', x : 72, y : 677, w : 1456, h : 271
  }
  );
  btn('dialogue-next', UI_LAYOUT.drawMonologue.btn_01.x, UI_LAYOUT.drawMonologue.btn_01.y, UI_LAYOUT.drawMonologue.btn_01.width, UI_LAYOUT.drawMonologue.btn_01.height, ready ?(dialoguePage === STAGE_MONOLOGUES [stage].length - 1 ? UI_TEXT.drawMonologue_04 : UI_TEXT.drawMonologue_05) : UI_TEXT.drawMonologue_06, true);
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 77] drawMonologuePortrait
 * 역할: 대화 화면의 옹기 3D 초상을 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: ortho → pot → mul → translate → rx → ry
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawMonologuePortrait() {
  gl.disable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  vp = ortho(0, 16, 0, 10, - 30, 30);
  pot(mul(translate(2.24, 2.0, 0), mul(rx(.1), ry(- .18))), selected, 0, 1);
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 78] drawJoystick
 * 역할: 터치 조이스틱을 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: line → text
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawJoystick() {
  ctx.fillStyle = '#e9ecdf';
  ctx.beginPath();
  ctx.arc(stick.cx, stick.cy, GAME_CONFIG.ui.joystickOuterRadius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#a5b499';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(stick.cx, stick.cy, stick.r, 0, TAU);
  ctx.stroke();
  line(stick.cx - 65, stick.cy, stick.cx + 65, stick.cy, '#c6cfb9', UI_LAYOUT.drawJoystick.line_01.lineWidth);
  line(stick.cx, stick.cy - 65, stick.cx, stick.cy + 65, '#c6cfb9', UI_LAYOUT.drawJoystick.line_02.lineWidth);
  ctx.fillStyle = stick.id === null ? C.green : C.dark;
  ctx.beginPath();
  ctx.arc(stick.cx + stick.x * stick.r * GAME_CONFIG.ui.joystickKnobTravel, stick.cy + stick.y * stick.r * GAME_CONFIG.ui.joystickKnobTravel, GAME_CONFIG.ui.joystickKnobRadius, 0, TAU);
  ctx.fill();
  text(UI_TEXT.drawJoystick_01, stick.cx, UI_LAYOUT.drawJoystick.text_01.y, UI_LAYOUT.drawJoystick.text_01.fontSize, C.green, 700, 'center');
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 79] drawPlay
 * 역할: 스테이지·재도전·기울기 등 플레이 UI를 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: fillRound → text → drawJoystick → line → round
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawPlay() {
  const quiz = STAGES[stage]?.quiz;
  if (quiz) {
    fillRound(190, 104, 1220, 100, 18, C.paper);
    ctx.save();
    ctx.font = '700 30px sans-serif';
    const size = Math.min(30, 30 * 1160 / Math.max(1, ctx.measureText(quiz.question).width));
    ctx.restore();
    text(quiz.question, 800, 140, size, C.ink, 700, 'center');
    text('O 또는 X 방 중앙의 표시를 밟으세요', 800, 177, 22, C.green, 600, 'center');
  }
  for(let i = Math.max(0,Math.min(stage-1,STAGES.length-3)); i < Math.min(STAGES.length,Math.max(3,stage+2)); i ++) {
    const x = 1065 + (i-Math.max(0,Math.min(stage-1,STAGES.length-3))) * 120;
    fillRound(x, UI_LAYOUT.drawPlay.fillRound_01.y, UI_LAYOUT.drawPlay.fillRound_01.width, UI_LAYOUT.drawPlay.fillRound_01.height, i === stage ? C.green : '#e7e9dc', UI_LAYOUT.drawPlay.fillRound_01.radius);
    text((i < stage ? '✓ ' : '') + STAGES [i].name, x + 56, UI_LAYOUT.drawPlay.text_01.y, UI_LAYOUT.drawPlay.text_01.fontSize, i === stage ? '#fff' : C.muted, 700, 'center');
  }
  text(UI_TEXT.drawPlay_01 + failures + UI_TEXT.drawPlay_02 +(checkpoint.index >= 0 ? UI_TEXT.drawPlay_03 : UI_TEXT.drawPlay_04), UI_LAYOUT.drawPlay.text_02.x, UI_LAYOUT.drawPlay.text_02.y, UI_LAYOUT.drawPlay.text_02.fontSize, C.muted, 500, 'right');
  if(toastTime > 0) {
    fillRound(UI_LAYOUT.drawPlay.fillRound_02.x, UI_LAYOUT.drawPlay.fillRound_02.y, UI_LAYOUT.drawPlay.fillRound_02.width, UI_LAYOUT.drawPlay.fillRound_02.height, C.paper, UI_LAYOUT.drawPlay.fillRound_02.radius);
    text(toast, UI_LAYOUT.drawPlay.text_03.x, UI_LAYOUT.drawPlay.text_03.y, UI_LAYOUT.drawPlay.text_03.fontSize, falling ? C.orange : C.green, 700, 'center');
  }
  drawJoystick();
  ctx.strokeStyle = '#cbd5bd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(1340, 845, 61, 0, TAU);
  ctx.stroke();
  line(UI_LAYOUT.drawPlay.line_01.x1, UI_LAYOUT.drawPlay.line_01.y1, UI_LAYOUT.drawPlay.line_01.x2, UI_LAYOUT.drawPlay.line_01.y2, '#d5dcc8', UI_LAYOUT.drawPlay.line_01.lineWidth);
  line(UI_LAYOUT.drawPlay.line_02.x1, UI_LAYOUT.drawPlay.line_02.y1, UI_LAYOUT.drawPlay.line_02.x2, UI_LAYOUT.drawPlay.line_02.y2, '#d5dcc8', UI_LAYOUT.drawPlay.line_02.lineWidth);
  ctx.fillStyle = C.green;
  ctx.beginPath();
  ctx.arc(1340 - angle / STICK_LIMIT * 53, 845 + tiltZ / STICK_LIMIT * 53, 9, 0, TAU);
  ctx.fill();
  text(UI_TEXT.drawPlay_05 + Math.round(Math.hypot(angle, tiltZ) * 180 / Math.PI) + '°', UI_LAYOUT.drawPlay.text_04.x, UI_LAYOUT.drawPlay.text_04.y, UI_LAYOUT.drawPlay.text_04.fontSize, C.green, 700, 'center');
  if(done) {
    fillRound(UI_LAYOUT.drawPlay.fillRound_03.x, UI_LAYOUT.drawPlay.fillRound_03.y, UI_LAYOUT.drawPlay.fillRound_03.width, UI_LAYOUT.drawPlay.fillRound_03.height, C.paper, UI_LAYOUT.drawPlay.fillRound_03.radius);
    text(stage === STAGES.length - 1 ? UI_TEXT.drawPlay_06 : UI_TEXT.drawPlay_07, UI_LAYOUT.drawPlay.text_05.x, UI_LAYOUT.drawPlay.text_05.y, UI_LAYOUT.drawPlay.text_05.fontSize, C.green, 800, 'center');
    text(stage === STAGES.length - 1 ? UI_TEXT.drawPlay_08 : UI_TEXT.drawPlay_09, UI_LAYOUT.drawPlay.text_06.x, UI_LAYOUT.drawPlay.text_06.y, UI_LAYOUT.drawPlay.text_06.fontSize, C.muted, 500, 'center');
  }
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 80] drawArrival
 * 역할: 전시대 도착 안내를 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: fillRound → text
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawArrival() {
  fillRound(UI_LAYOUT.drawArrival.fillRound_01.x, UI_LAYOUT.drawArrival.fillRound_01.y, UI_LAYOUT.drawArrival.fillRound_01.width, UI_LAYOUT.drawArrival.fillRound_01.height, C.paper, UI_LAYOUT.drawArrival.fillRound_01.radius);
  text(COLLECTION [selected].name + UI_TEXT.drawArrival_01, UI_LAYOUT.drawArrival.text_01.x, UI_LAYOUT.drawArrival.text_01.y, UI_LAYOUT.drawArrival.text_01.fontSize, C.green, 800, 'center');
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 81] drawFinish
 * 역할: 게임 결과와 옹기 형태 설명을 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: header → label → text → fillRound → photoPlaceholder → line → btn
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawFinish() {
  const item = COLLECTION [selected],
  museum = item.museum;
  header();
  label('MY LITTLE EXHIBITION', UI_LAYOUT.drawFinish.label_01.x, UI_LAYOUT.drawFinish.label_01.y);
  text(UI_TEXT.drawFinish_01, UI_LAYOUT.drawFinish.text_01.x, UI_LAYOUT.drawFinish.text_01.y, UI_LAYOUT.drawFinish.text_01.fontSize, C.ink, 800);
  text(item.name + UI_TEXT.drawFinish_02, UI_LAYOUT.drawFinish.text_02.x, UI_LAYOUT.drawFinish.text_02.y, UI_LAYOUT.drawFinish.text_02.fontSize, C.muted);
  fillRound(UI_LAYOUT.drawFinish.fillRound_01.x, UI_LAYOUT.drawFinish.fillRound_01.y, UI_LAYOUT.drawFinish.fillRound_01.width, UI_LAYOUT.drawFinish.fillRound_01.height, '#e6ead8', UI_LAYOUT.drawFinish.fillRound_01.radius);
  ctx.fillStyle = '#c9cfb8';
  ctx.beginPath();
  ctx.ellipse(410, 678, 169, 23, 0, 0, TAU);
  ctx.fill();
  fillRound(UI_LAYOUT.drawFinish.fillRound_02.x, UI_LAYOUT.drawFinish.fillRound_02.y, UI_LAYOUT.drawFinish.fillRound_02.width, UI_LAYOUT.drawFinish.fillRound_02.height, C.paper, UI_LAYOUT.drawFinish.fillRound_02.radius);
  text(item.name + UI_TEXT.drawFinish_03, UI_LAYOUT.drawFinish.text_03.x, UI_LAYOUT.drawFinish.text_03.y, UI_LAYOUT.drawFinish.text_03.fontSize, C.green, 700, 'center');
  fillRound(UI_LAYOUT.drawFinish.fillRound_03.x, UI_LAYOUT.drawFinish.fillRound_03.y, UI_LAYOUT.drawFinish.fillRound_03.width, UI_LAYOUT.drawFinish.fillRound_03.height, C.paper, UI_LAYOUT.drawFinish.fillRound_03.radius);
  label(UI_TEXT.drawFinish_04, UI_LAYOUT.drawFinish.label_02.x, UI_LAYOUT.drawFinish.label_02.y);
  photoPlaceholder(UI_LAYOUT.drawFinish.photoPlaceholder_01.x, UI_LAYOUT.drawFinish.photoPlaceholder_01.y, UI_LAYOUT.drawFinish.photoPlaceholder_01.width, UI_LAYOUT.drawFinish.photoPlaceholder_01.height, selected);
  text(UI_TEXT.drawFinish_05, UI_LAYOUT.drawFinish.text_04.x, UI_LAYOUT.drawFinish.text_04.y, UI_LAYOUT.drawFinish.text_04.fontSize, C.muted, 600);
  text(museum.verified ? museum.officialName : UI_TEXT.drawFinish_06, UI_LAYOUT.drawFinish.text_05.x, UI_LAYOUT.drawFinish.text_05.y, UI_LAYOUT.drawFinish.text_05.fontSize, C.ink, 700);
  text(UI_TEXT.drawFinish_07, UI_LAYOUT.drawFinish.text_06.x, UI_LAYOUT.drawFinish.text_06.y, UI_LAYOUT.drawFinish.text_06.fontSize, C.muted, 600);
  text(museum.verified ? museum.use : UI_TEXT.drawFinish_08, UI_LAYOUT.drawFinish.text_07.x, UI_LAYOUT.drawFinish.text_07.y, UI_LAYOUT.drawFinish.text_07.fontSize, C.ink);
  text(UI_TEXT.drawFinish_09, UI_LAYOUT.drawFinish.text_08.x, UI_LAYOUT.drawFinish.text_08.y, UI_LAYOUT.drawFinish.text_08.fontSize, C.muted, 600);
  text(museum.verified ? museum.period : UI_TEXT.drawFinish_10, UI_LAYOUT.drawFinish.text_09.x, UI_LAYOUT.drawFinish.text_09.y, UI_LAYOUT.drawFinish.text_09.fontSize, C.ink);
  line(UI_LAYOUT.drawFinish.line_01.x1, UI_LAYOUT.drawFinish.line_01.y1, UI_LAYOUT.drawFinish.line_01.x2, UI_LAYOUT.drawFinish.line_01.y2);
  text(UI_TEXT.drawFinish_11, UI_LAYOUT.drawFinish.text_10.x, UI_LAYOUT.drawFinish.text_10.y, UI_LAYOUT.drawFinish.text_10.fontSize, C.green, 700);
  item.lines.forEach((str, i) => text(str, UI_LAYOUT.drawFinish.text_11.x, 669 + i * 33, UI_LAYOUT.drawFinish.text_11.fontSize, C.ink));
  text(UI_TEXT.drawFinish_12, UI_LAYOUT.drawFinish.text_12.x, UI_LAYOUT.drawFinish.text_12.y, UI_LAYOUT.drawFinish.text_12.fontSize, C.muted);
  btn('select', UI_LAYOUT.drawFinish.btn_01.x, UI_LAYOUT.drawFinish.btn_01.y, UI_LAYOUT.drawFinish.btn_01.width, UI_LAYOUT.drawFinish.btn_01.height, UI_TEXT.drawFinish_13, true);
  btn('replay', UI_LAYOUT.drawFinish.btn_02.x, UI_LAYOUT.drawFinish.btn_02.y, UI_LAYOUT.drawFinish.btn_02.width, UI_LAYOUT.drawFinish.btn_02.height, UI_TEXT.drawFinish_14);
  text(UI_TEXT.drawFinish_15, UI_LAYOUT.drawFinish.text_13.x, UI_LAYOUT.drawFinish.text_13.y, UI_LAYOUT.drawFinish.text_13.fontSize, C.muted, 400, 'right');
}
function drawSaveLabels() {
  const st = STAGES[stage];
  if (!st.editorStage) return;
  const m = mul(vp,mul(rz(angle),rx(tiltZ)));
  for (const [i,marker] of st.checkpointBlocks.entries()) {
    const saved = st.checks[i] <= checkpoint.index;
    const {x,z} = marker;
    if (falling || Math.hypot(px-x,pz-z)>1.65) continue;
    const y = .1;
    const sx = (m[0]*x+m[4]*y+m[8]*z+m[12])*.5*W+W/2;
    const sy = H/2-(m[1]*x+m[5]*y+m[9]*z+m[13])*.5*H;
    const width = saved ? 76 : 60;
    fillRound(sx-width/2,sy-54,width,27,saved?'#22775e':'#215e65',5);
    text(saved?'저장됨':'저장',sx,sy-40,18,'#fff8e9',700,'center');
  }
}

/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 82] drawHomeLabel
 * 역할: 마지막 목표 위치 위에 이름표를 그립니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: mul → rz → rx → fillRound → text → line
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawHomeLabel() {
  if(stage !== STAGES.length - 1 || STAGES[stage].quiz) return;
  const goal = STAGES [stage].route.at(- 1),
  m = mul(vp, mul(rz(angle), rx(tiltZ))),
  x = goal [0] + .55,
  y = 1.9,
  z = goal [1] + .7,
  sx =(m [0] * x + m [4] * y + m [8] * z + m [12]) * .5 * W + W / 2,
  sy = H / 2 -(m [1] * x + m [5] * y + m [9] * z + m [13]) * .5 * H;
  fillRound(sx - 107, sy - 75, UI_LAYOUT.drawHomeLabel.fillRound_01.width, UI_LAYOUT.drawHomeLabel.fillRound_01.height, C.paper, UI_LAYOUT.drawHomeLabel.fillRound_01.radius);
  text(COLLECTION [selected].name + UI_TEXT.drawHomeLabel_01, sx, sy - 51, UI_LAYOUT.drawHomeLabel.text_01.fontSize, C.green, 700, 'center');
  line(sx, sy - 24, sx, sy - 7, '#789068', UI_LAYOUT.drawHomeLabel.line_01.lineWidth);
}
/**
 * [읽기 10: 화면·UI 출력 / 함수 번호 83] drawUI
 * 역할: 현재 화면의 UI를 그리고 WebGL 텍스처를 갱신합니다.
 * 매개변수: 없음. 필요한 데이터는 본문에 표시된 상수·공유 상태에서 읽습니다.
 * @returns void: 반환값 없음
 * 사용: 반환값 대신 공유 상태·GPU·캔버스·입력 목록 중 본문에 표시된 대상을 갱신합니다.
 * 다음에 읽을 함수: drawTitle → drawSelect → drawGuide → drawStory → drawMonologue → drawPlay → drawHomeLabel → drawArrival → drawFinish → fillRound → text
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function drawUI(preview = false) {
  ctx.clearRect(0, 0, W, H);
  buttons = [];
  PageUI.begin(preview);
  if(screen === 'title') drawTitle();
  if(screen === 'select') drawSelect();
  if(screen === 'guide') drawGuide();
  if(screen === 'story') drawStory();
  if(screen === 'monologue') drawMonologue();
  if(screen === 'play') {
    PageUI.lock(1);
    drawSaveLabels();
    PageUI.lock(-1);
    drawPlay();
    drawHomeLabel();
  }
  if(screen === 'arrival') drawArrival();
  if(screen === 'finish') drawFinish();
  if(portrait) {
    fillRound(UI_LAYOUT.drawUI.fillRound_01.x, UI_LAYOUT.drawUI.fillRound_01.y, UI_LAYOUT.drawUI.fillRound_01.width, UI_LAYOUT.drawUI.fillRound_01.height, C.paper, UI_LAYOUT.drawUI.fillRound_01.radius);
    text(UI_TEXT.drawUI_01, UI_LAYOUT.drawUI.text_01.x, UI_LAYOUT.drawUI.text_01.y, UI_LAYOUT.drawUI.text_01.fontSize, C.green, 800, 'center');
    text(UI_TEXT.drawUI_02, UI_LAYOUT.drawUI.text_02.x, UI_LAYOUT.drawUI.text_02.y, UI_LAYOUT.drawUI.text_02.fontSize, C.muted, 500, 'center');
    buttons = [];
  }
  PageUI.finish();
  AssetBank.drawOverlay(ctx);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ui);
  dirty = false;
}

/** 매개변수 없음. @returns {void} 수정된 UI_TEXT를 도입 이야기/스테이지 대사 배열에도 즉시 반영합니다. */
function refreshNarrativeText(){STAGE_MONOLOGUES.splice(0,STAGE_MONOLOGUES.length,...[[[UI_TEXT.STAGE_MONOLOGUES_01,
UI_TEXT.STAGE_MONOLOGUES_02],
[UI_TEXT.STAGE_MONOLOGUES_03,
UI_TEXT.STAGE_MONOLOGUES_04]],
[[UI_TEXT.STAGE_MONOLOGUES_05,
UI_TEXT.STAGE_MONOLOGUES_06],
[UI_TEXT.STAGE_MONOLOGUES_07,
UI_TEXT.STAGE_MONOLOGUES_08]],
[[UI_TEXT.STAGE_MONOLOGUES_09,
UI_TEXT.STAGE_MONOLOGUES_10],
[UI_TEXT.STAGE_MONOLOGUES_11,
UI_TEXT.STAGE_MONOLOGUES_12]]]);STORY.splice(0,STORY.length,...[{
  tag : UI_TEXT.STORY_01,
  title : UI_TEXT.STORY_02,
  lines : [UI_TEXT.STORY_03,
  UI_TEXT.STORY_04],
  quote : UI_TEXT.STORY_05
}
,
{
  tag : UI_TEXT.STORY_06,
  title : UI_TEXT.STORY_07,
  lines : [UI_TEXT.STORY_08,
  UI_TEXT.STORY_09],
  quote : UI_TEXT.STORY_10
}
,
{
  tag : UI_TEXT.STORY_11,
  title : UI_TEXT.STORY_12,
  lines : [UI_TEXT.STORY_13,
  UI_TEXT.STORY_14],
  quote : UI_TEXT.STORY_15
}
]);}
