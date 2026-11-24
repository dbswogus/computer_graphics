/* 읽기: addFiles → prepare/decode → applyPrepared → drawWorld/drawOverlay.
 * 지원: PNG/JPEG/WebP/GIF, TTF/OTF/WOFF/WOFF2, WAV/MP3/OGG, 정적 OBJ(재질 제외).
 * 파일은 Data URL로 프로젝트 JSON에 포함됩니다. 외부 URL·스크립트를 실행하지 않습니다. */
const AssetBank = (() => {
  let records=[], resources=new Map(), selectedId='', floorProgram=null,imageProgram=null, plane=null, audio=null, surfaceProgram=null, modelProgram=null, muted=false;
  const effects=new Set(), sources=new Set();
  let effectContext=null, soundEpoch=0,revision=0;
  let importQueue=Promise.resolve();
  const maxOBJTriangles=250_000;
  const extensions={png:['image','image/png'],jpg:['image','image/jpeg'],jpeg:['image','image/jpeg'],webp:['image','image/webp'],gif:['image','image/gif'],ttf:['font','font/ttf'],otf:['font','font/otf'],woff:['font','font/woff'],woff2:['font','font/woff2'],mp3:['audio','audio/mpeg'],wav:['audio','audio/wav'],ogg:['audio','audio/ogg'],obj:['model','text/plain']};

  /** @param text {string} OBJ 원문. @returns {object} mesh에 전달할 {vertices,normals}. 음수 인덱스·다각형 지원. 면별 UV를 보존합니다. */
  function parseOBJ(text) {
    const points=[], triangles=[], uvPoints=[], triangleUVs=[];
    for(const match of text.matchAll(/[^\r\n]+/g)) {
      const line=match[0];
      const parts=line.split('#')[0].trim().split(/\s+/);
      if(parts[0]==='v') {
        const v=parts.slice(1,4).map(Number);
        if(v.length!==3||!v.every(Number.isFinite))throw Error('OBJ 정점 좌표가 잘못되었습니다.');
        points.push(v);if(points.length>100000)throw Error('OBJ 정점은 10만 개 이하로 줄여 주세요.');
      }
      if(parts[0]==='vt') {
        const uv=[Number(parts[1]),Number(parts[2] ?? 0)];
        if(!uv.every(Number.isFinite)) throw Error('OBJ UV 좌표가 잘못되었습니다.');
        uvPoints.push(uv);
      }
      if(parts[0]==='f') {
        const face=parts.slice(1).map(part=>{
          const [vertex,texture]=part.split('/');
          const i=Number(vertex), index=i<0?points.length+i:i-1;
          if(!Number.isInteger(i)||i===0||!points[index])throw Error('OBJ 면 인덱스가 잘못되었습니다.');
          let uvIndex=-1;
          if(texture) {
            const t=Number(texture);
            uvIndex=t<0?uvPoints.length+t:t-1;
            if(!Number.isInteger(t)||t===0||uvIndex<0)throw Error('OBJ UV 인덱스가 잘못되었습니다.');
          }
          return [index,uvIndex];
        });
        if(face.length<3)throw Error('OBJ 면은 정점이 3개 이상이어야 합니다.');
        for(let i=1;i<face.length-1;i++){
          for(const [index,uvIndex] of [face[0],face[i],face[i+1]]) {
            triangles.push(index);
            triangleUVs.push(uvIndex);
          }
          if(triangles.length>maxOBJTriangles*3)throw Error('OBJ 삼각형은 25만 개 이하로 줄여 주세요.');
        }
      }
    }
    if(!points.length||!triangles.length)throw Error('OBJ에 정점과 면이 필요합니다.');
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const v of points)for(let j=0;j<3;j++){min[j]=Math.min(min[j],v[j]);max[j]=Math.max(max[j],v[j]);}
    const size=Math.max(...max.map((v,i)=>v-min[i]));if(size<1e-8||!Number.isFinite(size))throw Error('OBJ 크기가 올바르지 않습니다.');
    const normalized=points.map(v=>[(v[0]-(min[0]+max[0])/2)/size,(v[1]-min[1])/size,(v[2]-(min[2]+max[2])/2)/size]);
    // 삼각형 수에 맞춰 한 번만 메모리를 할당하고 큰 일반 배열의 재복사를 피합니다.
    const vertices=new Float32Array(triangles.length*3),normals=new Float32Array(triangles.length*3);
    if (triangleUVs.some(index=>index>=uvPoints.length)) throw Error('OBJ UV 인덱스가 잘못되었습니다.');
    let uvs=null;
    for(let i=0;i<triangles.length;i+=3){
      const textured=triangleUVs[i]>=0 && triangleUVs[i+1]>=0 && triangleUVs[i+2]>=0;
      if (textured && !uvs) uvs=new Float32Array(triangles.length*3);
      const a=normalized[triangles[i]],b=normalized[triangles[i+1]],c=normalized[triangles[i+2]];
      const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz)||1;
      for(let j=0;j<3;j++){
        const offset=(i+j)*3;vertices.set(normalized[triangles[i+j]],offset);
        normals[offset]=nx/len;normals[offset+1]=ny/len;normals[offset+2]=nz/len;
        if (textured) {
          const [u,v]=uvPoints[triangleUVs[i+j]];
          uvs[offset]=u;uvs[offset+1]=v;uvs[offset+2]=1;
        }
      }
    }
    return {vertices,normals,uvs};
  }

  /** @param record {object} {id,name,kind,data}. @returns {Promise<object>} 브라우저 리소스를 로드. 실패하면 프로젝트 상태는 변경하지 않음. */
  async function decode(record) {
    const ext=record.name.split('.').pop().toLowerCase(),spec=extensions[ext];
    if(!spec||record.kind!==spec[0]||typeof record.data!=='string'||!record.data.startsWith(`data:${spec[1]};base64,`))throw Error('에셋 형식/인코딩이 잘못되었습니다: '+record.name);
    if(record.kind==='image') {
      const image=new Image();image.src=record.data;await image.decode();
      if(image.width>4096||image.height>4096)throw Error('이미지는 가로·세로 4096px 이하로 줄여 주세요.');
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      return {image,texture};
    }
    if(record.kind==='font') {const family='onggi_'+record.id.replace(/[^a-zA-Z0-9]/g,'');const font=new FontFace(family,`url(${record.data})`);await font.load();return {font,family};}
    if(record.kind==='model') {
      const binary=atob(record.data.split(',')[1]);const text=new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));const parsed=parseOBJ(text);const dimensions = [0,1,2].map(axis => {
        let low=Infinity, high=-Infinity;
        for(let i=axis;i<parsed.vertices.length;i+=3){low=Math.min(low,parsed.vertices[i]);high=Math.max(high,parsed.vertices[i]);}
        return Math.max(high-low,0.01);
      });
      const geometry=mesh(parsed.vertices,parsed.normals);
      if (parsed.uvs) {
        geometry.uv=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,geometry.uv);
        gl.bufferData(gl.ARRAY_BUFFER,parsed.uvs,gl.STATIC_DRAW);
      }
      return {mesh:geometry,dimensions};
    }
    return {src:record.data};
  }

  /** @param list {object[]} JSON 에셋 목록. @returns {Promise<object>} 전체 검증·디코드된 후보. 실패하면 생성 중인 GPU 리소스도 해제. */
  async function prepare(list) {
    if(!Array.isArray(list)||list.length>30)throw Error('에셋은 최대 30개입니다.');
    const next=new Map(),created=new Map(),clean=[],baseRevision=revision;
    const oldRecords=new Map(records.map(r=>[r.id,r]));let total=0;
    try {
      for(const item of list){
        if(!item||typeof item.id!=='string'||!/^[\w-]{1,80}$/.test(item.id)||next.has(item.id)||typeof item.name!=='string'||typeof item.data!=='string')throw Error('에셋 ID/이름/데이터가 잘못되었습니다.');
        if(item.data.length>(Math.ceil(20*1024*1024/3)*4+128)||(total+=item.data.length)>80*1024*1024)throw Error('에셋은 개별 20MB, 프로젝트 합계 약 60MB 이하로 줄여 주세요.');
        const record={id:item.id,name:item.name.slice(0,120),kind:item.kind,data:item.data},old=oldRecords.get(item.id);
        let resource;
        if(old && old.kind===record.kind && old.name===record.name && old.data===record.data && resources.has(record.id))resource=resources.get(record.id);
        else {resource=await decode(record);created.set(record.id,resource);}
        next.set(record.id,resource);clean.push(record);
      }
      return {records:clean,resources:next,created,baseRevision,consumed:false};
    }catch(error){release(created);throw error;}
  }

  /** @param bank {Map} 해제 대상. @returns {void} GPU/폰트 리소스를 해제. */
  function release(bank) {for(const resource of bank.values()){if(resource.texture)gl.deleteTexture(resource.texture);if(resource.mesh){gl.deleteBuffer(resource.mesh.b);gl.deleteBuffer(resource.mesh.nb);if(resource.mesh.uv)gl.deleteBuffer(resource.mesh.uv);}if(resource.font)document.fonts.delete(resource.font);}}

  /** @param candidate {object} prepare 반환값. @returns {void} 리소스를 원자적으로 교체. */
  function applyPrepared(candidate) {
    if(candidate.consumed)throw Error('이미 처리한 에셋 후보입니다.');
    candidate.consumed=true;
    if(candidate.baseRevision!==revision){release(candidate.created);throw Error('에셋이 먼저 변경되었습니다. 다시 불러와 주세요.');}
    stopSound();
    // 재사용하는 GPU 메시/이미지/폰트는 해제하지 않습니다.
    release(new Map([...resources].filter(([id,r])=>candidate.resources.get(id)!==r)));
    records=candidate.records;resources=candidate.resources;revision++;
    if(!records.some(r=>r.id===selectedId))selectedId=records[0]?.id||'';
    for(const r of resources.values())if(r.font)document.fonts.add(r.font);
  }

  /** @param files {FileList|File[]} 드롭/파일 선택 결과. @returns {Promise<void>} 허용 파일을 추가. 전부 성공한 경우에만 목록 교체. */
  function addFiles(files) {
    const input=Array.from(files);
    const task=importQueue.then(()=>importFiles(input));
    importQueue=task.catch(()=>{});return task;
  }

  /** @param files {File[]} 한 번의 추가 요청. @returns {Promise<void>} 순서대로 읽고 중복 파일은 재사용.
   * 개수/전체 용량을 읽는 도중 확인해 불필요한 대용량 파일 누적을 막습니다. */
  async function importFiles(files) {
    if(files.length>30)throw Error('한 번에 최대 30개 파일을 선택하세요.');
    const added=[];let total=records.reduce((sum,r)=>sum+r.data.length,0),lastId=selectedId;
    for(const file of files) {
      const spec=extensions[file.name.split('.').pop().toLowerCase()];if(!spec)throw Error('지원 파일: PNG/JPG/WebP/GIF, 폰트, MP3/WAV/OGG, OBJ. GLB/FBX/MTL은 지원하지 않습니다.');
      if(file.size>20*1024*1024)throw Error('파일 하나는 20MB 이하여야 합니다.');

      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve('data:'+spec[1]+';base64,'+String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('파일을 읽지 못했습니다.'));reader.onabort=()=>reject(Error('파일 읽기가 취소되었습니다.'));reader.readAsDataURL(file);});
      const duplicate=[...records,...added].find(r=>r.name===file.name&&r.kind===spec[0]&&r.data===data);
      if(duplicate){lastId=duplicate.id;continue;}
      if(records.length+added.length>=30)throw Error('에셋은 최대 30개입니다.');
      total+=data.length;if(total>80*1024*1024)throw Error('프로젝트 에셋 합계를 약 60MB 이하로 줄여 주세요.');
      const id='asset-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
      added.push({id,name:file.name,kind:spec[0],data});lastId=id;
    }
    if(added.length)applyPrepared(await prepare([...records,...added]));
    selectedId=lastId;
  }

  function hasModelUV(id) {return Boolean(resources.get(id)?.mesh?.uv);}

  function drawModel(id, geometry, model, color) {
    const image=resources.get(StudioUI.settings.modelTextures?.[id]);
    if (!geometry.uv || !image?.texture) {
      draw(geometry,model,color);
      return;
    }
    if (!modelProgram) modelProgram=program(
      'attribute vec3 position,normal,texcoord;uniform mat4 mvp,model;varying vec3 uv;varying float light;void main(){uv=vec3(texcoord.x,1.-texcoord.y,texcoord.z);vec3 n=normalize(mat3(model)*normal);light=.61+.39*max(dot(n,normalize(vec3(-.4,.8,1.))),0.);gl_Position=mvp*vec4(position,1.);}',
      'precision mediump float;uniform sampler2D picture;uniform vec3 baseColor;varying vec3 uv;varying float light;void main(){vec4 c=texture2D(picture,uv.xy);gl_FragColor=vec4(mix(baseColor,c.rgb,c.a*uv.z)*light,1.);}'
    );
    gl.useProgram(modelProgram);
    for (const [name,buffer] of [['position',geometry.b],['normal',geometry.nb],['texcoord',geometry.uv]]) {
      const location=gl.getAttribLocation(modelProgram,name);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);
    }
    gl.uniformMatrix4fv(gl.getUniformLocation(modelProgram,'mvp'),false,mul(vp,model));
    gl.uniformMatrix4fv(gl.getUniformLocation(modelProgram,'model'),false,model);
    gl.uniform3fv(gl.getUniformLocation(modelProgram,'baseColor'),rgb(color));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,image.texture);
    gl.uniform1i(gl.getUniformLocation(modelProgram,'picture'),0);
    gl.drawArrays(gl.TRIANGLES,0,geometry.count);
    gl.disableVertexAttribArray(gl.getAttribLocation(modelProgram,'texcoord'));
  }

  /** @param parent {Float32Array} 기울어진 월드 행렬. @param stage {object} placedAssets가 있는 스테이지.
   * @returns {void} 이미지=바닥 스티커, OBJ=1칸 정규화 장식. 충돌은 별도의 벽 블록으로 배치. */
  function drawWorld(parent,stage) {
    for(const block of stage.placedAssets||[]) {
      const record=records.find(r=>r.id===block.assetId),resource=resources.get(block.assetId);if(!record||!resource)continue;
      const model=mul(parent,mul(translate(block.x,0.07,block.z),ry(block.rotation*Math.PI/180)));
      if(record.kind==='model'){drawModel(record.id,resource.mesh,model,'#bd9060');continue;}
      if(record.kind!=='image')continue;
      if(!imageProgram){imageProgram=program('attribute vec3 position;uniform mat4 mvp;varying vec2 uv;void main(){uv=vec2(position.x+.5,position.z+.5);gl_Position=mvp*vec4(position,1.);}','precision mediump float;uniform sampler2D picture;varying vec2 uv;void main(){vec4 c=texture2D(picture,uv);if(c.a<.02)discard;gl_FragColor=c;}');plane=mesh([-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,-.5,.5,0,.5,-.5,0,.5],Array(18).fill(0));}
      gl.useProgram(imageProgram);gl.bindBuffer(gl.ARRAY_BUFFER,plane.b);const pos=gl.getAttribLocation(imageProgram,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(gl.getUniformLocation(imageProgram,'mvp'),false,mul(vp,model));gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,resource.texture);gl.uniform1i(gl.getUniformLocation(imageProgram,'picture'),0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.TRIANGLES,0,6);gl.disable(gl.BLEND);
    }
  }

  /** @param context {CanvasRenderingContext2D} UI 캔버스. @returns {void} StudioUI의 이미지 위치/크기로 배치. */
  function drawOverlay(context) {
    const setting=StudioUI.settings,r=resources.get(setting.imageAssetId);if(!r?.image)return;
    const e=PageUI.resolve('image',{x:setting.imageX,y:setting.imageY,width:setting.imageW,height:setting.imageH,text:'UI 이미지'});
    if(!e.hidden)context.drawImage(r.image,e.x,e.y,e.width,e.height);
  }

  /** @param id {string} 오디오 에셋 ID. @returns {Promise<void>} 사용자 클릭으로 재생. 디코드/권한 오류는 호출부에서 안내. */
  async function playSound(id) {muted=false;stopSound();const record=records.find(r=>r.id===id&&r.kind==='audio');if(!record)throw Error('사운드 에셋을 선택하세요.');audio=new Audio(record.data);audio.loop=true;audio.volume=0.4;await audio.play();}
  /** 매개변수 없음. @returns {void} 현재 소리 중지. */
  function stopSound(){soundEpoch++;for(const source of sources){try{source.stop();}catch{}}sources.clear();for(const sound of effects){sound.pause();sound.src='';}effects.clear();if(audio){audio.pause();audio.src='';audio=null;}}

  /** @param parent {Float32Array} 옹기 위치/회전 행렬. @param id {number} 옹기 0~5.
   * @param roll {number} 굴림 각도(라디안). @param size {number} 표시 배율.
   * @returns {boolean} 지정한 OBJ를 그렸으면 true. 충돌 반지름/중력 값은 기존대로 유지. */
  function drawOnggi(parent,id,roll,size) {
    const assetId=StudioUI.settings.onggiAssets?.[String(id)],resource=resources.get(assetId);
    if(!resource?.mesh)return false;
    const local=mul(rz(roll),mul(scale(size,size,size),mul(translate(0,-0.62,0),scale(1.24,1.24,1.24))));
    drawModel(assetId,resource.mesh,mul(parent,local),potColors[id]||'#a8784d');return true;
  }

  /** @param floor {object} 구멍/낙하 경계를 반영한 기존 바닥 메시. @param model {Float32Array} 맵 변환.
   * @param color {string} 기본 바닥 #색상. @returns {boolean} 바닥 이미지로 그렸으면 true.
   * 1월드 단위마다 이미지를 반복하며, 바닥 모양·구멍·충돌은 기존 메시를 그대로 사용합니다. */
  function drawFloor(floor, model, color) {
    return drawSurface(floor, model, color, skinId('floor'));
  }

  /** 읽기 1. @param type {string} 블록 종류. @param block {object} 개별 설정.
   * @returns {string} 개별 외형 → 종류 기본 외형 → 이전 버전 바닥 설정 순으로 선택한 ID. */
  function skinId(type, block = {}) {
    return block.skinAssetId || StudioUI.settings.blockAssets?.[type] || (type==='floor' ? StudioUI.settings.floorAssetId : '') || '';
  }

  /** 읽기 2. @param geometry {object} 기존 메시. @param model {Float32Array} 월드 변환.
   * @param color {string} 투명 영역의 기본색. @param id {string} 로컬 이미지 ID.
   * @param clip {object|null} 바닥 한 칸 범위. @returns {boolean} 텍스처로 그렸으면 true.
   * 원래 메시를 재사용하므로 구멍/낙하 영역을 이미지가 메우지 않습니다. */
  function drawSurface(geometry, model, color, id, clip = null) {
    const resource=resources.get(id);
    if (!resource?.texture) return false;
    if (!surfaceProgram) surfaceProgram=program(
      'attribute vec3 position;attribute vec3 normal;uniform mat4 mvp;uniform mat4 model;uniform float uvOffset;varying vec2 uv;varying vec2 point;varying float light;varying float top;void main(){vec3 n=abs(normal);uv=n.y>.5?position.xz+uvOffset:(n.x>.5?position.zy+uvOffset:position.xy+uvOffset);point=position.xz;top=normal.y;vec3 wn=normalize(mat3(model)*normal);light=.61+.39*max(dot(wn,normalize(vec3(-.4,.8,1.))),0.);gl_Position=mvp*vec4(position,1.);}',
      'precision mediump float;uniform sampler2D picture;uniform vec3 baseColor;uniform vec4 bounds;uniform float clipped;varying vec2 uv;varying vec2 point;varying float light;varying float top;void main(){if(clipped>.5&&(top<.5||point.x<bounds.x||point.y<bounds.y||point.x>bounds.z||point.y>bounds.w))discard;vec4 c=texture2D(picture,fract(uv));gl_FragColor=vec4(mix(baseColor,c.rgb,c.a)*light,1.);}'
    );
    gl.useProgram(surfaceProgram);
    for (const [name, buffer] of [['position',geometry.b],['normal',geometry.nb]]) {
      const location=gl.getAttribLocation(surfaceProgram,name);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);
    }
    gl.uniformMatrix4fv(gl.getUniformLocation(surfaceProgram,'mvp'),false,mul(vp,model));
    gl.uniformMatrix4fv(gl.getUniformLocation(surfaceProgram,'model'),false,model);
    gl.uniform3fv(gl.getUniformLocation(surfaceProgram,'baseColor'),rgb(color));
    gl.uniform1f(gl.getUniformLocation(surfaceProgram,'uvOffset'),geometry===cube?.5:0);
    gl.uniform1f(gl.getUniformLocation(surfaceProgram,'clipped'),clip?1:0);
    gl.uniform4fv(gl.getUniformLocation(surfaceProgram,'bounds'),clip?[clip.x-clip.w/2,clip.z-clip.d/2,clip.x+clip.w/2,clip.z+clip.d/2]:[0,0,0,0]);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,resource.texture);
    gl.uniform1i(gl.getUniformLocation(surfaceProgram,'picture'),0);
    gl.drawArrays(gl.TRIANGLES,0,geometry.count);
    return true;
  }

  /** 읽기 3. @param surface {object} 컴파일된 바닥. @param parent {Float32Array} 맵 행렬.
   * @param color {string} 기본색. @returns {void} 개별 바닥 이미지만 원래 지형 위에 덧그림.
   * 깊이 판정은 호출 전 상태로 복구하고, 바닥이 없는 위치에는 그리지 않습니다. */
  function drawFloorSkins(surface, parent, color) {
    const blocks=(surface.floorBlocks||[]).filter(b=>b.skinAssetId);
    if (!blocks.length) return;
    const previous=gl.getParameter(gl.DEPTH_FUNC);
    gl.depthFunc(gl.LEQUAL);
    try { for (const b of blocks) drawSurface(surface.floor,parent,color,b.skinAssetId,b); }
    finally { gl.depthFunc(previous); }
  }

  /** 읽기 4. @param type {string} 벽/장애물/표식 종류. @param b {object} 위치·크기·개별 외형.
   * @param parent {Float32Array} 맵 행렬. @param y {number} 상자 중심 높이.
   * @param height {number} 표시 높이. @param color {string} 모델 기본색.
   * @returns {boolean} 외형을 그렸으면 true, 미지정이면 호출부에서 기본 블록을 그림.
   * OBJ는 블록 크기에 맞춰 표시하며 실제 충돌/왕복/붕괴 판정은 변경하지 않습니다. */
  function drawBlock(type,b,parent,y,height,color) {
    const id=skinId(type,b),resource=resources.get(id);
    if (!resource) return false;
    if (resource.mesh) {
      const [w,h,d]=resource.dimensions;
      const rotated=b.rotation===90;
      const local=mul(ry(rotated?Math.PI/2:0),scale((rotated?b.d:b.w)/w,height/h,(rotated?b.w:b.d)/d));
      const model=mul(parent,mul(translate(b.x,y-height/2,b.z),local));
      drawModel(id,resource.mesh,model,color);return true;
    }
    const model=mul(parent,mul(translate(b.x,y,b.z),scale(b.w,height,b.d)));
    return drawSurface(cube,model,color,id);
  }

  /** 읽기 5. @param event {string} checkpoint/arrival/projectSave/fail.
   * @returns {Promise<boolean>} 지정된 오디오를 한 번 재생. BGM과 별도이며 반복하지 않음.
   * 클릭에서 unlockEffects를 먼저 호출합니다. 재생 거부는 게임을 중단하지 않습니다. */
  async function playEffect(event) {
    if (muted) return false;
    const id=StudioUI.settings.sfx?.[event],record=records.find(r=>r.id===id && r.kind==='audio');
    if (!record) return false;
    if(effects.size>=8){const first=effects.values().next().value;first.pause();effects.delete(first);}
    // Web Audio를 시작 클릭에서 준비하면 휴대폰에서도 게임 이벤트 시점에 재생할 수 있습니다.
    if(effectContext) {
      const epoch=soundEpoch;
      try {
        const buffer=await effectBuffer(id);
        if(muted || epoch!==soundEpoch || effectContext.state!=='running')return false;
        if(sources.size>=8){const first=sources.values().next().value;first.stop();sources.delete(first);}
        const source=effectContext.createBufferSource(),gain=effectContext.createGain();
        source.buffer=buffer;gain.gain.value=StudioUI.settings.sfxVolume ?? .7;
        source.connect(gain);gain.connect(effectContext.destination);sources.add(source);
        source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect();};
        source.start();return true;
      } catch { return false; }
    }
    const sound=new Audio(record.data);sound.loop=false;sound.volume=StudioUI.settings.sfxVolume ?? .7;
    effects.add(sound);
    sound.onended=sound.onerror=()=>{effects.delete(sound);sound.src='';};
    try { await sound.play();return true; }
    catch { effects.delete(sound);sound.src='';return false; }
  }

  /** 매개변수 없음. @returns {void} 재생 클릭에서 음소거 해제. 오디오는 로컬 데이터만 사용. */
  function unlockEffects() {
    muted=false;
    try {
      const Context=window.AudioContext || window.webkitAudioContext;
      if(!effectContext && Context)effectContext=new Context();
      if(effectContext?.state==='suspended')void effectContext.resume().catch(()=>{});
      if(effectContext)for(const id of Object.values(StudioUI.settings.sfx || {}))void effectBuffer(id).catch(()=>{});
    } catch { effectContext=null; }
  }

  /** @param id {string} 오디오 ID. @returns {Promise<AudioBuffer>} 로컬 바이트를 디코드해 리소스에 캐시.
   * fetch/서버를 사용하지 않으며 에셋 교체 시 캐시도 함께 교체됩니다. */
  function effectBuffer(id) {
    const record=records.find(r=>r.id===id && r.kind==='audio'),resource=resources.get(id);
    if(!record || !resource)return Promise.reject(Error('효과음 파일이 없습니다.'));
    if(!resource.soundBufferPromise) {
      const binary=atob(record.data.split(',')[1]);
      const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
      resource.soundBufferPromise=effectContext.decodeAudioData(bytes.buffer).catch(error=>{resource.soundBufferPromise=null;throw error;});
    }
    return resource.soundBufferPromise;
  }

  /** @param value {boolean} 전체 음소거 여부. @returns {void} BGM/효과음을 함께 중지/허용. */
  function setMuted(value) { muted=Boolean(value);if(muted)stopSound(); }

  return {hasModelUV,skinId,drawSurface,drawFloorSkins,drawBlock,playEffect,unlockEffects,setMuted,drawOnggi,drawFloor,parseOBJ,prepare,applyPrepared,addFiles,drawWorld,drawOverlay,playSound,stopSound,
    exportData:()=>records.map(r=>({...r})),list:()=>records.map(({data,...r})=>r),
    select:id=>{selectedId=id;},selected:()=>selectedId,fontFamily:id=>resources.get(id)?.family,
    image:id=>resources.get(id)?.image};
})();
