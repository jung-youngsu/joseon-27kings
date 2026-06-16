# 조선 27왕 + 영웅편 — 역사 게임 시리즈

> 어떤 일은 하루 만에 일어나기도 하고, 또 어떤 일은 몇백 년에 걸쳐 일어나기도 한다.
> 역사를 들여다본다는 것은 한 인간을 들여다보는 일이다.

정적 웹으로 만든 역사 학습 게임 시리즈입니다. 배포는 Netlify(`ifyouwere.kr`),
로그인·진행도는 Supabase로 연동돼 있어요. 빌드 도구 없이 브라우저에서 바로 열립니다.

---

## 📦 폴더 구조

```
joseon/
├── index.html              ← 메인 허브 (kings.json + heroes.json 둘 다 읽어 카드 자동 갱신)
├── joseon-kings.html       ← 27왕 시리즈 페이지 (가계도 + 모달 + Supabase)
├── heroes.html             ← 영웅편 시리즈 페이지 (세로 카드)
├── episode.html            ← 에피소드 프레임 (게임/소설/심화/퀴즈 탭)
├── extractor.html          ← HTML → JSON 텍스트 추출기 (단일 HTML 다듬기용)
│
├── kings.json              ← 27왕 마스터 데이터 (slug·theme·status 등)
├── heroes.json             ← 영웅편 4슬롯 데이터
│
├── shared/                 ← ★ 분리 구조의 핵심 (모든 EP가 공유)
│   ├── engine.js           ← 게임 엔진 (scenes.json을 받아 렌더링)
│   ├── style.css           ← 공통 구조 스타일
│   └── themes/
│       ├── cold-iron.css   ← 차가운 톤 (태조·태종·연산군 등)
│       └── warm-quiet.css  ← 따뜻한 톤 (정종·문종·정조 등)
│
├── tools/                  ← 분리 구조 → 자족 단일 HTML 빌드
│   ├── build_single.js     ← Node 버전
│   └── build_single.py     ← 같은 로직의 Python 버전
│
├── generate-kings.ps1      ← (레거시) 27왕 폴더 골격 일괄 생성 PowerShell
│
├── kings/                  ← 27왕 + ep00 정도전
│   ├── README.md           ← 에피소드 목록·상태표
│   ├── ep00_jeongdojeon/   ← 정도전 (영웅편이 참조)
│   ├── ep01_taejo/         ← 태조 (분리 구조)
│   ├── ...
│   └── ep27_sunjong/       ← 순종 (골격)
│
└── heroes/                 ← 영웅편
    └── yisunsin/           ← 이순신 (분리 구조)
```

각 에피소드 폴더는 다음을 담습니다 (편마다 일부만 있을 수 있음):

| 파일 | 역할 |
|---|---|
| `scenes.json` | ★ 게임 콘텐츠 전체 — **글만 다듬으면 됨** |
| `game.html` | 얇은 페이지 (engine + theme + scenes 결합) 또는 자족 단일 HTML |
| `novel.md` | 소설 학습자료 |
| `study.md` | 심화 자료 |
| `quiz.json` | 퀴즈 문제 |

---

## 🎯 분리 구조의 핵심

**콘텐츠(`scenes.json`)와 동작(`shared/`)을 분리**한 게 이 프로젝트의 뼈대입니다.

- **단어 하나 다듬기 (2초):** `kings/<ep>/scenes.json`에서 텍스트만 수정 → 저장 → push.
  HTML·CSS·JS는 건드릴 필요 없어요.
- **전체 디자인 손보기:** `shared/style.css` 한 곳 → **모든 EP 자동 반영.**
- **톤 조정:** `shared/themes/<theme>.css` 수정 → **그 톤을 쓰는 모든 EP 함께 반영.**
- **새 EP 추가:** `scenes.json` 작성 + `game.html`은 기존 편 복사 + `kings.json`에서
  `"status": "live"`로 변경 → 끝. **HTML 한 줄 안 건드리고 추가됨.**

> 톤은 `kings.json` / `heroes.json`의 `theme` 값(`cold-iron` 또는 `warm-quiet`)으로 결정됩니다.

### 현재 진행 상태

