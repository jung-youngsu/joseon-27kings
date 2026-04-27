# ═══════════════════════════════════════════════════════════════
# 조선 27왕 게임 시리즈 - 폴더/파일 일괄 생성 스크립트
# ═══════════════════════════════════════════════════════════════
#
# 사용법:
#   1. 이 파일과 kings.json을 같은 폴더에 둔다
#   2. PowerShell을 그 폴더에서 연다 (VS Code 터미널이면 자동)
#   3. .\generate-kings.ps1   를 실행
#
# 결과:
#   현재 폴더 아래에 kings/ 폴더가 만들어지고
#   그 안에 27개 왕별 폴더와 4개씩 빈 파일(108개)이 생성된다.
#
#   각 왕별 폴더 구조:
#     kings/ep01_taejo/
#       game.html         (게임 - 추후 작성)
#       quiz.json         (퀴즈 20문제)
#       novel.md          (소설 학습자료)
#       study.md          (심화 학습자료)
#       README.md         (이 왕 정보 요약)
#
# ※ 이미 존재하는 파일은 덮어쓰지 않음 (안전)
# ═══════════════════════════════════════════════════════════════

# UTF-8 출력 (한글 깨짐 방지)
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ── kings.json 읽기 ────────────────────────────────────────────
$jsonPath = Join-Path $PSScriptRoot "kings.json"
if (-not (Test-Path $jsonPath)) {
    Write-Host "❌ kings.json 파일이 없습니다: $jsonPath" -ForegroundColor Red
    exit 1
}

$kings = Get-Content $jsonPath -Encoding UTF8 -Raw | ConvertFrom-Json
Write-Host "📜 조선 $($kings.Count)왕 데이터 읽음" -ForegroundColor Cyan

# ── 출력 루트 폴더 ─────────────────────────────────────────────
$rootDir = Join-Path $PSScriptRoot "kings"
if (-not (Test-Path $rootDir)) {
    New-Item -ItemType Directory -Path $rootDir | Out-Null
    Write-Host "📁 루트 폴더 생성: kings/" -ForegroundColor Green
}

# ── 통계 ───────────────────────────────────────────────────────
$created = 0
$skipped = 0

# ── 각 왕별 폴더와 파일 생성 ──────────────────────────────────
foreach ($k in $kings) {
    $epStr = "{0:D2}" -f $k.ep   # 01, 02, ..., 27
    $folderName = "ep${epStr}_$($k.slug)"
    $folder = Join-Path $rootDir $folderName

    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
    }

    # ─── README.md (왕 정보 요약) ───
    $readmePath = Join-Path $folder "README.md"
    if (-not (Test-Path $readmePath)) {
        $readmeContent = @"
# EP$epStr · $($k.korName) — $($k.personalName)

> $($k.tagline)

- **묘호**: $($k.korName)
- **이름**: $($k.personalName)
- **재위**: $($k.reign)
- **생몰**: $($k.era)
- **에피소드 번호**: EP$epStr
- **slug**: $($k.slug)

## 파일 구성

| 파일 | 용도 | 상태 |
|---|---|---|
| game.html | 게임 본체 | ⬜ 미작성 |
| quiz.json | 퀴즈 20문제 | ⬜ 미작성 |
| novel.md | 소설 학습자료 | ⬜ 미작성 |
| study.md | 심화 학습자료 | ⬜ 미작성 |

## 작업 메모

(여기에 자유롭게 메모 — 핵심 주제, 잡힌 씬, 미해결 질문 등)

"@
        Set-Content -Path $readmePath -Value $readmeContent -Encoding UTF8
        $created++
    } else { $skipped++ }

    # ─── game.html (빈 게임 템플릿) ───
    $gamePath = Join-Path $folder "game.html"
    if (-not (Test-Path $gamePath)) {
        $gameContent = @"
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EP$epStr · $($k.korName) — $($k.tagline)</title>
<!-- 게임 본체. 추후 작성. -->
</head>
<body>
<!-- TODO: $($k.korName)($($k.personalName)) 게임 콘텐츠 -->
<!-- 표준 메타데이터 -->
<script type="application/json" id="meta">
{
  "ep": $($k.ep),
  "slug": "$($k.slug)",
  "korName": "$($k.korName)",
  "personalName": "$($k.personalName)",
  "reign": "$($k.reign)",
  "era": "$($k.era)",
  "tagline": "$($k.tagline)"
}
</script>
</body>
</html>
"@
        Set-Content -Path $gamePath -Value $gameContent -Encoding UTF8
        $created++
    } else { $skipped++ }

    # ─── quiz.json (빈 퀴즈 20문제 템플릿) ───
    $quizPath = Join-Path $folder "quiz.json"
    if (-not (Test-Path $quizPath)) {
        $quizContent = @"
{
  "ep": $($k.ep),
  "slug": "$($k.slug)",
  "title": "$($k.korName) 퀴즈",
  "questions": [
    { "id": 1,  "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 2,  "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 3,  "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 4,  "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 5,  "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 6,  "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 7,  "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 8,  "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 9,  "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 10, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 11, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 12, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 13, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 14, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 15, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 16, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 17, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 18, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 19, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" },
    { "id": 20, "q": "", "choices": ["", "", "", ""], "answer": 0, "explain": "" }
  ]
}
"@
        Set-Content -Path $quizPath -Value $quizContent -Encoding UTF8
        $created++
    } else { $skipped++ }

    # ─── novel.md (소설 학습자료) ───
    $novelPath = Join-Path $folder "novel.md"
    if (-not (Test-Path $novelPath)) {
        $novelContent = @"
# $($k.korName) — $($k.personalName)

> $($k.tagline)

*$($k.era) · 재위 $($k.reign)*

---

## 1장 — (제목)

(여기에 소설 본문)

---

## 에필로그

(마무리)

---

*조선왕조실록, 고려사 기반 교육용 창작 소설*
"@
        Set-Content -Path $novelPath -Value $novelContent -Encoding UTF8
        $created++
    } else { $skipped++ }

    # ─── study.md (심화 학습자료) ───
    $studyPath = Join-Path $folder "study.md"
    if (-not (Test-Path $studyPath)) {
        $studyContent = @"
# $($k.korName) 심화 학습자료

## 인물 개관

- **묘호**: $($k.korName)
- **이름**: $($k.personalName)
- **재위**: $($k.reign)
- **생몰**: $($k.era)

## 시대 배경

(이 시기의 정치, 사회, 문화)

## 주요 사건

1.
2.
3.

## 핵심 인물

-
-

## 사료 발췌

>

## 깊게 살펴보기

(역사적 평가, 다양한 관점, 현대적 시사점)

## 함께 보기

- 관련 에피소드:
- 추천 도서:
- 추천 영상:
"@
        Set-Content -Path $studyPath -Value $studyContent -Encoding UTF8
        $created++
    } else { $skipped++ }
}

