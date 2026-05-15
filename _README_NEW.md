# 조선 27왕 시리즈 — 새 분리 구조 패키지

## 📦 이 패키지에 들어 있는 것

```
joseon/
├── index.html              ← 메인 페이지 (kings.json 자동 읽음)
├── joseon-kings.html       ← 시리즈 페이지 (가계도 + 모달)
├── episode.html            ← ★ 새 에피소드 프레임 (탭 시스템)
├── kings.json              ← 27왕 데이터 (status, theme 추가됨)
│
├── shared/                 ← ★ 분리 구조의 핵심
│   ├── style.css           ← 공통 스타일 (구조)
│   ├── engine.js           ← 게임 엔진
│   └── themes/
│       ├── cold-iron.css   ← 차가운 톤 (이성계, 연산군 등)
│       └── warm-quiet.css  ← 따뜻한 톤 (이방과, 문종 등)
│
└── kings/
    ├── ep01_taejo/
    │   └── game.html       ← 기존 이성계편 (단일 HTML, 추후 변환)
    │
    ├── ep02_jeongjong/     ← ★ 새 분리 구조 모범
    │   ├── game.html       ← 얇은 페이지 (engine + theme + scenes 결합)
    │   ├── scenes.json     ← 모든 콘텐츠 (글만 다듬으면 됨!)
    │   └── novel.md        ← 소설 학습자료
    │
    ├── ep10_yeonsangun/
    │   └── game.html       ← 기존 단일 HTML
    │
    ├── ep14_seonjo/
    │   └── game.html       ← 기존 단일 HTML
    │
    └── ep22_jeongjo/
        └── game.html       ← 기존 단일 HTML
```

---

## 🎯 가장 중요한 사실

**EP2 이방과편이 새 시스템의 첫 번째 작품**이에요. 다른 4편은 일단 옮겨만 두고, 이 EP2가 잘 작동하는지 확인 후에 변환할 거예요.

---

## 🚀 사용 방법

### 1단계 — 기존 파일 백업

joseon-27kings 레포에 이미 있는 파일들이 덮어쓰일 거예요. 만약 중요한 변경 있으셨다면 git commit 한 번 먼저:

```powershell
cd C:\Users\jung-\joseon-kings
git status
git add .
git commit -m "백업: 기존 상태"
```

### 2단계 — 새 파일 복사

이 zip을 풀고, 안의 파일들을 joseon-27kings 폴더에 통째로 복사 (덮어쓰기).

VS Code에서 변경 확인:
- 좌측 사이드바 가지 모양(Source Control) 아이콘 클릭
- 변경된 파일 목록이 좌르륵 보일 거예요

### 3단계 — git push

```powershell
git add .
git commit -m "분리 구조 도입 + EP2 이방과편 추가"
git push
```

### 4단계 — Netlify 자동 배포 (처음이라면)

지금까지 폴더 끌어다 놓는 방식이었다면, 이번에 GitHub 연동으로 바꿉니다:

1. https://app.netlify.com 로그인
2. `incredible-tiramisu-79b7aa` 사이트 클릭
3. **Site configuration** → **Build & deploy** → **Continuous deployment** → **Link repository**
4. **GitHub** 선택 → 권한 승인 → `joseon-27kings` 선택
5. Build settings는 그대로 (정적 사이트라 빌드 명령 없음)
6. **Deploy site** 클릭

이제부터 **git push만 하면 자동 배포**됩니다.

### 5단계 — 확인

- `https://ifyouwere.kr` → 메인 페이지 정상
- `https://ifyouwere.kr/joseon-kings.html` → 시리즈 페이지에 정종(이방과)이 추가됨
- `https://ifyouwere.kr/episode.html?ep=2` → ★ 새 분리 구조의 EP2 이방과편 게임
- `https://ifyouwere.kr/episode.html?ep=1` → 기존 이성계편이 새 프레임 안에서 작동

---

## 💎 EP2 이방과편 — 새 시스템의 핵심

### 단어 하나 다듬기 (2초)

`kings/ep02_jeongjong/scenes.json` 열기 → 원하는 단어 수정 → 저장 → git push.

**HTML, CSS, JS는 절대 건드릴 필요 없어요.** scenes.json만 보세요.

### 분기 입구 — 활쏘기 마당