| 구분 | 편 |
|---|---|
| **분리 구조 완료 (scenes.json 보유)** | ep00 정도전, ep01 태조, ep02 정종, ep03 태종, heroes/yisunsin 이순신 |
| **`live`지만 구(舊) 단일 HTML** | ep10 연산군, ep14 선조, ep22 정조 — 추후 분리 구조로 변환 예정 |
| **`soon` (골격만)** | ep04~ep27 나머지 |

---

## 🛠 자족 단일 HTML 빌드 (tools/)

분리 구조(`scenes.json` + `shared/`)를 외부 의존 없는 **단일 HTML 한 장**으로 굽습니다.
오프라인 배포·공유·백업에 유용해요.

```bash
node tools/build_single.js kings/ep00_jeongdojeon
# 또는
python3 tools/build_single.py kings/ep00_jeongdojeon

# 출력 경로 지정
node tools/build_single.js kings/ep00_jeongdojeon -o dist/jeongdojeon.html
```

하는 일: `scenes.json` 읽기 → `scenes.theme`로 테마 CSS 인라인 →
`shared/style.css` + `shared/engine.js` 인라인 → 자족 HTML 저장.

---

## 🔧 HTML → JSON 추출기 (extractor.html)

기존 단일 HTML 게임에서 텍스트만 뽑아 `scenes.json` 다듬기 좋게 만드는 도구입니다.
브라우저에서 더블클릭으로 엽니다.

1. HTML 파일을 드롭존에 드롭 (또는 클릭 선택)
2. 추출 옵션 확인 — JS 문자열(대사·내레이션) ✓ / HTML 본문(UI 텍스트) ✓
3. 키 패턴 입력 — 예: `ep01_taejo` → `ep01_taejo_001`, `_002` … 자동 생성
4. **[텍스트 추출하기]**
5. 탭 확인 — **텍스트 목록**(어색한 단어 찾기) / **JSON 출력** / **치환된 HTML**
6. 다운로드 — `texts.json`(텍스트 사전) / `replaced.html`(ID로 치환된 게임)

> 추출량이 너무 많으면 'HTML 본문' 체크를 끄고 'JS 문자열'만 켜세요.

---

## 🚀 배포 (Netlify + GitHub)

이 레포는 GitHub 연동으로 **git push만 하면 자동 배포**됩니다.

```bash
git add .
git commit -m "변경 내용"
git push
```

처음 연동한다면: Netlify → 사이트(`incredible-tiramisu-79b7aa`) →
Site configuration → Build & deploy → Continuous deployment → Link repository →
GitHub → `joseon-27kings` 선택 → (빌드 명령 없음, 정적 사이트) → Deploy.

### 확인 URL

- `https://ifyouwere.kr` → 메인 허브 (27왕·영웅편 카드)
- `https://ifyouwere.kr/joseon-kings.html` → 27왕 시리즈
- `https://ifyouwere.kr/heroes.html` → 영웅편 시리즈
- `https://ifyouwere.kr/episode.html?ep=2` → 에피소드 프레임(예: EP2 정종)

### ⚠️ Supabase 주의

`joseon-kings.html`에 로그인 / 진행도(unlocked_episodes) / 환생권 시스템이 붙어 있어요.
EP 번호 체계를 바꾸면 DB의 `unlocked_episodes` 값과 어긋날 수 있으니 주의.

---

## 🌟 표준 영문 표기 (slug)