# ── 마스터 인덱스 README 생성 ─────────────────────────────────
$masterReadme = Join-Path $rootDir "README.md"
if (-not (Test-Path $masterReadme)) {
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("# 조선 27왕 — 역사 게임 시리즈")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("> 어떤 일은 하루만에 일어나기도 하고, 또 어떤 일은 몇백년에 걸쳐서 일어나기도 한다.")
    [void]$sb.AppendLine("> 역사를 들여다본다는 것은 한 인간을 들여다보는 일이다.")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## 에피소드 목록")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| EP | 묘호 | 이름 | 재위 | 주제 | 상태 |")
    [void]$sb.AppendLine("|---|---|---|---|---|---|")
    foreach ($k in $kings) {
        $ep = "{0:D2}" -f $k.ep
        $row = "| EP$ep | [$($k.korName)](./ep${ep}_$($k.slug)/) | $($k.personalName) | $($k.reign) | $($k.tagline) | ⬜ |"
        [void]$sb.AppendLine($row)
    }
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("## 폴더 구조")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine('```')
    [void]$sb.AppendLine("kings/")
    [void]$sb.AppendLine("  ep01_taejo/")
    [void]$sb.AppendLine("    README.md       ← 왕 정보 + 작업 메모")
    [void]$sb.AppendLine("    game.html       ← 게임 본체")
    [void]$sb.AppendLine("    quiz.json       ← 퀴즈 20문제")
    [void]$sb.AppendLine("    novel.md        ← 소설 학습자료")
    [void]$sb.AppendLine("    study.md        ← 심화 학습자료")
    [void]$sb.AppendLine("  ep02_jeongjong/")
    [void]$sb.AppendLine("    ...")
    [void]$sb.AppendLine('```')
    Set-Content -Path $masterReadme -Value $sb.ToString() -Encoding UTF8
    $created++
}

# ── 결과 보고 ─────────────────────────────────────────────────
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "✅ 생성 완료" -ForegroundColor Green
Write-Host "   - 새로 만든 파일: $created" -ForegroundColor Green
Write-Host "   - 이미 있어 건너뜀: $skipped" -ForegroundColor DarkGray
Write-Host "   - 위치: $rootDir" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 다음 단계:" -ForegroundColor Yellow
Write-Host "   1. cd kings"
Write-Host "   2. git init"
Write-Host "   3. git add ."
Write-Host "   4. git commit -m 'init: 조선 27왕 골격 생성'"
Write-Host "   5. GitHub에 새 레포 만들고 push"
Write-Host ""
