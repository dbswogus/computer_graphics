// 담당: UI·맵 협의
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

const COLLECTION = [{
  name : '동글옹기',
  shape : '둥근 배 · 좁은 어깨',
  lidY : .62,
  lidSize : 1,
  lines : ['배가 둥글고 어깨가 부드럽게 좁아져요.',
  '뚜껑에서 몸통으로 이어지는 곡선을 보세요.'],
  question : '어느 부분이 가장 동그랗게 보이나요?'
}
,
{
  name : '길쭉옹기',
  shape : '높은 몸통 · 작은 입구',
  lidY : .68,
  lidSize : .78,
  lines : ['몸통이 위아래로 길게 뻗어 있어요.',
  '높이와 너비를 다른 친구와 비교해 보세요.'],
  question : '동글옹기와 어떤 점이 다른가요?'
}
,
{
  name : '납작옹기',
  shape : '낮은 키 · 넓은 몸통',
  lidY : .49,
  lidSize : 1.25,
  lines : ['키는 낮고 몸통은 옆으로 넓은 모양이에요.',
  '가장 넓은 부분과 입구를 비교해 보세요.'],
  question : '넓은 몸통 위에 뚜껑이 어떻게 놓였나요?'
}
,
{
  name : '꼬마옹기',
  shape : '아담한 몸통 · 짧은 목',
  lidY : .44,
  lidSize : .97,
  lines : ['아담한 몸통 위에 짧은 목이 이어져요.',
  '몸통과 뚜껑의 크기를 살펴보세요.'],
  question : '작은 옹기에게 별명을 붙여 줄까요?'
}
,
{
  name : '목긴옹기',
  shape : '긴 목 · 둥근 어깨',
  lidY : .86,
  lidSize : .60,
  lines : ['둥근 어깨 위로 가느다란 목이 길게 올라와요.',
  '뚜껑 아래로 이어지는 긴 목을 찾아보세요.'],
  question : '어깨와 목은 어디에서 나뉘나요?'
}
,
{
  name : '반듯옹기',
  shape : '곧은 옆면 · 넓은 입구',
  lidY : .56,
  lidSize : 1.35,
  lines : ['옆면이 반듯하고 입구가 넓은 모양이에요.',
  '둥근 친구들과 몸통의 선을 비교해 보세요.'],
  question : '옆모습을 선으로 그리면 어떤 모양일까요?'
}
];
COLLECTION.forEach((item, index) => {
  item.bottom = index === 2 ? .51 : .62; item.museum = {
    verified : false, officialName : null, use : null, period : null, photoPath : null, source : null, license : null
  }
  ;
}
);
/**
 * [읽기 3: 옹기 데이터 / 함수 번호 22] getOnggiData
 * 역할: 인덱스에 해당하는 옹기의 이름·형태·소장품 정보를 반환합니다.
 * @param index — number: 0 이상 COLLECTION.length 미만의 정수. 범위 밖은 undefined
 * @returns object|undefined: 원본 옹기 정보 객체 참조
 * 사용: 객체 참조를 반환합니다. 반환 객체를 수정하면 원본 데이터도 바뀝니다.
 * 다음에 읽을 함수: 이 함수 본문으로 완료. 호출부에서 다음 처리를 진행합니다.
 * 주의: 위 목록은 본문에서 참조하는 함수 순서이며 조건문에 따라 일부는 호출되지 않습니다.
 */
function getOnggiData(index) {
  return COLLECTION [index];
}
