#!/usr/bin/env node
/**
 * 자산 버전 올리기 — shared/engine.js · style.css · 테마를 고친 뒤 실행.
 *
 *   node tools/bump_version.js            # 지금 시각으로 (YYYYMMDDHHmm)
 *   node tools/bump_version.js 202610101  # 직접 지정
 *
 * 브라우저는 주소가 같으면 옛 파일을 캐시에서 꺼내 쓴다. 엔진을 고쳐 올려도
 * 이미 방문한 사람은 옛 엔진으로 플레이하게 된다. 그래서 각 편 game.html이
 * 공용 파일을 부를 때 ?v=<버전>을 붙이고, 고칠 때마다 그 버전을 올린다.
 *
 * 바꾸는 곳: episode.html의 ASSET_V, 그리고 공용 파일을 <link>/<script>로
 * 부르는 game.html 전부. (build_single로 만든 단일 HTML은 엔진이 안에 들어
 * 있으므로 대신 다시 빌드한다.)
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const now = new Date();
const pad = n => String(n).padStart(2, '0');
const version = process.argv[2] || [
  now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate()),
  pad(now.getHours()), pad(now.getMinutes()),
].join('');
if (!/^\w+$/.test(version)) {
  console.error(`버전은 영문·숫자만: ${version}`);
  process.exit(1);
}

const changed = [];
function rewrite(file, fn) {
  const before = fs.readFileSync(file, 'utf8');
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed.push(path.relative(root, file));
  }
}

rewrite(path.join(root, 'episode.html'),
  s => s.replace(/const ASSET_V = '[^']*';/, `const ASSET_V = '${version}';`));

const games = [];
for (const group of ['kings', 'heroes']) {
  for (const dir of fs.readdirSync(path.join(root, group))) {
    const f = path.join(root, group, dir, 'game.html');
    if (fs.existsSync(f)) games.push(f);
  }
}
for (const f of games) {
  rewrite(f, s => s.replace(
    /((?:href|src)="(?:\.\.\/)+shared\/[\w/.-]+\.(?:css|js))(?:\?v=\w+)?"/g,
    `$1?v=${version}"`));
}

console.log(`자산 버전 → ${version}`);
for (const f of changed) console.log(`  ✓ ${f}`);
if (!changed.length) console.log('  (바뀐 파일 없음)');
