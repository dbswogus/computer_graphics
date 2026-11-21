/* 순수 데이터 읽기. HTML의 스크립트는 실행하지 않고 내장 프로젝트 JSON만 추출합니다. */
const GameDocument = (() => {
  /** @param text {string} 프로젝트 JSON 또는 이 편집기로 내보낸 게임 HTML.
   * @returns {object} 검증된 프로젝트. 일반 웹페이지/프로젝트가 없는 HTML은 거부합니다. */
  function extractProject(text) {
    if(typeof text!=='string'||text.length>100*1024*1024)throw Error('100MB 이하의 프로젝트/게임 HTML이 필요합니다.');
    const trimmed=text.trimStart();
    if(trimmed.startsWith('{'))return ProjectData.validate(JSON.parse(trimmed));
    const marker='<script type="application/json" id="onggi-project">';
    const begin=text.indexOf(marker),end=begin<0?-1:text.indexOf('</script>',begin+marker.length);
    if(begin<0||end<0)throw Error('이 편집기로 내보낸 게임 HTML만 불러올 수 있습니다.');
    return ProjectData.validate(JSON.parse(text.slice(begin+marker.length,end)));
  }
  return {extractProject};
})();
