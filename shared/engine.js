/* ═══════════════════════════════════════════════════════════════
   shared/engine.js
   조선 27왕 시리즈 — 게임 엔진

   역할:
   - scenes.json 데이터를 받아 게임을 화면에 그림
   - 씬 간 전환, 선택지 처리, 진행률 계산
   - 게임 종료 시 부모(episode.html)에게 신호 전송

   사용법:
   1. HTML에 빈 div 하나만 두면 됨: <div id="game-root"></div>
   2. window.GameEngine.start(scenesData) 호출
   3. 끝나면 자동으로 부모 프레임에 'game-complete' 메시지 발송
═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ─── 상태 ────────────────────────────────────────────────
  const state = {
    data: null,           // scenes.json 전체
    currentSceneIdx: 0,   // 현재 씬 인덱스
    flags: {},            // 학생의 선택 기록
    actsCompleted: [],    // 완료한 막 ID 목록
    lockedScenes: new Set(),  // 선택을 이미 한 씬 (뒤로가기 제한용)
    visitedScenes: new Set()  // 이미 본 씬 (타이핑 스킵용)
  };

  // ─── 엔진 시작 ───────────────────────────────────────────
  function start(scenesData) {
    state.data = scenesData;
    state.currentSceneIdx = 0;
    state.flags = {};
    state.actsCompleted = [];
    state.lockedScenes = new Set();
    state.visitedScenes = new Set();
    renderScene();
  }

  // ─── 현재 씬 렌더링 ─────────────────────────────────────
  function renderScene() {
    const scene = state.data.scenes[state.currentSceneIdx];
    if (!scene) {
      finish();
      return;
    }

    const root = document.getElementById('game-root');
    if (!root) {
      console.error('GameEngine: #game-root not found');
      return;
    }

    // 모든 씬은 .sc 클래스로
    root.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'sc';

    // 씬 타입별 처리
    switch (scene.type) {
      case 'opening':    renderOpening(el, scene);    break;
      case 'narration':  renderNarration(el, scene);  break;
      case 'context':    renderContext(el, scene);    break;
      case 'game':       renderGame(el, scene);       break;
      case 'deep':       renderDeep(el, scene);       break;
      case 'epilogue':   renderEpilogue(el, scene);   break;
      default:
        el.innerHTML = `<div style="padding:20px;color:#f80;">알 수 없는 씬 타입: ${scene.type}</div>`;
    }

    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));

    // 진행바 업데이트
    updateProgress();

    // 뒤로가기 버튼 이벤트
    const backBtn = el.querySelector('#prog-back');
    if (backBtn) backBtn.onclick = goBack;

    // 이 씬을 방문 목록에 추가
    state.visitedScenes.add(state.currentSceneIdx);

    // 스크롤 맨 위로
    window.scrollTo(0, 0);
  }

  // ─── 씬 타입별 렌더 ────────────────────────────────────────

  function renderOpening(el, s) {
    const linesHTML = (s.lines || []).map((l, i) =>
      `<div class="op-line-stacked" data-i="${i}">${parseInline(l)}</div>`
    ).join('');

    // s.portal: true 면 glyph 자리에 회전 포탈 (EP1 환생씬 흡수용)
    const glyphOrPortalHTML = s.portal
      ? `<div class="op-portal-wrap fade-target" data-step="1">
           <div class="op-portal">
             <div class="op-portal-ring-out"></div>
             <div class="op-portal-ring-mid"></div>
             ${s.glyph ? `<div class="op-glyph-in-portal">${escapeHTML(s.glyph)}</div>` : ''}
           </div>
         </div>`
      : (s.glyph ? `<div class="op-glyph fade-target" data-step="1">${escapeHTML(s.glyph)}</div>` : '');

    el.innerHTML = `
      <div class="opening">
        ${s.question ? `<div class="op-question fade-target" data-step="0">${escapeHTML(s.question)}</div>` : ''}
        ${glyphOrPortalHTML}
        ${s.series ? `<div class="op-series fade-target" data-step="2">${escapeHTML(s.series)}</div>` : ''}
        ${linesHTML ? `<div class="op-lines">${linesHTML}</div>` : ''}
        <button class="btn-p solid op-start fade-target" data-step="9" id="op-next">시작 →</button>
      </div>
    `;

    // 순차 등장
    const targets = el.querySelectorAll('.fade-target');
    targets.forEach(t => {
      const step = parseInt(t.dataset.step);
      setTimeout(() => t.classList.add('on'), 200 + step * 600);
    });
    const linesEls = el.querySelectorAll('.op-line-stacked');
    linesEls.forEach((line, i) => {
      // glyph/question/series 다음에 lines가 한 줄씩
      setTimeout(() => line.classList.add('on'), 200 + (3 + i) * 600);
    });
    // 시작 버튼은 lines 다 끝난 다음
    const startBtn = el.querySelector('.op-start');
    if (startBtn) {
      const totalLines = linesEls.length;
      setTimeout(() => startBtn.classList.add('on'), 200 + (3 + totalLines + 1) * 600);
    }

    if (startBtn) startBtn.onclick = nextScene;
  }

  function renderNarration(el, s) {
    // s.svg: raw SVG 문자열을 본문 위 아트워크로 삽입 (EP1 5막 실루엣용)
    el.innerHTML = `
      ${headerNav()}
      ${progressBar()}
      ${s.svg ? `<div class="narr-art">${s.svg}</div>` : ''}
      <div class="narr-body">
        ${s.era ? `<div class="narr-era">${escapeHTML(s.era)}</div>` : ''}
        <div class="narr-text" id="narr-target"></div>
      </div>
      <div class="nav-area" id="narr-nav" style="display:none;">
        <button class="btn-p solid" id="narr-next">${getNextLabel()}</button>
      </div>
    `;
    el.querySelector('#narr-next').onclick = nextScene;

    const target = el.querySelector('#narr-target');
    const navEl = el.querySelector('#narr-nav');

    // 이미 본 씬이면 타이핑 스킵 — 즉시 전체 표시
    if (state.visitedScenes.has(state.currentSceneIdx)) {
      target.innerHTML = parseInline(s.text || '');
      navEl.style.display = '';
      navEl.classList.add('fade-target', 'on');
      return;
    }

    // 처음 보는 씬 — 타이핑 효과
    typeText(target, s.text || '', () => {
      navEl.style.display = '';
      navEl.classList.add('fade-target', 'on');
    });
  }

  // 타이핑 효과 (이성계편 방식)
  let typingTimers = [];
  let typingToken = 0;
  const TYPE_SPEED = 44;

  function typeText(el, rawText, onDone) {
    typingTimers.forEach(clearTimeout);
    typingTimers = [];
    typingToken++;
    const myToken = typingToken;

    // 인라인 마크업 미리 파싱 (그대로 두고 글자만 진행)
    // 단순화: 한 글자씩 보여주되, [em]...[/em] 같은 태그는 즉시 처리
    // 구현: parseInline 결과를 받고, HTML 그대로 저장한 다음 visible characters를 키움
    const parsed = parseInline(rawText);
    el.innerHTML = '';

    // HTML 태그를 보호하면서 텍스트만 한 글자씩 노출
    // 간단한 방식: 원본을 character 단위로 쪼개되 HTML 태그는 한 묶음으로
    const tokens = tokenizeForTyping(parsed);
    let i = 0;
    let html = '';

    function tick() {
      if (myToken !== typingToken) return;
      if (i >= tokens.length) {
        el.innerHTML = html.replace(/<span class="cursor"><\/span>$/, '');
        if (onDone) setTimeout(() => { if (myToken === typingToken) onDone(); }, 300);
        return;
      }
      const tok = tokens[i];
      // 커서 제거 후 추가
      html = html.replace(/<span class="cursor"><\/span>$/, '');
      html += tok + '<span class="cursor"></span>';
      el.innerHTML = html;
      i++;

      // 다음 글자 딜레이 결정
      let delay = TYPE_SPEED;
      const lastChar = tok.length === 1 ? tok : '';
      if (lastChar === '\n' || tok === '<br>') delay = TYPE_SPEED * 5;
      else if (lastChar === '.' || lastChar === '?' || lastChar === '!') delay = TYPE_SPEED * 4;
      else if (lastChar === ',') delay = TYPE_SPEED * 2;

      typingTimers.push(setTimeout(tick, delay));
    }
    tick();
  }

  // HTML 문자열을 타이핑용 토큰으로 쪼개기
  // <태그>는 한 묶음, 일반 글자는 하나씩
  function tokenizeForTyping(html) {
    const tokens = [];
    let i = 0;
    while (i < html.length) {
      if (html[i] === '<') {
        // 태그 끝까지 한 묶음
        const end = html.indexOf('>', i);
        if (end === -1) { tokens.push(html[i]); i++; }
        else { tokens.push(html.substring(i, end + 1)); i = end + 1; }
      } else if (html[i] === '&') {
        // HTML 엔티티 (&amp; 등)
        const end = html.indexOf(';', i);
        if (end === -1 || end - i > 6) { tokens.push(html[i]); i++; }
        else { tokens.push(html.substring(i, end + 1)); i = end + 1; }
      } else {
        tokens.push(html[i]);
        i++;
      }
    }
    return tokens;
  }

  function renderContext(el, s) {
    el.innerHTML = `
      ${headerNav()}
      ${progressBar()}
      <div class="context-body">
        ${s.year ? `<div class="ctx-year">${escapeHTML(s.year)}</div>` : ''}
        ${s.title ? `<div class="ctx-title">${escapeHTML(s.title)}</div>` : ''}
        ${s.body ? `<div class="ctx-body">${parseInline(s.body)}</div>` : ''}
      </div>
      <div class="nav-area">
        <button class="btn-p solid" id="ctx-next">${getNextLabel()}</button>
      </div>
    `;
    el.querySelector('#ctx-next').onclick = nextScene;
  }

  function renderGame(el, s) {
    let html = `
      ${headerNav()}
      ${progressBar()}
      <div class="game-body">
        <div class="dial-wrap">
    `;

    // 대사 목록
    (s.dialogues || []).forEach(d => {
      if (d.type === 'inner') {
        html += `<div class="inner-voice">${parseInline(d.text)}</div>`;
      } else {
        const cls = d.role || 'npc-a';
        html += `
          <div class="dial ${cls}">
            ${d.who ? `<div class="dial-who">${escapeHTML(d.who)}</div>` : ''}
            <div class="dial-text">${parseInline(d.text)}</div>
          </div>
        `;
      }
    });

    html += `</div>`;

    // 선택지
    if (s.choice) {
      html += `
        <div class="ch-area">
          <div class="ch-label">${parseInline(s.choice.label || '')}</div>
          <div class="ch-list" id="ch-list">
            ${s.choice.options.map((opt, i) => `
              <button class="ch" data-idx="${i}">${parseInline(opt.text)}</button>
            `).join('')}
          </div>
          <div class="block-msg" id="block-msg"></div>
          <div class="no-answer-msg" id="no-answer-msg"></div>
          <div class="no-answer-nav" id="no-answer-nav">
            <button class="btn-p solid" id="ch-next">${getNextLabel()}</button>
          </div>
        </div>
      `;
    }

    html += `</div>`;
    el.innerHTML = html;

    // 이미 선택한 씬으로 돌아온 경우 — 이전 선택을 표시하되 다시 선택 가능
    const wasLocked = state.lockedScenes.has(state.currentSceneIdx);
    const previousChoiceIdx = (s.choice && s.choice.flag) ? state.flags[s.choice.flag] : undefined;

    if (s.choice) {
      // 선택지 클릭 가능하게 바인딩
      el.querySelectorAll('.ch').forEach(btn => {
        btn.onclick = () => handleChoice(s, parseInt(btn.dataset.idx), btn, el);
      });

      // 이전 선택이 있으면 표시 (해당 버튼만 강조, 나머지는 그대로 클릭 가능)
      if (wasLocked && previousChoiceIdx !== undefined) {
        const prevBtn = el.querySelectorAll('.ch')[previousChoiceIdx];
        if (prevBtn) prevBtn.classList.add('previously-chosen');
      }
    } else {
      // 선택지 없는 게임 씬 — 자동 다음
      const navArea = document.createElement('div');
      navArea.className = 'nav-area';
      navArea.innerHTML = `<button class="btn-p solid" id="game-next">${getNextLabel()}</button>`;
      el.appendChild(navArea);
      el.querySelector('#game-next').onclick = nextScene;
    }
  }

  function renderDeep(el, s) {
    el.innerHTML = `
      ${headerNav()}
      ${progressBar()}
      <div class="deep-body">
        ${s.tag ? `<div class="deep-tag">${escapeHTML(s.tag)}</div>` : ''}
        ${s.title ? `<div class="deep-title">${parseInline(s.title)}</div>` : ''}
        ${s.text ? `<div class="deep-text">${parseInline(s.text)}</div>` : ''}
        ${s.quote ? `<div class="deep-quote">${parseInline(s.quote)}</div>` : ''}
      </div>
      <div class="nav-area">
        <button class="btn-p solid" id="deep-next">${getNextLabel()}</button>
      </div>
    `;
    el.querySelector('#deep-next').onclick = () => {
      // 막 완료 기록
      if (s.actId) state.actsCompleted.push(s.actId);
      nextScene();
    };
  }

  function renderEpilogue(el, s) {
    el.innerHTML = `
      ${headerNav()}
      ${progressBar()}
      <div class="epi-body">
        ${s.year ? `<div class="epi-year">${escapeHTML(s.year)}</div>` : ''}
        ${s.title ? `<div class="epi-big">${parseInline(s.title)}</div>` : ''}
        ${(s.paragraphs || []).map(p => `<div class="epi-text">${parseInline(p)}</div>`).join('')}
        ${s.quote ? `<div class="epi-quote">${parseInline(s.quote)}</div>` : ''}
      </div>
      <div class="nav-area">
        <button class="btn-p solid" id="epi-next">완료 →</button>
      </div>
    `;
    el.querySelector('#epi-next').onclick = finish;
  }

  // ─── 선택지 처리 ────────────────────────────────────────
  function handleChoice(scene, idx, btn, sceneEl) {
    const opt = scene.choice.options[idx];

    // "정답 없음" 모드 — 어떤 선택이든 코멘트 보여주고 진행
    if (scene.choice.type === 'reflection') {
      // 이 씬은 선택했음 (뒤로 와도 표시되도록)
      state.lockedScenes.add(state.currentSceneIdx);

      // 다른 버튼 잠금은 안 함 (자유 탐색) — 다만 이전 강조 제거하고 새 강조
      sceneEl.querySelectorAll('.ch').forEach(b => {
        b.classList.remove('locked', 'previously-chosen');
      });
      btn.classList.add('locked');

      // 선택의 결과 메시지
      const msgEl = sceneEl.querySelector('#no-answer-msg');
      if (msgEl) {
        msgEl.textContent = opt.feedback || '당신의 선택이 기록되었습니다.';
        msgEl.classList.add('on');
      }

      // flag 기록
      if (scene.choice.flag) {
        state.flags[scene.choice.flag] = idx;
      }

      // 다음 버튼 표시 (라벨 동적)
      const navEl = sceneEl.querySelector('#no-answer-nav');
      if (navEl) navEl.classList.add('on');

      const nextBtn = sceneEl.querySelector('#ch-next');
      if (nextBtn) {
        nextBtn.textContent = getNextLabel();
        nextBtn.onclick = () => {
          if (opt.jumpTo !== undefined) {
            jumpToScene(opt.jumpTo);
          } else {
            nextScene();
          }
        };
      }
      return;
    }

    // "정답 있음" 모드 — 오답이면 흔들기
    if (opt.correct === false) {
      btn.classList.add('wrong-shake');
      setTimeout(() => btn.classList.remove('wrong-shake'), 400);

      const msgEl = sceneEl.querySelector('#block-msg');
      msgEl.textContent = opt.blockMessage || '다시 생각해보세요.';
      msgEl.classList.add('on');
      return;
    }

    // 정답 처리
    state.lockedScenes.add(state.currentSceneIdx);

    // 다른 버튼 잠금 안 함 - 다시 시도 가능. 다만 이전 강조 정리.
    sceneEl.querySelectorAll('.ch').forEach(b => {
      b.classList.remove('locked', 'previously-chosen');
    });
    btn.classList.add('locked');

    // block-msg 숨기기
    const blockMsg = sceneEl.querySelector('#block-msg');
    if (blockMsg) blockMsg.classList.remove('on');

    if (scene.choice.flag) {
      state.flags[scene.choice.flag] = idx;
    }

    // 점프가 있으면 (분기 입구 같은 곳)
    if (opt.jumpTo !== undefined) {
      let navEl = sceneEl.querySelector('#no-answer-nav');
      if (!navEl) {
        const chArea = sceneEl.querySelector('.ch-area');
        if (chArea) {
          const newNav = document.createElement('div');
          newNav.className = 'no-answer-nav on';
          newNav.id = 'no-answer-nav';
          newNav.innerHTML = `<button class="btn-p solid" id="ch-next">다음 →</button>`;
          chArea.appendChild(newNav);
        }
      } else {
        navEl.classList.add('on');
      }
      const nextBtn = sceneEl.querySelector('#ch-next');
      if (nextBtn) nextBtn.onclick = () => jumpToScene(opt.jumpTo);
      return;
    }

    // 정답 후 — 다음 버튼 표시 (라벨 동적)
    let navEl = sceneEl.querySelector('#no-answer-nav');
    if (!navEl) {
      // 정답 모드에선 원래 nav 영역이 없으니 추가
      const chArea = sceneEl.querySelector('.ch-area');
      if (chArea) {
        const newNav = document.createElement('div');
        newNav.className = 'no-answer-nav on';
        newNav.id = 'no-answer-nav';
        newNav.innerHTML = `<button class="btn-p solid" id="ch-next">${getNextLabel()}</button>`;
        chArea.appendChild(newNav);
      }
    } else {
      navEl.classList.add('on');
      const existingBtn = navEl.querySelector('#ch-next');
      if (existingBtn) existingBtn.textContent = getNextLabel();
    }

    const nextBtn = sceneEl.querySelector('#ch-next');
    if (nextBtn) {
      nextBtn.onclick = () => nextScene();
    }
  }

  // ─── 씬 이동 ────────────────────────────────────────────
  function nextScene() {
    state.currentSceneIdx++;
    renderScene();
  }

  function jumpToScene(idx) {
    state.currentSceneIdx = idx;
    renderScene();
  }

  // ─── 게임 종료 ──────────────────────────────────────────
  function finish() {
    // 부모 프레임(episode.html)에 종료 신호
    try {
      window.parent.postMessage({
        type: 'game-complete',
        ep: state.data.ep,
        flags: state.flags,
        actsCompleted: state.actsCompleted,
        timestamp: Date.now()
      }, '*');
    } catch (e) {
      console.warn('postMessage failed', e);
    }

    // 최종 화면
    const root = document.getElementById('game-root');
    root.innerHTML = `
      <div class="sc on">
        ${headerNav()}
        <div class="epi-body" style="text-align:center;padding-top:80px;">
          <div class="epi-big">완료</div>
          <div class="epi-text">${escapeHTML(state.data.title || '에피소드')}를 마쳤습니다.</div>
          <div class="nav-area" style="justify-content:center;margin-top:32px;">
            <button class="btn-p solid" onclick="GameEngine.restart()">다시 보기</button>
          </div>
        </div>
      </div>
    `;
  }

  function restart() {
    state.currentSceneIdx = 0;
    state.flags = {};
    state.actsCompleted = [];
    renderScene();
  }

  // ─── 진행바 ─────────────────────────────────────────────
  function updateProgress() {
    const fill = document.querySelector('.prog-fill');
    if (!fill) return;
    const total = state.data.scenes.length;
    const cur = state.currentSceneIdx + 1;
    fill.style.width = (cur / total * 100) + '%';
  }

  // ─── 헤더 네비 (홈/시리즈 링크) ───────────────────────────
  function headerNav() {
    const ep = state.data.ep || '';
    const title = state.data.title || '';
    return `
      <div class="top-nav">
        <a href="../../index.html" target="_top">← 홈</a>
        <span class="ep-label">${escapeHTML('EP' + (ep < 10 ? '0' + ep : ep))}</span>
        <a href="../../joseon-kings.html" target="_top">시리즈로 →</a>
      </div>
    `;
  }

  function progressBar() {
    const scene = state.data.scenes[state.currentSceneIdx];
    const label = scene.progLabel || '';
    const canGoBack = canGoBackFromHere();
    return `
      <div class="prog">
        ${canGoBack ? '<button class="prog-back" id="prog-back" title="이전 화면으로">↶</button>' : '<span class="prog-back-spacer"></span>'}
        <div class="prog-bar">
          <div class="prog-fill" style="width:0%;"></div>
        </div>
        <span class="prog-lbl">${escapeHTML(label)}</span>
      </div>
    `;
  }

  // 지금 위치에서 뒤로갈 수 있는가
  function canGoBackFromHere() {
    return state.currentSceneIdx > 0;
  }

  function goBack() {
    if (!canGoBackFromHere()) return;
    state.currentSceneIdx--;
    renderScene();
  }

  // 다음 씬의 타입에 따라 버튼 라벨 결정
  // 학생이 무엇을 보러 가는지 알 수 있게 해야 함
  function getNextLabel() {
    const next = state.data.scenes[state.currentSceneIdx + 1];
    if (!next) return '완료 →';
    switch (next.type) {
      case 'narration':
        // 다음이 나레이션이면 — 새 막의 시작
        return '다음 막 →';
      case 'context':
        return '시대 상황 보기 →';
      case 'game':
        return '게임 시작 →';
      case 'deep':
        return '깊게 살펴보기 →';
      case 'epilogue':
        return '에필로그 →';
      default:
        return '다음 →';
    }
  }

  // ─── 인라인 마크업 파서 ──────────────────────────────────
  // [b]진하게[/b], [i]기울임[/i], [em]강조[/em],
  // 또는 *진하게* (마크다운 호환)
  function parseInline(text) {
    if (!text) return '';
    return escapeHTML(text)
      .replace(/\[b\](.+?)\[\/b\]/g,   '<strong>$1</strong>')
      .replace(/\[i\](.+?)\[\/i\]/g,   '<em>$1</em>')
      .replace(/\[em\](.+?)\[\/em\]/g, '<em>$1</em>')
      .replace(/\*\*(.+?)\*\*/g,        '<strong>$1</strong>')
      .replace(/__(.+?)__/g,            '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function escapeHTML(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ─── 외부 노출 ──────────────────────────────────────────
  window.GameEngine = {
    start: start,
    restart: restart,
    getState: () => ({ ...state }) // 디버그용
  };

})();
