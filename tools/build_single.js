#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   tools/build_single.js
   조선 27왕 시리즈 — 분리 구조(scenes.json) → 단일 HTML 빌드

   사용:
     node tools/build_single.js kings/ep00_jeongdojeon
     node tools/build_single.js kings/ep00_jeongdojeon -o dist/jeongdojeon.html

   하는 일:
     1. <ep-dir>/scenes.json 읽음
     2. scenes.theme 필드로 shared/themes/<theme>.css 인라인
     3. shared/style.css + shared/engine.js 인라인
     4. <ep-dir>/game.html (또는 -o로 지정한 경로)에 자족적 단일 HTML 저장
═══════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node tools/build_single.js <ep-dir> [-o <output.html>]');
    process.exit(1);
  }

  const epDir = path.resolve(args[0]);
  let outPath = path.join(epDir, 'game.html');
  const oi = args.indexOf('-o');
  if (oi !== -1 && args[oi + 1]) outPath = path.resolve(args[oi + 1]);

  const projectRoot = findProjectRoot(epDir);
  const sharedDir = path.join(projectRoot, 'shared');

  const scenesPath = path.join(epDir, 'scenes.json');
  const scenesRaw = fs.readFileSync(scenesPath, 'utf8');
  const scenes = JSON.parse(scenesRaw);

  const theme = scenes.theme || 'cold-iron';
  const themeCss = fs.readFileSync(path.join(sharedDir, 'themes', `${theme}.css`), 'utf8');
  const styleCss = fs.readFileSync(path.join(sharedDir, 'style.css'), 'utf8');
  const engineJs = fs.readFileSync(path.join(sharedDir, 'engine.js'), 'utf8');

  const html = renderHtml({ scenes, themeCss, styleCss, engineJs, theme });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');

  const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`✓ ${path.relative(process.cwd(), outPath)}  (${sizeKb} KB, ${scenes.scenes.length} scenes, theme: ${theme})`);
}

function findProjectRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'shared', 'engine.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not locate project root (looking for shared/engine.js) from ${start}`);
}

function renderHtml({ scenes, themeCss, styleCss, engineJs, theme }) {
  const title = scenes.title || `조선 27왕 · EP${String(scenes.ep ?? '').padStart(2, '0')}`;
  // JSON을 안전하게 <script> 안에 인라인 — </ 시퀀스만 보호하면 충분
  const scenesInline = JSON.stringify(scenes).replace(/<\/(script)/gi, '<\\/$1');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600;700&family=Noto+Sans+KR:wght@300;400;500&display=swap" rel="stylesheet">

<!-- theme: ${theme} -->
<style>
${themeCss}
</style>

<!-- shared/style.css -->
<style>
${styleCss}
</style>

</head>
<body>

<div id="game-root"></div>

<!-- shared/engine.js -->
<script>
${engineJs}
</script>

<!-- scenes data (inlined from scenes.json) -->
<script>
(function(){
  var data = ${scenesInline};
  if (window.GameEngine && typeof window.GameEngine.start === 'function') {
    window.GameEngine.start(data);
  } else {
    document.getElementById('game-root').innerHTML =
      '<div style="padding:40px;text-align:center;color:#c87060;font-family:serif;">엔진 로드 실패</div>';
  }
})();
</script>

</body>
</html>
`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

main();
