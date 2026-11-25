// 담당: UI·맵 협의
// 오프라인 classic script. 의존 순서는 index.html 및 README.md 참고.
// 수정 안내와 전체 읽기 순서: CUSTOMIZATION.md

const COLLECTION = [{
  name : '태양문 항아리',
  shape : '높은 어깨 · 해 무늬',
  lidY : .62,
  lidSize : 1,
  lines : ['어깨는 둥글고 아래는 좁아져요.',
  '빙글빙글 해 무늬를 찾아보세요.'],
  question : '해 무늬는 몇 개나 보이나요?'
}
,
{
  name : '소줏고리',
  shape : '잘록한 허리 · 긴 대롱',
  lidY : .68,
  lidSize : .78,
  lines : ['항아리 두 개를 이은 모양이에요.',
  '허리에 긴 대롱이 달려 있어요.'],
  question : '대롱은 어느 쪽을 향하나요?'
}
,
{
  name : '시루',
  shape : '넓은 입구 · 귀 손잡이',
  lidY : .49,
  lidSize : 1.25,
  lines : ['입구가 넓고 귀 손잡이가 있어요.',
  '바닥 구멍으로 김이 올라와요.'],
  question : '손잡이는 모두 몇 개일까요?'
}
,
{
  name : '약탕기',
  shape : '통통한 몸통 · 긴 손잡이',
  lidY : .44,
  lidSize : .97,
  lines : ['작은 몸통에 손잡이가 솟았어요.',
  '낮고 통통한 모습을 살펴보세요.'],
  question : '손잡이는 어디에 달려 있나요?'
}
,
{
  name : '주병',
  shape : '둥근 몸통 · 좁은 목',
  lidY : .86,
  lidSize : .60,
  lines : ['몸통은 둥글고 목은 아주 좁아요.',
  '잘록한 목이 손잡이도 되었어요.'],
  question : '입구가 좁으면 무엇이 좋을까요?'
}
,
{
  name : '죽절단지',
  shape : '대나무 마디 · 반듯한 옆면',
  lidY : .56,
  lidSize : 1.35,
  lines : ['대나무 마디 같은 홈이 있어요.',
  '반듯한 가로줄을 세어 보세요.'],
  question : '가로 마디는 몇 개일까요?'
}
];
// 부천시립박물관 소장품 정보. 명칭·시대·크기·쓰임은 소장품 페이지에서 확인했고(2026-11-25), 설명은 새로 썼습니다.
// 사진은 박물관 저작물입니다. 비영리 용도로 출처와 함께 사용하고, 영리 이용은 박물관의 승낙이 필요합니다.
const MUSEUM_ITEMS = [
  { page : 1068, officialName : '태양문 항아리', period : '일제강점기', size : '74×62cm', use : '해 무늬로 장식한 항아리',
    story : ['옹기에는 띠, 도장, 글자, 손그림 등 여러 무늬를 새겼어요.', '이 항아리에는 커다란 해 무늬가 시원하게 그려져 있어요.'] },
  { page : 1073, officialName : '소줏고리', period : '조선', size : '30×49cm', use : '소주를 내리는 증류기',
    story : ['끓인 술의 김이 차가운 윗그릇에 닿아 이슬처럼 맺히면', '허리 안쪽 턱에 고여 대롱으로 소주가 흘러나와요.'] },
  { page : 1107, officialName : '시루', period : '일제강점기', size : '70×66×35cm', use : '떡이나 쌀을 찌는 찜기',
    story : ['바닥에 구멍이 여러 개 있어 물솥 위에 올려 불을 때면', '뜨거운 김이 올라와 안에 담긴 음식이 익어요.'] },
  { page : 1067, officialName : '약탕기', period : '조선', size : '10.5×14cm', use : '약물을 담는 탕기',
    story : ['약을 달이고 담을 때 쓰던 그릇이에요.', '옛사람들은 돌이나 철그릇에 약을 달이는 것을 꺼렸대요.'] },
  { page : 1061, officialName : '주병', period : '조선', size : '30×30×35cm', use : '술이나 물을 담던 병',
    story : ['술이나 물을 담던 병으로 주호라고도 불러요.', '입술 모양 덕분에 따른 뒤 흘러내리는 것을 막아 줘요.'] },
  { page : 1109, officialName : '죽절단지', period : '일제강점기', size : '16×19cm', use : '주로 약을 담던 병',
    story : ['대나무 마디처럼 홈이 파여 죽절이라는 이름이 붙었어요.', '크기가 작아 주로 약병으로 사용했어요.'] }
];
COLLECTION.forEach((item, index) => {
  item.bottom = index === 2 ? .51 : .62;
// bottom은 OBJ를 지정하지 않은 기본 모델용입니다. OBJ는 AssetBank가 실제 높이를 잽니다.
  item.museum = { ... MUSEUM_ITEMS [index], verified : true, photoAssetId : 'museum-' + MUSEUM_ITEMS [index].page, source : '부천시립박물관' };
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
