(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const remote = [
    'https://images.pexels.com/photos/34763916/pexels-photo-34763916.jpeg?auto=compress&cs=tinysrgb&w=1400',
    'https://images.pexels.com/photos/10937548/pexels-photo-10937548.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/30660787/pexels-photo-30660787.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/34572616/pexels-photo-34572616.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/30266196/pexels-photo-30266196.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/31972636/pexels-photo-31972636.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ];
  const palette = [['#6b705c','#cb997e'],['#7067cf','#d590b5'],['#2c5364','#d4a373'],['#b56576','#6d597a'],['#386641','#dda15e'],['#577590','#f4a261'],['#806c7b','#d9ae94'],['#264653','#e9c46a']];
  function fallback(i, title='Family memory') {
    const [a,b] = palette[i % palette.length];
    const people = Array.from({length:2+i%4},(_,j)=>{const x=160+j*170;return `<circle cx="${x}" cy="340" r="36" fill="#f7dfcf"/><path d="M${x-58} 500 Q${x} 377 ${x+58} 500" fill="#ffffffaa"/>`}).join('');
    const safe = String(title).replace(/[<>&]/g,'');
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1000" height="700" fill="url(#g)"/><circle cx="850" cy="95" r="190" fill="#ffffff19"/>${people}<text x="55" y="630" fill="white" font-family="sans-serif" font-size="44" font-weight="700">${safe}</text></svg>`);
  }
  function bindFallbacks(root=document) {
    root.querySelectorAll('img').forEach((img,i)=>{
      if(img.dataset.bound)return;img.dataset.bound='1';
      img.addEventListener('error',()=>{img.src=fallback(Number(img.dataset.fallback||i),img.alt||'Family memory')},{once:true});
    });
  }
  const photos = [
    {id:1,year:2001,title:'할머니의 여름 정원',note:'온 가족이 모여 토마토를 심었던 오후',src:remote[0],story:true,type:'photo',place:'부산'},
    {id:2,year:2004,title:'초등학교 입학',note:'새 가방을 처음 멘 날',src:remote[1],story:false,type:'photo',place:'서울'},
    {id:3,year:2007,title:'한강 소풍',note:'김밥과 오래된 카세트',src:remote[2],story:true,type:'video',place:'서울'},
    {id:4,year:2010,title:'고등학교 축제',note:'친구들과 공연 준비',src:remote[3],story:false,type:'photo',place:'서울'},
    {id:5,year:2016,title:'할아버지의 정원',note:'직접 키운 토마토',src:remote[0],story:true,type:'photo',place:'부산'},
    {id:6,year:2018,title:'가족 결혼식',note:'오랜만에 모두 모인 날',src:remote[4],story:false,type:'photo',place:'대전'},
    {id:7,year:2023,title:'제주 다시 방문',note:'25년 전 장소를 다시 찾다',src:remote[5],story:true,type:'video',place:'제주'},
    {id:8,year:2026,title:'오늘의 가족',note:'새 기억을 기록하는 날',src:remote[1],story:true,type:'photo',place:'서울'},
    {id:9,year:2026,title:'아침 식탁',note:'평범해서 더 오래 남는 장면',src:remote[0],story:false,type:'photo',place:'서울'},
    {id:10,year:2026,title:'부산 바다',note:'세 세대가 같은 바다에서',src:remote[4],story:true,type:'photo',place:'부산'}
  ];
  let selected=photos[0], stream=null, facing='environment', raf=0, filter='Original', mode='photo', recorder=null, chunks=[];
  const titles={home:'홈',library:'라이브러리',photo:'사진과 기억',capture:'카메라와 편집',family:'가족',explore:'탐색'};
  const filters={Original:'none',Warm:'sepia(.18) saturate(1.18) brightness(1.04)',Clean:'contrast(1.06) saturate(.92) brightness(1.05)',Film:'sepia(.25) contrast(.9) saturate(.82)',Mono:'grayscale(1) contrast(1.12)',Fade:'contrast(.82) saturate(.7) brightness(1.12)',Vivid:'saturate(1.45) contrast(1.08)',Soft:'brightness(1.08) saturate(.9) contrast(.94)'};
  function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2400)}
  function show(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));$('#pageTitle').textContent=titles[id]||'주마등';scrollTo({top:0,behavior:'smooth'});if(id==='explore')orbit()}
  $$('[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));
  $$('[data-capture-mode]').forEach(b=>b.onclick=()=>{show('capture');setMode(b.dataset.captureMode)});
  function memory(){ $('#memoryModal').classList.add('show');$('#memoryText').focus() }
  $$('[data-open-memory]').forEach(b=>b.onclick=memory);$('#recordStoryBtn').onclick=memory;
  $$('[data-close-modal]').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('show'));
  $$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove('show')});
  $('#saveMemory').onclick=()=>{if(!$('#memoryText').value.trim())return toast('짧게라도 기억을 적어주세요.');$('#memoryText').value='';$('#memoryModal').classList.remove('show');toast('가족 기억을 저장했습니다.')};
  $('#planBtn').onclick=()=>$('#planModal').classList.add('show');
  $('#waitlistBtn').onclick=()=>{$('#planModal').classList.remove('show');toast('Family Circle 베타 대기 목록에 등록했습니다.')};
  function renderLibrary(){
    const q=$('#librarySearch').value.trim().toLowerCase(), groups={};
    photos.filter(p=>`${p.title} ${p.note} ${p.year} ${p.place}`.toLowerCase().includes(q)).forEach(p=>(groups[p.year]??=[]).push(p));
    $('#libraryYears').innerHTML=Object.keys(groups).sort((a,b)=>b-a).map(y=>`<section class="yearBlock"><div class="yearTitle"><h3>${y}</h3><span>${groups[y].length}개의 기억</span></div><div class="photoGrid">${groups[y].map((p,i)=>`<button class="photoTile ${i===0&&groups[y].length>2?'wide':''} ${i===2&&groups[y].length>4?'tall':''}" data-photo-id="${p.id}"><img src="${p.src}" alt="${p.title}" data-fallback="${p.id}"><span class="mediaBadge">${p.type==='video'?'▶ 0:24':p.year}</span>${p.story?'<span class="storyBadge">●</span>':''}</button>`).join('')}</div></section>`).join('')||'<div class="card" style="padding:30px">검색 결과가 없습니다.</div>';
    $$('[data-photo-id]').forEach(b=>b.onclick=()=>openPhoto(Number(b.dataset.photoId)));bindFallbacks($('#libraryYears'));
  }
  $('#librarySearch').oninput=renderLibrary;
  $('#librarySegments').onclick=e=>{if(e.target.tagName!=='BUTTON')return;$$('#librarySegments button').forEach(b=>b.classList.toggle('active',b===e.target));toast(e.target.textContent+' 보기로 전환했습니다.')};
  $$('.chip').forEach(c=>c.onclick=()=>{c.classList.toggle('active');toast('라이브러리 필터를 적용했습니다.')});
  function openPhoto(id){selected=photos.find(p=>p.id===id)||photos[0];const img=$('#detailImage');img.src=selected.src;img.alt=selected.title;img.onerror=()=>img.src=fallback(selected.id,selected.title);$('#detailTitle').textContent=selected.title;$('#detailNote').textContent=selected.note;resetEdit();show('photo')}
  $$('[data-open-photo]').forEach(b=>b.onclick=()=>openPhoto(Number(b.dataset.openPhoto)));
  function edit(){const b=$('#brightness').value,c=$('#contrast').value,s=$('#saturation').value,w=$('#warmth').value;$('#detailImage').style.filter=`brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${Number(w)/100})`}
  function resetEdit(){$('#brightness').value=100;$('#contrast').value=100;$('#saturation').value=100;$('#warmth').value=0;edit()}
  ['brightness','contrast','saturation','warmth'].forEach(id=>$('#'+id).oninput=edit);
  $$('.editTool').forEach(b=>b.onclick=()=>{$$('.editTool').forEach(x=>x.classList.toggle('active',x===b));const e=b.dataset.edit;$('#adjustPanel').classList.toggle('active',e==='light'||e==='filter');if(e==='auto'){resetEdit();$('#brightness').value=106;$('#contrast').value=104;$('#saturation').value=108;edit();toast('자동 보정을 미리 적용했습니다.')}else if(e==='restore')toast('복원 결과는 원본을 남기고 새 버전으로 생성됩니다.');else if(e==='crop'){ $('#detailImage').style.transform='scale(1.04)';toast('자르기 프리뷰를 적용했습니다.')}else if(e==='story')memory()});
  $('#compareBtn').onpointerdown=()=>$('#detailImage').style.filter='none';$('#compareBtn').onpointerup=edit;$('#compareBtn').onpointerleave=edit;$('#sharePhoto').onclick=()=>toast('가족 공유 링크를 준비했습니다.');$('#fakePlay').onclick=()=>toast('어머니의 음성 기억을 재생합니다.');
  function ingest(list){[...list].filter(f=>f.type.startsWith('image/')).forEach(f=>{const r=new FileReader;r.onload=()=>{photos.unshift({id:Date.now()+Math.random(),year:new Date().getFullYear(),title:f.name.replace(/\.[^.]+$/,''),note:'이 브라우저에서 추가한 사진',src:r.result,story:false,type:'photo',place:'미지정'});renderLibrary();toast('라이브러리에 추가했습니다. 탭을 닫으면 사라집니다.')};r.readAsDataURL(f)})}
  $('#homeUpload').onchange=e=>ingest(e.target.files);$('#libraryUpload').onchange=e=>ingest(e.target.files);$('#captureUpload').onchange=e=>ingest(e.target.files);$('#importBtn').onclick=()=>$('#captureUpload').click();
  $('#filterRail').innerHTML=Object.keys(filters).map((n,i)=>{const [a,b]=palette[i%palette.length];return `<button class="filterSwatch ${i?'':'active'}" data-filter="${n}"><i style="filter:${filters[n]};background:linear-gradient(145deg,${a},${b})"></i>${n}</button>`}).join('');
  $$('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle('active',x===b))});
  function setMode(m){mode=m;$$('.captureMode').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));$('#guideFrame').classList.toggle('active',m==='scan');$('#thenOverlay').style.opacity=m==='then'?'.32':'0';const t={photo:'사진과 필터를 촬영합니다',scan:'인쇄 사진의 가장자리를 프레임에 맞추세요',then:'옛 사진과 현재 구도를 맞추세요',video:'짧은 필터 영상을 기록합니다',story:'사진을 보며 음성·영상 기억을 남깁니다'};$('#scanStatus').textContent=t[m];$('#captureHint').textContent=m==='then'?'오버레이와 얼굴 위치를 맞춘 뒤 촬영하세요.':m==='scan'?'빛 반사를 줄이고 프레임 안에 사진을 맞추세요.':'결과는 원본과 별도 버전으로 저장됩니다.'}
  $$('.captureMode').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  async function start(){stop();if(!navigator.mediaDevices?.getUserMedia)return toast('이 브라우저에서는 카메라를 사용할 수 없습니다.');try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing}},audio:true})}catch(e){try{stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false})}catch(_){return toast('카메라 권한 또는 장치를 확인하세요.')}}const v=$('#cameraVideo');v.srcObject=stream;await v.play();$('#cameraEmpty').style.display='none';draw();toast('카메라가 시작됐습니다.')}
  function stop(){cancelAnimationFrame(raf);if(stream)stream.getTracks().forEach(t=>t.stop());stream=null}
  function draw(){if(!stream)return;const v=$('#cameraVideo'),c=$('#cameraCanvas'),x=c.getContext('2d'),w=v.videoWidth||1280,h=v.videoHeight||720;c.width=w;c.height=h;x.save();if(facing==='user'){x.translate(w,0);x.scale(-1,1)}x.filter=filters[filter];x.drawImage(v,0,0,w,h);x.restore();raf=requestAnimationFrame(draw)}
  $('#openCameraBtn').onclick=start;$('#flipBtn').onclick=()=>{facing=facing==='user'?'environment':'user';if(stream)start()};$('#flashBtn').onclick=()=>toast('웹 베타에서는 플래시를 지원하지 않습니다.');
  $('#shutterBtn').onclick=()=>{if(mode==='story')return memory();if(!stream)return toast('먼저 카메라를 켜세요.');if(mode==='video'){if(recorder?.state==='recording'){recorder.stop();$('#shutterBtn').classList.remove('recording');return}if(typeof MediaRecorder==='undefined'||typeof $('#cameraCanvas').captureStream!=='function')return toast('이 브라우저는 필터 영상 녹화를 지원하지 않습니다.');const cs=$('#cameraCanvas').captureStream(24),a=stream.getAudioTracks()[0];if(a)cs.addTrack(a);chunks=[];recorder=new MediaRecorder(cs);recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);recorder.onstop=()=>toast('필터 영상을 만들었습니다. 영구 저장은 다음 베타에서 연결됩니다.');recorder.start();$('#shutterBtn').classList.add('recording');return toast('영상 녹화를 시작했습니다. 다시 눌러 종료하세요.')}const src=$('#cameraCanvas').toDataURL('image/png');photos.unshift({id:Date.now(),year:new Date().getFullYear(),title:mode==='scan'?'스캔한 가족사진':mode==='then'?'그때와 지금':'새 가족사진',note:`${filter} · ${mode}`,src,story:false,type:'photo',place:'미지정'});renderLibrary();toast('사진을 라이브러리에 추가했습니다.')};
  function family(){const feed=[{who:'어머니',time:'12분 전',title:'제주도에서 다시 찾은 장소',text:'25년 전과 같은 자리에서 사진을 찍었어요. 아버지가 옛날 사진의 정확한 위치를 기억해냈습니다.',src:remote[1]},{who:'아버지',time:'어제',title:'할머니의 생신',text:'이 사진은 2001년이 아니라 2000년이 맞습니다. 케이크를 사 온 가게도 아직 기억나요.',src:remote[0]}];$('#familyFeed').innerHTML=feed.map((p,i)=>`<article class="card post"><div class="postHead"><div class="postUser"><div class="avatar">${p.who[0]}</div><div><b>${p.who}</b><small>${p.time} · 가족 전체 공개</small></div></div><button class="iconbtn">···</button></div><img class="postMedia" src="${p.src}" alt="${p.title}" data-fallback="${i}"><div class="postBody"><div class="postActions"><div class="reactionGroup"><button class="reaction">♡ 12</button><button class="reaction">💬 ${i+2}</button></div><button class="ghost" data-post-memory>기억 추가</button></div><h3>${p.title}</h3><p>${p.text}</p></div></article>`).join('');$$('.reaction').forEach(b=>b.onclick=()=>{if(b.textContent.startsWith('♡'))b.textContent='♥ 13';toast('반응을 남겼습니다.')});$$('[data-post-memory]').forEach(b=>b.onclick=memory);bindFallbacks($('#familyFeed'))}
  $('#inviteBtn').onclick=()=>toast('가족 초대 링크를 복사했습니다.');$('#manageFamily').onclick=()=>toast('가족 관리 화면은 다음 베타에서 연결됩니다.');
  function orbit(){const e=$('#orbit');if(e.children.length)return;e.innerHTML=photos.slice(0,9).map((p,i)=>`<span style="transform:rotateY(${i*40}deg) translateZ(250px) rotateY(90deg)"><img src="${p.src}" alt="${p.title}" data-fallback="${i}"></span>`).join('');bindFallbacks(e)}
  $('#enterTunnel').onclick=()=>{orbit();toast('3D 탐색 프리뷰를 열었습니다. 실제 대규모 터널은 성능 게이트 후 연결됩니다.')};$('#mobileBell').onclick=()=>toast('새 가족 활동 3개');
  bindFallbacks();renderLibrary();family();orbit();setMode('photo');openPhoto(1);show('home');addEventListener('beforeunload',stop);
})();