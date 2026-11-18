/* 폴더형 배포용 순수 함수. 코드·설정·에셋을 별도 파일로 만들고 무압축 ZIP으로 묶습니다.
 * 외부 라이브러리/서버 없이 브라우저에서 실행합니다. */
const FolderExport = (() => {
  /** @param text {string} UTF-8로 저장할 문자열. @returns {Uint8Array} 파일 바이트. */
  function encode(text) {return new TextEncoder().encode(text);}

  /** @param text {string} 검증된 Data URL. @returns {Uint8Array} 원본 에셋 바이트. */
  function decodeAsset(text) {
    const comma=text.indexOf(',');
    if(comma<0||!text.slice(0,comma).endsWith(';base64'))throw Error('에셋 인코딩 오류');
    return Uint8Array.from(atob(text.slice(comma+1)),c=>c.charCodeAt(0));
  }

  /** @param template {object} 빌드한 {files} 텍스트 파일 모음. @param project {object} 검증된 프로젝트.
   * @returns {object} 상대 경로 → Uint8Array. index에는 코드/프로젝트/에셋을 직접 넣지 않음. */
  function createFiles(template,project) {
    const files=Object.create(null),metadata=JSON.parse(JSON.stringify(project)),scripts=[];
    for(const [file,text]of Object.entries(template.files))files[file]=encode(text);
    metadata.assets=project.assets.map(asset=>{
      if(!/^[\w-]{1,80}$/.test(asset.id))throw Error('에셋 ID 오류');
      const extension=asset.name.split('.').pop().toLowerCase();
      if(!/^(png|jpe?g|webp|gif|ttf|otf|woff2?|mp3|wav|ogg|obj)$/.test(extension))throw Error('지원하지 않는 에셋');
      const group={image:'images',font:'fonts',audio:'sounds',model:'models'}[asset.kind];
      if(!group)throw Error('에셋 종류 오류');
      const file='assets/'+group+'/a-'+asset.id+'.'+extension;
      const loader='assets/runtime/a-'+asset.id+'.js';
      files[file]=decodeAsset(asset.data);
      // file://의 WebGL/폰트 보안 제한을 피하기 위한 에셋별 데이터 로더. HTML에는 넣지 않습니다.
      files[loader]=encode('window.ONGGI_ASSET_DATA['+JSON.stringify(asset.id)+']='+JSON.stringify(asset.data)+';\n');
      scripts.push('<script defer src="'+loader+'"></script>');
      return {id:asset.id,name:asset.name,kind:asset.kind,file};
    });
    files['src/data/project.js']=encode('// 맵·UI 설정·에셋 경로 데이터. 게임 로직은 다른 src 파일에 있습니다.\nwindow.ONGGI_PROJECT='+JSON.stringify(metadata,null,2)+';\nwindow.ONGGI_ASSET_DATA=Object.create(null);\n');
    files['index.html']=encode(template.files['index.html'].replace('<!--ONGGI_ASSETS-->',scripts.join('\n')));
    // 편집기로 되돌아갈 때 사용하는 별도 저장 데이터. 플레이할 때는 읽지 않습니다.
    files['project.onggi.json']=encode(JSON.stringify(project,null,2));
    files['EXTRACT_FIRST.txt']=encode('실행 전에 반드시 ZIP 전체의 압축을 풀어주세요. Windows 탐색기의 상단 압축 풀기를 사용합니다. 압축 파일 안의 index.html을 직접 실행하지 않습니다.\n꺼낸 폴더 안의 index.html을 여세요. src와 assets를 따로 옮기지 마세요. 에셋은 모두 로컬이며 인터넷 다운로드가 없습니다.\n같은 보안 경고가 압축을 푼 뒤에도 계속되면 Windows 보안을 끄지 말고 실제 파일 경로와 경고를 확인하세요.');
    files['README.txt']=encode('실행: index.html을 여세요. src와 assets를 함께 보관해야 합니다.\n편집기로 되돌아가기: project.onggi.json을 불러오세요.\n에셋별 assets/runtime/*.js는 오프라인 실행용 생성 파일입니다.\n');
    return files;
  }

  /** @param bytes {Uint8Array} 파일 바이트. @returns {number} ZIP 표준 CRC-32. */
  function crc32(bytes) {
    let crc=0xffffffff;
    for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    return (crc^0xffffffff)>>>0;
  }

  /** @param files {object} 상대 경로 → Uint8Array. @returns {Uint8Array} UTF-8 파일명의 STORE ZIP.
   * 파일당/총합 512MB 미만으로 제한. ZIP64·압축/암호화는 사용하지 않습니다. */
  function zip(files) {
    const local=[],central=[];let offset=0,centralSize=0;
    const entries=Object.entries(files);if(entries.length>65535)throw Error('파일 개수 제한 초과');
    for(const [file,data]of entries){
      if(!file||file.startsWith('/')||file.includes('\\')||file.split('/').some(s=>s==='..'||s===''))throw Error('잘못된 ZIP 파일 경로');
      if((!ArrayBuffer.isView(data)||data.BYTES_PER_ELEMENT!==1)||data.length>512*1024*1024)throw Error('파일 크기/형식 오류');
      const name=encode(file),crc=crc32(data),header=new Uint8Array(30+name.length),view=new DataView(header.buffer);
      view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint16(12,0x5c21,true);
      view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);header.set(name,30);
      const record=new Uint8Array(46+name.length),dir=new DataView(record.buffer);
      dir.setUint32(0,0x02014b50,true);dir.setUint16(4,20,true);dir.setUint16(6,20,true);dir.setUint16(8,0x800,true);dir.setUint16(14,0x5c21,true);
      dir.setUint32(16,crc,true);dir.setUint32(20,data.length,true);dir.setUint32(24,data.length,true);dir.setUint16(28,name.length,true);dir.setUint32(42,offset,true);record.set(name,46);
      local.push(header,data);central.push(record);offset+=header.length+data.length;centralSize+=record.length;
      if(offset+centralSize>512*1024*1024)throw Error('배포 ZIP은 512MB 이하여야 합니다.');
    }
    const end=new Uint8Array(22),view=new DataView(end.buffer);
    view.setUint32(0,0x06054b50,true);view.setUint16(8,entries.length,true);view.setUint16(10,entries.length,true);view.setUint32(12,centralSize,true);view.setUint32(16,offset,true);
    const result=new Uint8Array(offset+centralSize+22);let cursor=0;
    for(const part of [...local,...central,end]){result.set(part,cursor);cursor+=part.length;}
    return result;
  }
  return {createFiles,zip,crc32};
})();