EP2의 1막에 **방과편/방원편 분기**가 있어요. 학생이 "무엇을 보았느냐"로 자기 시선을 표시하게 함:
- "활시위가 떨릴 때 — 화살의 무게가 보인다" → 방과의 시선
- "화살이 박힐 때 — 아버지의 표정이 보인다" → 방원의 시선

EP3 태종편이 만들어지면 이 분기를 활용해 다른 시리즈 입구로 연결.

### 톤 — warm-quiet

이방과편은 따뜻하고 조용한 톤이에요. 검정에 살짝 적색이 섞인 배경, 황금 대신 호박/구리색 강조. 이성계편의 차가운 톤(cold-iron)과 명확히 다른 분위기.

톤을 바꾸고 싶으면 `kings.json`에서 EP2의 `theme` 값만 바꾸면 됨.

---

## 🔧 분리 구조의 진짜 강점

### 시나리오 A: "전체 디자인을 좀 더 세련되게"
→ `shared/style.css` 한 곳만 수정 → **모든 EP가 자동 반영**

### 시나리오 B: "이방과편 톤이 너무 따뜻해서 살짝 다운시키고 싶다"
→ `shared/themes/warm-quiet.css` 수정 → **이 톤 쓰는 모든 EP 함께 반영**

### 시나리오 C: "활쏘기 장면에 떨림 효과 추가"
→ `kings/ep02_jeongjong/style.css` 만들어서 추가 → **이 EP에만 적용**
→ game.html에서 `<link rel="stylesheet" href="style.css">` 주석 풀기

### 시나리오 D: "EP3 태종편 시작"
→ `kings/ep03_taejong/scenes.json` 작성 → game.html은 EP2와 거의 동일하게 복사 → kings.json에서 `"status": "live"` 변경 → push 끝

**HTML 한 줄도 안 건드리고 새 EP가 추가됨.**

---

## 📝 다음 작업 추천 순서

### 즉시 (오늘)
1. 패키지 적용 + git push
2. Netlify GitHub 연동
3. ifyouwere.kr에서 EP2 이방과편 플레이해보기
4. 어색한 단어/문장 메모

### 이번 주
5. EP2 이방과편 scenes.json 다듬기 (글만 만지면 됨)
6. EP2 퀴즈 작성 (kings/ep02_jeongjong/quiz.json)
7. EP2 심화자료 작성 (kings/ep02_jeongjong/study.md)

### 다음 주 이후
8. EP1 이성계편을 분리 구조로 변환 (Claude 도움)
9. 다른 3편(연산군, 선조, 정조)도 변환
10. EP3 태종편 새 작성 (방원의 시선)

---

## ⚠️ 주의사항

### 기존 게임 4편의 헤더 메뉴

EP1, EP10, EP14, EP22는 일단 **단일 HTML 그대로** 옮겨졌어요. 이 게임들에는 자체 메뉴가 있어서 episode.html 안에서 iframe으로 로드될 때 *"홈으로"* 같은 버튼이 두 번 보일 수 있어요.

이건 변환 작업할 때 정리할 부분이에요. 지금은 작동 자체는 됩니다.

### Supabase 연동

기존 joseon-kings.html에는 Supabase 로그인/EP/환생권 시스템이 있어요. 이 부분은 그대로 유지됐어요. 다만 unlocked_episodes 테이블에 **ep 번호가 1, 2, 10, 14, 22로 바뀐다**는 점만 알아두세요. 만약 기존 데이터가 ep:1,2,3,4였다면 DB 수정 필요할 수 있어요.

---

## 🆘 문제 발생 시

### EP2 게임이 안 열림
1. 브라우저 개발자 도구(F12) → Console 탭에서 에러 메시지 확인
2. `scenes.json`이 valid JSON인지 확인 (https://jsonlint.com 에서 검증)
3. `shared/engine.js` 경로가 맞는지 확인

### 메인에 EP 정보가 자동 갱신 안 됨
1. `kings.json`의 status 값 확인 (`"live"`만 카운트됨)
2. 브라우저 캐시 비우기 (Ctrl+Shift+R)

### Netlify 배포 안 됨
1. GitHub push 정상인지 확인 (`git log --oneline`)
2. Netlify 대시보드 → Deploys 탭에서 빌드 로그 확인

---

행운을 빕니다, 원장님 🏯

방과의 [warm-quiet] 톤이 마음에 드시면 — 이게 시리즈의 새 자산이 됩니다.
