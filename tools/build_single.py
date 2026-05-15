#!/usr/bin/env python3
"""
tools/build_single.py
조선 27왕 시리즈 — 분리 구조(scenes.json) → 단일 HTML 빌드

사용:
    python3 tools/build_single.py kings/ep00_jeongdojeon
    python3 tools/build_single.py kings/ep00_jeongdojeon -o dist/jeongdojeon.html

하는 일:
    1. <ep-dir>/scenes.json 읽음
    2. scenes.theme 필드로 shared/themes/<theme>.css 인라인
    3. shared/style.css + shared/engine.js 인라인
    4. <ep-dir>/game.html (또는 -o로 지정한 경로)에 자족적 단일 HTML 저장
"""

import json
import os
import re
import sys
import argparse
from pathlib import Path


def find_project_root(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(8):
        if (cur / "shared" / "engine.js").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    sys.exit(f"Could not locate project root (looking for shared/engine.js) from {start}")


def escape_html(s: str) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def render_html(scenes: dict, theme_css: str, style_css: str, engine_js: str, theme: str) -> str:
    ep = scenes.get("ep", "")
    title = scenes.get("title") or f"조선 27왕 · EP{str(ep).zfill(2)}"
    # JSON을 안전하게 <script> 안에 인라인 — </script> 시퀀스만 보호
    scenes_json = json.dumps(scenes, ensure_ascii=False)
    scenes_inline = re.sub(r"</(script)", r"<\\/\1", scenes_json, flags=re.IGNORECASE)

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{escape_html(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600;700&family=Noto+Sans+KR:wght@300;400;500&display=swap" rel="stylesheet">

<!-- theme: {theme} -->
<style>
{theme_css}
</style>

<!-- shared/style.css -->
<style>
{style_css}
</style>

</head>
<body>

<div id="game-root"></div>

<!-- shared/engine.js -->
<script>
{engine_js}
</script>

<!-- scenes data (inlined from scenes.json) -->
<script>
(function(){{
  var data = {scenes_inline};
  if (window.GameEngine && typeof window.GameEngine.start === 'function') {{
    window.GameEngine.start(data);
  }} else {{
    document.getElementById('game-root').innerHTML =
      '<div style="padding:40px;text-align:center;color:#c87060;font-family:serif;">엔진 로드 실패</div>';
  }}
}})();
</script>

</body>
</html>
"""


def main() -> None:
    ap = argparse.ArgumentParser(description="Build self-contained single-HTML game from scenes.json")
    ap.add_argument("ep_dir", help="Episode directory containing scenes.json")
    ap.add_argument("-o", "--output", help="Output HTML path (default: <ep_dir>/game.html)")
    args = ap.parse_args()

    ep_dir = Path(args.ep_dir).resolve()
    out_path = Path(args.output).resolve() if args.output else (ep_dir / "game.html")

    project_root = find_project_root(ep_dir)
    shared_dir = project_root / "shared"

    scenes_path = ep_dir / "scenes.json"
    if not scenes_path.exists():
        sys.exit(f"scenes.json not found: {scenes_path}")

    scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
    theme = scenes.get("theme") or "cold-iron"

    theme_css_path = shared_dir / "themes" / f"{theme}.css"
    if not theme_css_path.exists():
        sys.exit(f"Theme CSS not found: {theme_css_path}")

    theme_css = theme_css_path.read_text(encoding="utf-8")
    style_css = (shared_dir / "style.css").read_text(encoding="utf-8")
    engine_js = (shared_dir / "engine.js").read_text(encoding="utf-8")

    html = render_html(scenes, theme_css, style_css, engine_js, theme)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")

    size_kb = len(html.encode("utf-8")) / 1024
    rel = os.path.relpath(out_path, Path.cwd())
    print(f"✓ {rel}  ({size_kb:.1f} KB, {len(scenes['scenes'])} scenes, theme: {theme})")


if __name__ == "__main__":
    main()
