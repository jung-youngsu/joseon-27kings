#!/usr/bin/env node
/**
 * scenes.json 집필 규범 점검 — EDITORIAL.md 5장의 자동 점검.
 *
 *   node tools/check_scenes.js                        # 전 편
 *   node tools/check_scenes.js kings/ep01_taejo/scenes.json
 *
 * 잡는 것: 마크업 짝·미지원 태그, 진행바 메타 문구, role 오용,
 *          선택지 대비 deep 해설 누락, 막 간 문장 복제, 문체 혼재.
 */
const fs = require('fs');
const path = require('path');

const TAGS = ['b', 'i', 'em'];
// narration은 1인칭 현재 평어가 규범 — 문체 검사에서 제외한다.
const PLAIN_OK = new Set(['narration']);
const PLAIN_RE  = /(?:했다|했었다|되었다|됐다|이었다|였다|않았다|들었다|많았다|같았다)\./;
const POLITE_RE = /(?:습니다|입니다|합니다|됩니다|씁니다)[.?!]/;
// 진행바는 장면의 좌표(연도·주제어)만 보여 준다. 내용을 해설하면 몰입이 끊긴다.
const META_LABEL_RE = /정답\s*없음|정답|해설|참고|주의|스포|결론|요약/;

function walk(node, p, out) {
  if (typeof node === 'string') out.push([p, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${p}[${i}]`, out));
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) walk(v, `${p}.${k}`, out);
}

// 문장을 비교용 열쇠로 바꾼다. 마크업·강조기호·구두점·공백을 모두 떼어내
// 내용만 남긴다. "그때 자기는 — 아버지의 얼굴을 원했었다." 와
// "그때 자기는 [em]아버지의 얼굴[/em]을 원했었다." 는 같은 문장이다.
function key(s) {
  return s.replace(/\[\/?[a-z]+\]/g, '')
    .replace(/[^0-9A-Za-zㄱ-ㆎ가-힣]/g, '');
}

const SHOWN = new Map();   // 열쇠 → 사람이 읽을 원문

function sentences(s) {
  const out = [];
  // 태그를 먼저 떼고 나눈다. "…알지 못한다.[/b] 그러나" 처럼 마침표 뒤에
  // 태그가 붙어 있으면 문장이 쪼개지지 않아 중복을 놓친다.
  const flat = String(s || '').replace(/\[\/?[a-z]+\]/g, '');
  for (const raw of flat.split(/(?<=[.?!])\s+|\n/)) {
    const k = key(raw);
    if (k.length < 12) continue;
    if (!SHOWN.has(k)) SHOWN.set(k, raw.trim());
    out.push(k);
  }
  return out;
}

const shown = k => SHOWN.get(k) || k;

function check(file) {
  const msgs = [];
  const warn = m => msgs.push(['경고', m]);
  const err  = m => msgs.push(['오류', m]);

  let d;
  try { d = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return [['오류', `JSON 파싱 실패 — ${e.message}`]]; }

  const scenes = d.scenes || [];
  const style = { plain: [], polite: [] };
  // 'king' 말풍선은 플레이어 자신의 목소리다. 편마다 주인공이 다르다.
  const hero = [d.personalName, d.korName].filter(Boolean);
  const isHero = who => /왕|전하|임금|주상/.test(who) || hero.some(h => who.includes(h));

  // ── 마크업 ────────────────────────────────────────────────
  const strs = [];
  walk(d, '', strs);
  for (const [p, s] of strs) {
    for (const t of TAGS) {
      const o = s.split('[' + t + ']').length - 1;
      const c = s.split('[/' + t + ']').length - 1;
      if (o !== c) err(`[${t}] 짝 불일치 (열림 ${o} / 닫힘 ${c}) — ${p}`);
    }
    for (const m of s.matchAll(/\[\/?([a-zA-Z]+)\]/g))
      if (!TAGS.includes(m[1])) err(`미지원 태그 [${m[1]}] — ${p}  (허용: [b] [i] [em])`);
  }

  scenes.forEach((s, i) => {
    const at = `scenes[${i}] ${s.type}`;

    // ── 진행바 메타 문구 ────────────────────────────────────
    for (const k of ['progLabel', 'era'])
      if (s[k] && META_LABEL_RE.test(s[k]))
        warn(`${k}에 메타 문구: "${s[k]}" — ${at}  `
          + `(연도나 막의 주제어는 괜찮지만, 해설하는 말은 몰입을 끊습니다)`);

    // ── 한 장면에서 두 사람이 같은 말풍선을 쓰는가 ───────────
    //   다른 장면의 단역들이 색을 공유하는 것은 문제가 아니다.
    //   한 대화 안에서 겹칠 때만 화자를 구별할 수 없다.
    {
      const byRole = new Map();
      for (const dl of s.dialogues || []) {
        if (dl.type !== 'dial' || !dl.who || !dl.role) continue;
        if (!byRole.has(dl.role)) byRole.set(dl.role, new Set());
        // "아이 1 / 아이 2 / 아이 3" 같은 군중은 한 목소리다 — 같은 색이 맞다.
        byRole.get(dl.role).add(dl.who.replace(/[\s]*\d+$/, ''));
      }
      for (const [role, whos] of byRole)
        if (whos.size > 1)
          warn(`한 장면에서 role "${role}"을 ${[...whos].join(', ')}가 같이 씁니다 `
            + `— ${at}  (말풍선 색으로 화자를 구별할 수 없습니다)`);
    }

    // ── 문체 수집 (판정은 편 전체를 본 뒤에) ────────────────
    if (!PLAIN_OK.has(s.type)) {
      const local = [];
      walk(s, '', local);
      for (const [p, v] of local) {
        if (/\.(era|progLabel|flag|type|role|svg|tag|who)$/.test(p)) continue;
        // 대사와 선택지 문구는 화자의 말이다. 문체는 화자를 따르지,
        // 서술자의 문체 통일 규칙을 따르지 않는다.
        if (/\.dialogues\[\d+\]\.text$/.test(p)) continue;
        if (/\.options\[\d+\]\.text$/.test(p)) continue;
        const plain = v.match(PLAIN_RE);
        const polite = v.match(POLITE_RE);
        if (plain && !polite) style.plain.push([`${at}${p}`, plain[0]]);
        else if (polite && !plain) style.polite.push([`${at}${p}`, polite[0]]);
      }
    }

    // ── 선택지 대비 deep 해설 누락 ──────────────────────────
    if (s.type === 'game') {
      const opts = (s.choice && (s.choice.options || s.choice.choices)) || [];
      const deep = scenes.slice(i + 1).find(x => x.type === 'deep');
      if (opts.length && deep) {
        const branches = (deep.text || '').split('\n')
          .filter(l => /(?:다면|했다면|었다면)\s*—/.test(l)).length;
        if (branches && branches < opts.length)
          err(`선택지 ${opts.length}개인데 해설은 ${branches}갈래 — ${at}  `
            + `(고른 플레이어가 답을 못 받습니다)`);
      }
    }
  });

  // ── 한 막 안에서 시점이 어긋나지 않는가 ─────────────────────
  //   narration이 앞 막의 장면을 다시 보여주면 플레이어는 같은 일을 두 번 겪는다.
  //   그 징후는 narration의 연도가 같은 막 context의 연도와 다른 것으로 드러난다.
  {
    const actOf = sc => (sc.progLabel || sc.era || '').match(/^[^·]*/)[0].trim();
    const years = t => [...String(t || '').matchAll(/1[2-9]\d\d/g)].map(m => m[0]);
    scenes.forEach((sc, i) => {
      if (sc.type !== 'narration') return;
      const act = actOf(sc);
      const ctx = scenes.slice(i + 1).find(x => x.type === 'context' && actOf(x) === act)
               || scenes.slice(i + 1).find(x => x.type === 'context');
      if (!ctx || !ctx.year) return;
      const ny = new Set([...years(sc.text), ...years(sc.era)]);
      const cy = new Set(years(ctx.year));
      if (!ny.size || !cy.size) return;
      if (![...ny].some(y => cy.has(y)))
        warn(`${act || `scenes[${i}]`} 시점 불일치 — narration은 ${[...ny].join('/')}년, `
          + `같은 막 context는 ${[...cy].join('/')}년 `
          + `(앞 막 장면을 다시 보여주는 것은 아닌지 확인하세요)`);
    });
  }

  // ── 두 막의 '깊게 살펴보기' 제목이 같지 않은가 ──────────────
  //   제목이 같으면 두 막이 같은 말을 하고 있다는 뜻이다.
  {
    const titles = new Map();
    scenes.forEach((sc, i) => {
      if (sc.type !== 'deep' || !sc.title) return;
      const k = key(sc.title);
      if (titles.has(k)) err(`deep 제목이 겹칩니다 — scenes[${titles.get(k)}]와 `
        + `scenes[${i}] 모두 "${sc.title}"  (두 막이 같은 말을 하고 있지 않은지 보세요)`);
      else titles.set(k, i);
    });
  }

  // ── 에필로그가 앞 막을 되풀이하지 않는가 ───────────────────
  //   핵심 한 줄을 다시 울리는 것은 장치다. 그러나 앞 장면을 통째로
  //   옮겨 적으면 플레이어는 방금 읽은 것을 또 읽는다.
  {
    const epi = scenes.find(x => x.type === 'epilogue');
    if (epi) {
      const mine = new Set();
      for (const p of epi.paragraphs || []) for (const x of sentences(p)) mine.add(x);
      const earlier = new Map();
      scenes.forEach((sc, i) => {
        if (sc.type === 'epilogue') return;
        const local = [];
        walk(sc, '', local);
        for (const [, v] of local) for (const x of sentences(v)) if (!earlier.has(x)) earlier.set(x, i);
      });
      const reused = [...mine].filter(x => earlier.has(x));
      if (reused.length >= 2) {
        warn(`에필로그가 앞 막의 문장 ${reused.length}개를 그대로 씁니다 `
          + `(${[...mine].length}문장 중) — 앞 장면을 옮겨 적은 것은 아닌지 확인하세요`);
        for (const x of reused.slice(0, 5))
          warn(`  └ scenes[${earlier.get(x)}]와 동일 — "${shown(x).slice(0, 46)}"`);
      }
    }
  }

  // ── 문체: 편 안에서 통일되어 있는가 ─────────────────────────
  //   시리즈 전체를 한 문체로 묶지 않는다. 편마다 목소리가 다를 수 있다.
  //   문제가 되는 건 '한 편 안에서 일부만 다른' 경우다.
  {
    const np = style.plain.length, nq = style.polite.length;
    const total = np + nq;
    if (total >= 8 && np && nq) {
      const minor = np < nq ? style.plain : style.polite;
      const majorName = np < nq ? '경어체' : '평어체';
      if (minor.length / total <= 0.35) {
        warn(`이 편은 ${majorName}가 기준인데 ${minor.length}곳만 다릅니다 `
          + `(${minor.length}/${total}) — 의도가 아니라 실수로 읽힙니다`);
        for (const [where, tok] of minor.slice(0, 12))
          warn(`  └ "${tok}" — ${where}`);
      }
    }
  }

  // ── 막 간 문장 복제 ────────────────────────────────────────
  //   quote의 후렴과 에필로그의 회상은 의도된 장치다. 잡아야 할 것은
  //   '서로 다른 막의 본문에 같은 문장이 그대로 복사된' 경우뿐이다.
  const seen = new Map();
  scenes.forEach((s, i) => {
    if (s.type === 'epilogue') return;
    const act = (s.progLabel || '').match(/^[^·]*/)[0].trim() || `scene${i}`;
    const local = [];
    walk(s, '', local);
    const here = new Set();
    for (const [p, v] of local) {
      if (/\.quote$/.test(p)) continue;
      for (const sent of sentences(v)) here.add(sent);
    }
    for (const sent of here) {
      if (!seen.has(sent)) seen.set(sent, new Map());
      if (!seen.get(sent).has(act)) seen.get(sent).set(act, i);
    }
  });
  for (const [sent, acts] of seen)
    if (acts.size > 1)
      warn(`막을 건너뛴 문장 복제 (${[...acts.keys()].join(' / ')}) — `
        + `"${shown(sent).slice(0, 42)}"  (각 막의 주제어로 변형하세요)`);

  return msgs;
}

const args = process.argv.slice(2);
const files = args.length ? args : [
  ...fs.readdirSync('kings').map(k => path.join('kings', k, 'scenes.json')),
  ...fs.readdirSync('heroes').map(h => path.join('heroes', h, 'scenes.json')),
].filter(f => fs.existsSync(f));

let errs = 0, warns = 0;
for (const f of files) {
  const msgs = check(f);
  const e = msgs.filter(m => m[0] === '오류').length;
  const w = msgs.length - e;
  errs += e; warns += w;
  console.log(`\n${f}  —  ${msgs.length ? `오류 ${e} · 경고 ${w}` : '통과'}`);
  for (const [lvl, m] of msgs) console.log(`  ${lvl === '오류' ? '✖' : '△'} ${m}`);
}
console.log(`\n${'─'.repeat(60)}\n총 오류 ${errs} · 경고 ${warns}  (${files.length}개 파일)`);
process.exit(errs ? 1 : 0);