| EP | slug | 묘호 | 이름 | 재위 | 톤 |
|---|---|---|---|---|---|
| 01 | taejo | 태조 | 이성계 | 1392-1398 | cold-iron |
| 02 | jeongjong | 정종 | 이방과 | 1398-1400 | warm-quiet |
| 03 | taejong | 태종 | 이방원 | 1400-1418 | cold-iron |
| 04 | sejong | 세종 | 이도 | 1418-1450 | warm-quiet |
| 05 | munjong | 문종 | 이향 | 1450-1452 | warm-quiet |
| 06 | danjong | 단종 | 이홍위 | 1452-1455 | warm-quiet |
| 07 | sejo | 세조 | 이유 | 1455-1468 | cold-iron |
| 08 | yejong | 예종 | 이황 | 1468-1469 | warm-quiet |
| 09 | seongjong | 성종 | 이혈 | 1469-1494 | warm-quiet |
| 10 | yeonsangun | 연산군 | 이융 | 1494-1506 | cold-iron |
| 11 | jungjong | 중종 | 이역 | 1506-1544 | warm-quiet |
| 12 | injong | 인종 | 이호 | 1544-1545 | warm-quiet |
| 13 | myeongjong | 명종 | 이환 | 1545-1567 | warm-quiet |
| 14 | seonjo | 선조 | 이연 | 1567-1608 | cold-iron |
| 15 | gwanghaegun | 광해군 | 이혼 | 1608-1623 | cold-iron |
| 16 | injo | 인조 | 이종 | 1623-1649 | cold-iron |
| 17 | hyojong | 효종 | 이호 | 1649-1659 | cold-iron |
| 18 | hyeonjong | 현종 | 이연 | 1659-1674 | warm-quiet |
| 19 | sukjong | 숙종 | 이순 | 1674-1720 | cold-iron |
| 20 | gyeongjong | 경종 | 이윤 | 1720-1724 | warm-quiet |
| 21 | yeongjo | 영조 | 이금 | 1724-1776 | warm-quiet |
| 22 | jeongjo | 정조 | 이산 | 1776-1800 | warm-quiet |
| 23 | sunjo | 순조 | 이공 | 1800-1834 | cold-iron |
| 24 | heonjong | 헌종 | 이환 | 1834-1849 | warm-quiet |
| 25 | cheoljong | 철종 | 이변 | 1849-1864 | warm-quiet |
| 26 | gojong | 고종 | 이형 | 1863-1907 | cold-iron |
| 27 | sunjong | 순종 | 이척 | 1907-1910 | cold-iron |

> 인종/효종(이호), 명종/헌종(이환), 선조/현종(이연)은 한글 발음이 같고 한자가 다른
> 동명이형(同名異形)이에요. 폴더는 `ep번호_slug`로 구분되니 충돌 없습니다.
>
> 영웅편은 `heroes.json`에서 별도 관리(현재 정도전·이순신 live, 2슬롯 준비 중).
> 정도전 게임은 아직 `kings/ep00_jeongdojeon/`에 있고 `heroes.json`이 그 경로를 참조합니다
> (추후 `heroes/jeongdojeon/`으로 이동 권장).

---

## 📝 작업 흐름 & 다음 할 일

1. **scenes.json 다듬기** — 분리 구조 4편(정도전·태조·정종·태종·이순신)의 어색한 단어·문장 정리.
2. **구(舊) 단일 HTML 변환** — ep10 연산군 / ep14 선조 / ep22 정조를 분리 구조로.
3. **새 EP 작성** — `scenes.json` 작성 + `game.html` 복사 + `kings.json` `status: live`.
4. **퀴즈·심화 채우기** — 각 편 `quiz.json` / `study.md`.

> 각 폴더가 독립적이라 여러 편을 동시에 작업해도 충돌이 없어요.

---

## ❓ FAQ

**Q. scenes.json만 고치면 정말 끝인가요?**
A. 네. 글만 만지세요. 동작은 `shared/engine.js`가, 디자인은 `shared/style.css`와 테마가 맡습니다.

**Q. 메인 카드 정보가 자동 갱신 안 돼요.**
A. `kings.json` / `heroes.json`의 `status`가 `"live"`인지 확인하고, 브라우저 캐시를 비우세요(Ctrl+Shift+R). `index.html`이 두 JSON을 읽어 카드 desc·개수를 자동 갱신합니다.

**Q. 톤을 바꾸고 싶어요.**
A. 해당 편의 `theme` 값을 `cold-iron` ↔ `warm-quiet`로 바꾸세요. 새 톤이 필요하면 `shared/themes/`에 CSS를 추가합니다.

**Q. ep28을 추가하고 싶어요.**
A. 조선 왕은 27명이지만 추존왕(덕종·원종·진종·장조·문조 등)을 넣으려면 `kings.json`에 ep28~ 형태로 추가하면 됩니다.

**Q. EP2 게임이 안 열려요.**
A. F12 → Console에서 에러 확인 → `scenes.json`이 유효한 JSON인지(jsonlint.com) → `shared/engine.js` 경로 확인.

---

행운을 빕니다, 원장님 🏯
