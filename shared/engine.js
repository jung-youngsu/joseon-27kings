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
    answers: {},          // 씬 인덱스 → { kind: 'option', idx } | { kind: 'free', text }
    wanted: {},           // 노란 점 씬에서 플레이어가 고르려 했던 것 (answers와 같은 모양)
    actsCompleted: [],    // 완료한 막 ID 목록
    lockedScenes: new Set(),  // 선택을 이미 한 씬 (뒤로가기 제한용)
    visitedScenes: new Set()  // 이미 본 씬 (타이핑 스킵용)
  };

  // ─── 엔진 시작 ───────────────────────────────────────────
  function start(scenesData) {
    state.data = scenesData;
    state.currentSceneIdx = 0;
    state.flags = {};
    state.answers = {};
    state.wanted = {};
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
      } else if (d.type === 'narration') {
        // 게임 씬 안의 지문. 말풍선으로 그리면 익명 화자의 대사로 읽힌다.
        html += `<div class="dial-narr">${parseInline(d.text)}</div>`;
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
          ${hasMark(s.choice) && s.choice.markBy ? `
          <div class="ch-markby"><span class="ch-dot"></span>${parseInline(s.choice.markBy)}</div>` : ''}
          <div class="ch-list" id="ch-list">
            ${s.choice.options.map((opt, i) => `
              <button class="ch${s.choice.mark === i ? ' marked' : ''}" data-idx="${i}">${
                s.choice.mark === i ? '<span class="ch-dot" aria-label="노란 점"></span>' : ''
              }${parseInline(opt.text)}</button>
            `).join('')}
          </div>
          ${allowsFree(s.choice) ? `
          <button class="ch ch-free" id="ch-free-open">✎ 다른 길이 있다 — 직접 쓰기</button>
          <div class="free-wrap" id="free-wrap">
            <textarea class="free-input" id="free-input" maxlength="300" rows="3"
              placeholder="당신이라면 어떻게 하겠습니까? 위에 없는 길을 적어 보세요."></textarea>
            <div class="free-actions">
              <button class="btn-p solid" id="free-submit">이 길로 간다 →</button>
            </div>
          </div>` : ''}
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
      el.querySelectorAll('.ch[data-idx]').forEach(btn => {
        btn.onclick = () => handleChoice(s, parseInt(btn.dataset.idx), btn, el);
      });

      bindFreeAnswer(s, el);

      // 이전 선택이 있으면 표시 (해당 버튼만 강조, 나머지는 그대로 클릭 가능)
      const prev = state.answers[state.currentSceneIdx];
      if (wasLocked && prev && prev.kind === 'free') {
        el.querySelector('#ch-free-open')?.classList.add('previously-chosen');
      } else if (wasLocked && previousChoiceIdx !== undefined) {
        const prevBtn = el.querySelectorAll('.ch[data-idx]')[previousChoiceIdx];
        if (prevBtn) prevBtn.classList.add('previously-chosen');
        showStamp(s.choice, previousChoiceIdx, el);
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
      // 노란 점이 찍힌 결재 — 다른 쪽을 고르면 붓이 점으로 되돌아간다
      if (hasMark(scene.choice) && idx !== scene.choice.mark) {
        overrule(scene, { kind: 'option', idx }, opt.overrule, btn, sceneEl);
        return;
      }

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
        // [b]/[em] 같은 인라인 마크업이 그대로 보이지 않게 파싱해서 넣는다
        msgEl.innerHTML = parseInline(opt.feedback || '당신의 선택이 기록되었습니다.') +
          (isStamp(scene.choice, idx) ? `<div class="stamp-note"><span class="ch-dot"></span>${parseInline(scene.choice.stamp)}</div>` : '');
        msgEl.classList.add('on');
      }
      showStamp(scene.choice, idx, sceneEl);

      // flag 기록
      if (scene.choice.flag) {
        state.flags[scene.choice.flag] = idx;
      }
      state.answers[state.currentSceneIdx] = { kind: 'option', idx };
      sceneEl.querySelector('#free-wrap')?.classList.remove('on');

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
      msgEl.innerHTML = parseInline(opt.blockMessage || '다시 생각해보세요.');
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

  // ─── 직접 쓰기 ──────────────────────────────────────────
  // 이 게임의 선택지는 일부러 좁다. 그 왕이 실제로 낸 길은 선택지에 없다.
  // 그 길을 선택지에 넣으면 선택지가 의미를 잃으므로, 대신 플레이어가
  // 선택지 밖의 길을 직접 적을 수 있게 한다. choice.freeText: false 로 끈다.
  function allowsFree(choice) {
    return choice && choice.type === 'reflection' && choice.freeText !== false;
  }

  // ─── 노란 점 ────────────────────────────────────────────
  // 어린 왕(단종)의 결재처럼, 고를 것이 이미 정해져 있는 씬.
  // choice.mark = 점이 찍힌 선택지 번호, choice.markBy = 누가 찍었나.
  // 다른 쪽을 고르거나 직접 써도 기록만 되고(state.wanted), 진행은 점을 따라야 한다.
  function hasMark(choice) {
    return !!choice && Number.isInteger(choice.mark);
  }

  // 거꾸로 — 플레이어가 노란 점을 찍는 쪽인 씬(세조편).
  // choice.stamp = 점이 누구 앞에 놓이는지, opt.stamp: true = 그 갈래를 고르면 점이 찍힌다.
  function isStamp(choice, idx) {
    return !!(choice && choice.stamp && choice.options[idx] && choice.options[idx].stamp);
  }

  function showStamp(choice, idx, sceneEl) {
    if (!choice || !choice.stamp) return;
    sceneEl.querySelectorAll('.ch[data-idx]').forEach(b => {
      b.classList.remove('stamped');
      b.querySelector('.ch-dot.stamp-dot')?.remove();
    });
    if (!isStamp(choice, idx)) return;
    const btn = sceneEl.querySelector(`.ch[data-idx="${idx}"]`);
    if (!btn) return;
    btn.classList.add('stamped');
    btn.insertAdjacentHTML('afterbegin', '<span class="ch-dot stamp-dot" aria-label="당신이 찍은 노란 점"></span>');
  }

  function overrule(scene, wanted, message, btn, sceneEl) {
    state.wanted[state.currentSceneIdx] = wanted;

    sceneEl.querySelectorAll('.ch').forEach(b => b.classList.remove('locked', 'previously-chosen'));
    if (btn) {
      btn.classList.add('overruled', 'wrong-shake');
      setTimeout(() => btn.classList.remove('wrong-shake'), 400);
    }
    const marked = sceneEl.querySelector(`.ch[data-idx="${scene.choice.mark}"]`);
    if (marked) {
      marked.classList.remove('beckon');
      void marked.offsetWidth;  // 애니메이션을 다시 시작
      marked.classList.add('beckon');
    }

    const msgEl = sceneEl.querySelector('#no-answer-msg');
    if (msgEl) {
      const echo = wanted.kind === 'free'
        ? `<div class="free-echo">${escapeHTML(wanted.text).replace(/\n/g, '<br>')}</div>` : '';
      msgEl.innerHTML = echo + parseInline(message || scene.choice.overrule ||
        '붓이 그쪽으로 가지 않습니다.\n[b]노란 점[/b]이 찍힌 곳에 이름을 적어야 합니다.');
      msgEl.classList.add('on');
    }
    sceneEl.querySelector('#no-answer-nav')?.classList.remove('on');
  }

  function bindFreeAnswer(scene, sceneEl) {
    const openBtn = sceneEl.querySelector('#ch-free-open');
    const wrap = sceneEl.querySelector('#free-wrap');
    const input = sceneEl.querySelector('#free-input');
    const submit = sceneEl.querySelector('#free-submit');
    if (!openBtn || !wrap || !input || !submit) return;

    const prev = state.answers[state.currentSceneIdx];
    if (prev && prev.kind === 'free') input.value = prev.text;

    openBtn.onclick = () => {
      wrap.classList.add('on');
      input.focus();
    };
    submit.onclick = () => {
      const text = input.value.trim();
      if (!text) { input.focus(); return; }

      if (hasMark(scene.choice)) {
        wrap.classList.remove('on');
        overrule(scene, { kind: 'free', text }, scene.choice.freeFeedback, openBtn, sceneEl);
        return;
      }

      state.lockedScenes.add(state.currentSceneIdx);
      state.answers[state.currentSceneIdx] = { kind: 'free', text };
      if (scene.choice.flag) state.flags[scene.choice.flag] = 'free';

      sceneEl.querySelectorAll('.ch').forEach(b => b.classList.remove('locked', 'previously-chosen'));
      openBtn.classList.add('locked');
      wrap.classList.remove('on');
      showStamp(scene.choice, -1, sceneEl);

      const msgEl = sceneEl.querySelector('#no-answer-msg');
      if (msgEl) {
        msgEl.innerHTML =
          `<div class="free-echo">${escapeHTML(text).replace(/\n/g, '<br>')}</div>` +
          parseInline(scene.choice.freeFeedback ||
            '당신이 낸 길을 적어 두었습니다.\n이제 [b]그가 실제로 걸은 길[/b]과 견주어 보세요.');
        msgEl.classList.add('on');
      }

      const navEl = sceneEl.querySelector('#no-answer-nav');
      if (navEl) navEl.classList.add('on');
      const nextBtn = sceneEl.querySelector('#ch-next');
      if (nextBtn) {
        nextBtn.textContent = getNextLabel();
        nextBtn.onclick = nextScene;
      }
    };
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
        answers: summarizeAnswers().map(a => ({ act: a.act, question: a.question, answer: a.answerText, free: a.free, wanted: a.wantedText || undefined })),
        actsCompleted: state.actsCompleted,
        timestamp: Date.now()
      }, '*');
    } catch (e) {
      console.warn('postMessage failed', e);
    }

    // 최종 화면 — 플레이어가 막마다 고른 길을 한 장으로 돌려준다
    const rows = summarizeAnswers();
    const list = rows.map(r => `
      <li class="mychoice">
        ${r.act ? `<div class="mychoice-act">${escapeHTML(r.act)}</div>` : ''}
        <div class="mychoice-q">${parseInline(r.question)}</div>
        ${r.wantedHTML ? `
        <div class="mychoice-a wanted">
          <span class="mychoice-mark">당신이 고르고 싶었던 것</span>
          <span class="mychoice-struck">${r.wantedHTML}</span>
        </div>` : ''}
        <div class="mychoice-a${r.free ? ' free' : ''}">
          ${r.free ? '<span class="mychoice-mark">✎ 직접 쓴 길</span>' : ''}
          ${r.stamped ? '<span class="mychoice-mark"><span class="ch-dot"></span>당신이 노란 점을 찍은 것</span>' : ''}
          ${r.marked ? `<span class="mychoice-mark"><span class="ch-dot"></span>${r.wantedHTML ? '실제로 결재한 것' : '노란 점을 그대로 따랐습니다'}</span>` : ''}
          ${r.answerHTML}
        </div>
        ${r.history ? `<div class="mychoice-h">깊게 살펴보기 「${parseInline(r.history)}」</div>` : ''}
      </li>`).join('');
    const freeCount = rows.filter(r => r.free).length;
    const markedCount = rows.filter(r => r.marked).length;
    const wantedCount = rows.filter(r => r.wantedHTML).length;
    const stampCount = rows.filter(r => r.stamped).length;
    const stampTotal = rows.filter(r => r.stampable).length;

    // episode.html 안에서 돌 때만 심화 탭으로 넘겨줄 수 있다
    const framed = window.parent && window.parent !== window;

    const root = document.getElementById('game-root');
    root.innerHTML = `
      <div class="sc on">
        ${headerNav()}
        <div class="epi-body mychoice-body">
          <div class="epi-year">${escapeHTML(state.data.title || '')}</div>
          <div class="epi-big">당신의 선택은 이러했습니다</div>
          ${rows.length ? `<ol class="mychoice-list">${list}</ol>` : ''}
          ${freeCount ? `<div class="epi-text">${rows.length}번의 갈림길 가운데 ${freeCount}번, 당신은 주어진 선택지 밖에서 길을 찾았습니다.</div>` : ''}
          ${markedCount ? `<div class="epi-text">${markedCount}번의 결재에서, 붓은 언제나 노란 점을 따라갔습니다.${
            wantedCount ? `<br>당신은 그중 ${wantedCount}번, 다른 길을 원했습니다.` : ''}</div>` : ''}
          ${stampTotal ? `<div class="epi-text">${stampCount
            ? parseInline((state.data.stampLine || '{n}번, 당신의 뜻이 [b]남의 붓 앞에 노란 점으로[/b] 놓였습니다.').replace('{n}', stampCount))
            : parseInline(state.data.noStampLine || '당신은 한 번도 노란 점을 찍지 않았습니다.')}</div>` : ''}
          ${framed ? `
          <div class="epi-next">
            <div class="epi-next-lead">게임은 여기까지입니다.<br>게임이 일부러 비워 둔 이야기가 심화에 있습니다.</div>
            <button class="btn-p solid" id="go-study">심화 읽으러 가기 →</button>
          </div>` : ''}
          <div class="nav-area" style="justify-content:center;margin-top:${framed ? 10 : 24}px;">
            <button class="btn-p" onclick="GameEngine.restart()">↺ 처음부터 다시</button>
          </div>
        </div>
      </div>
    `;
    const goStudy = document.getElementById('go-study');
    if (goStudy) goStudy.onclick = () => {
      try { window.parent.postMessage({ type: 'goto-tab', tab: 'study' }, '*'); } catch (e) {}
    };
    window.scrollTo(0, 0);
  }

  // 막마다 [질문 · 내 답 · 그 막의 깊게 살펴보기 제목]을 모은다.
  function summarizeAnswers() {
    const scenes = state.data.scenes;
    const rows = [];
    scenes.forEach((s, i) => {
      if (s.type !== 'game' || !s.choice) return;
      const a = state.answers[i];
      const deep = scenes.slice(i + 1).find(x => x.type === 'deep' || x.type === 'game');
      const row = {
        act: (s.progLabel || '').trim(),
        question: s.choice.label || '',
        history: deep && deep.type === 'deep' ? deep.title : '',
        free: !!(a && a.kind === 'free'),
        marked: hasMark(s.choice),
        stamped: !!(a && a.kind === 'option' && isStamp(s.choice, a.idx)),
        stampable: !!(s.choice.stamp),
        wantedHTML: '',
        wantedText: '',
      };
      const w = state.wanted[i];
      if (row.marked && w) {
        if (w.kind === 'free') {
          row.wantedText = w.text;
          row.wantedHTML = escapeHTML(w.text).replace(/\n/g, '<br>');
        } else {
          const wo = s.choice.options[w.idx] || {};
          row.wantedText = String(wo.text || '').replace(/\[\/?[a-z]+\]/g, '');
          row.wantedHTML = parseInline(wo.text || '');
        }
      }
      if (!a) {
        row.answerText = '';
        row.answerHTML = '<span class="mychoice-none">고르지 않고 지나갔습니다</span>';
      } else if (a.kind === 'free') {
        row.answerText = a.text;
        row.answerHTML = escapeHTML(a.text).replace(/\n/g, '<br>');
      } else {
        const opt = s.choice.options[a.idx] || {};
        row.answerText = String(opt.text || '').replace(/\[\/?[a-z]+\]/g, '');
        row.answerHTML = parseInline(opt.text || '');
      }
      rows.push(row);
    });
    return rows;
  }

  function restart() {
    state.currentSceneIdx = 0;
    state.flags = {};
    state.answers = {};
    state.wanted = {};
    state.actsCompleted = [];
    state.lockedScenes = new Set();
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

  // ─── 헤더 네비 (점3개 메뉴 — 평상시 숨김, 호버 시 확장) ─────
  // 구석(우상단)에 점3개 + 현재 위치 라벨만 둔다.
  // 호버/포커스하면 홈·시리즈 링크가 아래로 펼쳐진다.
  function headerNav() {
    // episode.html 등 프레임(iframe) 안에서 실행되면 프레임이 자체 메뉴를
    // 제공하므로 게임 내부 메뉴는 숨긴다(중복 방지). 단독으로 game.html을
    // 직접 열었을 때만 점3개 메뉴를 그린다.
    try { if (window.self !== window.top) return ''; } catch (e) { return ''; }
    const ep = state.data.ep || '';
    const epLabel = 'EP' + (ep < 10 ? '0' + ep : ep);
    const scene = state.data.scenes[state.currentSceneIdx];
    const here = (scene && scene.progLabel) ? scene.progLabel : '';
    return `
      <div class="top-nav">
        <div class="nav-kebab" tabindex="0" role="button" aria-haspopup="true"
             aria-label="메뉴 열기${here ? ' · 현재 ' + escapeHTML(here) : ''}">
          <div class="nav-kebab-head">
            <span class="kebab-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            ${here ? `<span class="nav-here">${escapeHTML(here)}</span>` : ''}
          </div>
          <div class="nav-menu" role="menu">
            <span class="nav-menu-ep">${escapeHTML(epLabel)}</span>
            <a href="../../index.html" target="_top" role="menuitem">← 홈으로</a>
            <a href="../../joseon-kings.html" target="_top" role="menuitem">시리즈 목록 →</a>
          </div>
        </div>
      </div>
    `;
  }

  function progressBar() {
    const canGoBack = canGoBackFromHere();
    // 현재 위치 라벨은 점3개 메뉴(headerNav) 옆으로 옮겼다.
    return `
      <div class="prog">
        ${canGoBack ? '<button class="prog-back" id="prog-back" title="이전 화면으로">↶</button>' : '<span class="prog-back-spacer"></span>'}
        <div class="prog-bar">
          <div class="prog-fill" style="width:0%;"></div>
        </div>
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
      // 줄바꿈을 품은 태그도 처리 — (.+?)는 개행을 못 먹어서
      // 태그가 화면에 그대로 노출되던 문제가 있었다.
      .replace(/\[b\]([\s\S]+?)\[\/b\]/g,   '<strong>$1</strong>')
      .replace(/\[i\]([\s\S]+?)\[\/i\]/g,   '<em>$1</em>')
      .replace(/\[em\]([\s\S]+?)\[\/em\]/g, '<em>$1</em>')
      .replace(/\*\*(.+?)\*\*/g,        '<strong>$1</strong>')
      .replace(/\*([^*\n]+?)\*/g,       '<em>$1</em>')
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
