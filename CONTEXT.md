# SMU Server Status Viewer — 작업 컨텍스트 (2026-08-10)

이 워크스페이스는 이제 단일 모노레포. `https://github.com/jiwonsudo/smu-server-status-viewer` 로 push 완료됨.
- `frontend/`, `backend/` 둘 다 이 워크스페이스 루트의 git 저장소(하나의 `.git`)에 포함됨.
- 기존 두 레포(`SMU-Server-Status-Viewer`, `SMU-Server-Status-Viewer-BE`)의 커밋 히스토리는 `git subtree add`로 각각 `frontend/`, `backend/` 프리픽스 아래 보존해서 가져옴 — `git log`에서 예전 커밋도 그대로 조회 가능.
- 예전 두 레포의 로컬 작업 사본(`frontend.old-standalone-repo/`, `backend.old-standalone-repo/`)은 배포 전환이 확인돼서 2026-09-07 삭제함. 커밋 히스토리는 `git subtree add`로 이미 이 모노레포에 흡수돼 있음.
- 기존 GitHub 레포 2개(`SMU-Server-Status-Viewer`, `SMU-Server-Status-Viewer-BE`)는 아직 그대로 살아있음. **삭제하지 말고 Archive 권장** — 새 모노레포로 배포 전환 확인 후에.

## 2026-09-07 업데이트 — 콜드스타트 해결 + 모니터링을 서버로 재통합

콜드스타트 증상(방문 시 5초간 "서버 확인 중")을 잡으면서, GitHub Actions 기반
모니터링과 Go 서버의 상태 점검이 중복되던 걸 정리함.

- **콜드스타트 (원인 1: 백엔드가 안 깨어있음)**: `.github/workflows/monitor.yml`의
  5분 크론이 keepalive였는데 Actions 예약 크론이 자주 밀림/누락됨 → Render 15분
  유휴 초과 → 콜드스타트. **해결: 외부 업타임 핑거(cron-job.org)를 2분 간격으로
  `/healthz`에 등록** (사용자가 직접). 실패 알림 ON.
- **콜드스타트 (원인 2: 프론트에 폴백 데이터 없음)**: `StatusDashboardServer.js`가
  `headers()`(요청 시점 API) + `cache: 'no-store'`라 SSR fetch가 매번 라이브
  백엔드를 기다렸음. **해결: `headers()`/방문자 IP 전달 제거 + `next: { revalidate: 15 }`**
  → `/`가 static ISR로 프리렌더됨(빌드 로그 `○ (Static) Revalidate 15s` 확인).
  Vercel이 캐시를 즉시 서빙하고 갱신은 백그라운드(SWR). 콜드 백엔드가 첫 페인트를
  못 막음. 클라이언트는 하이드레이션 직후 SSE로 라이브 승격.
- **콜드스타트 (원인 3)**: `statuscache.New`가 첫 `refreshAll`를 동기로 끝낸 뒤
  `ListenAndServe`로 넘어가서 콜드부팅 중 `/healthz`도 몇 초 멈췄음. **해결: 첫 갱신을
  goroutine으로** — 서버 즉시 기동, 첫 결과 전까지 `Get`이 `ok=false`(기존 503/빈
  스냅샷 폴백 그대로).
- **모니터링 재통합**: 상태 전환 감지 + 이메일/디스코드 알림이 `cmd/checkstatus`
  (Actions에서 5분마다 `go run`)에 있었는데, 서버가 상시 가동되면 중복임. →
  `internal/statemonitor`로 이관: `statuscache`의 15초 갱신을 구독해서 전환을 감지하고
  알림을 보냄. **디바운스**: 15초는 순간 blip을 잡을 만큼 짧아서, 새 상태가 연속
  2회(=`defaultConfirmations`, ~30초) 유지돼야 "전환"으로 확정 → 알림. (이 confirmed/
  pending 분리가 나중에 붙일 "일시적 vs 지속적" incident 분석의 1차 필터이기도 함.)
- **상태 지속**: `data/status.json`(git 추적) → `internal/servicestate`의 Postgres
  `service_status` 테이블. Render 무료는 영구 디스크가 없어서 파일은 재시작 시 사라짐.
  `DATABASE_URL` 없으면 기존 no-op 패턴대로 메모리로만 유지(재시작 시 기준선 초기화 →
  재시작 직후 첫 전환 1회는 "최초 기록"으로 알림 생략). 기존 이력은 마이그레이션 안
  하고 "지금부터 쌓기"(git 커밋 히스토리는 리포에 그대로 남아 조회 가능).
- **삭제**: `backend/cmd/checkstatus/`, `backend/internal/statusstore/`,
  `backend/data/status.json`.
- **`monitor.yml` 축소**: `go run` 제거, 15분 크론으로 `/healthz`만 확인하는 2차
  안전망. 무응답 시 잡 실패(→ GitHub이 소유자에게 메일) + `DISCORD_WEBHOOK_OPS`
  설정 시 거기에도 알림.
- **⚠️ 시크릿 이동**: `RESEND_*`, `ALERT_EMAIL_TO`, `DISCORD_WEBHOOK_*`는 이제 GitHub
  Actions Secrets가 아니라 **Render 환경변수**에 있어야 알림이 나감. (RESEND_*는
  문의 폼 때문에 이미 있을 것. Discord 웹훅 6개가 신규 이동 대상.)
- **⚠️ 알림 신뢰성이 서버 가동에 종속됨**: 예전 Actions는 독립적이라 서버가 죽어도
  알림은 갔음. 이제 서버가 자면 알림도 침묵 → 외부 핑거(2분)가 생명줄. 750h/월
  한도도 확인 필요(상시 1개면 ~730h로 빠듯).

## 2026-09-07 — 장애 패턴 AI 분석 (incidents)

포트폴리오용 AI 기능. 확정된 장애를 "일시적 vs 지속적"으로 판정하고 근거를
자연어로 보여준다. **LLM은 요청 시점이 아니라 장애 확정 시점에만 1회 호출** —
결과를 `incidents` 행에 저장하고, 엔드포인트/프론트는 저장된 값만 읽는다.

파이프라인 (전부 조용히 degrade — DB/키 없으면 그 부분만 생략):
1. `statemonitor.OnTransition` → `internal/incidents`
   - 정상→장애: `incidents` 행 INSERT (started_at, down_status, context_tag).
     이후 goroutine에서: 요약문 생성 → 임베딩(`internal/embed`) → JSONB 저장
     → SQL 집계 통계(`incidentstore.Stats`) → LLM 판정(`internal/incidentai`) → 저장
   - 장애→정상: 해당 서비스의 열린 incident에 resolved_at + duration_minutes UPDATE
2. `GET /api/incidents/{site}/analysis` — 저장된 최신 incident + verdict + history 반환
   (`{hasData, analysisPending, incident, history}`). 20/분 리미터, LLM 호출 없음.
3. 프론트: `DetailModal`에서 비정상 서비스일 때 `AiAnalysisSection` 노출 —
   버튼 클릭 → 위 엔드포인트 → verdict 카드. 문구는 `text.js`의 `aiAnalysis`.

설계 메모:
- **provider: OpenAI 하나** — 판정 `gpt-4o-mini` + 임베딩 `text-embedding-3-small`,
  키 하나(`OPENAI_API_KEY`)로 커버. raw HTTPS POST, SDK 없음(mailer와 동일 스타일).
  판정은 `response_format: json_object` + 방어적 파싱. 모델은 `incidentai.Model` 상수.
  (Claude로 되돌리려면 `incidentai.go`의 요청/응답 shape ~30줄만 교체.)
- **임베딩**: `incidents.embedding`은 `JSONB([]float32)`. 지금 retrieval은 SQL
  집계(같은 시간대/요일/학사맥락 장애 건수·복구시간 중앙값, 24h 재발). pgvector
  코사인 검색은 데이터가 ~30건 넘으면 마이그레이션 + 쿼리 변경으로 승격
  (컬럼만 미리 채워둠).
- **`context_tag`** (`internal/academic`): 3·9월 첫 10일=개강주, 4·10월/6·12월
  중순=시험기간, 나머지=평시. 실제 학사일정 아닌 휴리스틱(장애가 이 시기에 몰림).
- **`duration_minutes`가 정답 레이블로 자동 축적** → 나중에 "판정 vs 실제 결과"
  정확도 eval 붙일 수 있음 (아직 미구현, 2차).
- **⚠️ 신규 env (Render)**: `OPENAI_API_KEY` 하나. 없어도 서비스는 정상 — 장애는
  계속 기록되고 임베딩/판정만 생략됨.
- 초기 데이터: 백필 없이 "지금부터 쌓기". 첫 몇 건은 history 부족으로 "판단보류"가
  자주 나올 것(프롬프트가 그렇게 지시).

## 2026-09-08 — 평상시 안정성 요약 + blip 필터 + AI 호출 가드레일

기존 AI는 "장애 확정 + 90초 지속"일 때만 호출돼서, 정상/느린 서버에서는 모달에
템플릿 한 줄("기록된 접속 오류 N건 · 대체로 M분 내 정상화")만 나왔다. 이제 모든
상태에서 "서버 안정성 확인" 요약을 보여준다 — 관측된 정상 접속 비율을 "약 N%
확률로 안정적으로 접속" 형태로 제시하고, 최근 오류 이력·현재 상태를 담담한 톤으로
정리(조언·명령조 없음). 설계 원칙(요청 경로에서 LLM 호출 안 함)은 그대로 —
지표는 결정론적으로 계산하고 문장만 캐시한다.

- **blip 필터** (`incidentstore.BlipThresholdSeconds = 60`): `Resolve`가 복구까지
  60초 미만이면 `incidents.blip = TRUE`로 마킹. `Stats`/`Recent`가 `blip = FALSE`만
  집계 → 15초 깜빡임이 median·건수를 왜곡하지 않음. 0분 표기도 프론트에서
  "1분 미만"으로.
- **결정론적 스코어카드** (`internal/servicehealth`, 순수 함수 + 테스트):
  `incidentstore.Stats`(7d/30d 건수·다운분, 첫/마지막 장애 시각 추가) →
  관측일수, 7d/30d 가동률(관측 기간이 짧으면 창을 그만큼 축소, <1h면 -1),
  마지막 장애 경과일, level(`solid`/`mostly-stable`/`shaky`/`down`).
- **LLM 요약문** (`incidentai.Summarize`, `gpt-4o-mini` 1콜): 스코어카드 수치를
  2~3문장으로 다듬기만. grounding 규칙 = 판정 프롬프트와 동일(수치 밖 사실 금지).
  프롬프트에 `services.Service.Purpose`(사이트별 용도: 이캠=강의·과제, 샘물=학사행정
  등)를 넣어, 불안정 시 영향받는 작업을 언급하더라도 그 사이트 용도에 맞추게 함
  (예전엔 이캠에도 "수강신청 유의"가 떴음).
- **캐시**: `service_summaries` 테이블(site_key PK, scorecard JSONB, inputs_hash,
  blurb, first_seen_at). `internal/incidents.RefreshSummary`가 스코어카드 계산 →
  `InputsHash`(거친 필드만: level·건수·가동률·경과일·복구중앙값. 응답시간/일 미만
  나이 제외) 변화 or blurb 24h 초과 or blurb 없음일 때만 LLM 재호출.
- **트리거**: `cmd/server`가 (1) 부팅 30초 후 + 20분마다 `RefreshAllSummaries`,
  (2) 상태 전환 시 해당 서비스 `RefreshSummary`. 전부 goroutine, 요청 경로 아님.
- **AI 호출 가드레일** (`internal/incidents`):
  - **월 지출 상한 (하드)**: `incidentstore.ConsumeAIBudget`가 매 OpenAI 호출 전
    `ai_usage (month, kind, calls)` 카운터를 원자적으로 증가시키고 한도 초과면
    거부. DB 카운터라 재시작 루프로 리셋 안 됨. 한도: verdict 700 / blurb 1200 /
    embed 8000 (월). gpt-4o-mini ≈ $0.0004/콜 → 최악 월 ~$0.76 + 임베딩 ~$0.02
    ⇒ **월 $1 미만**. 호출 실패 시 `RefundAIBudget`로 환불.
  - 요약문 LLM: 위 월 상한 + 프로세스-일 `dailyBlurbBudget = 50` (인메모리 스무딩).
  - 장애 판정 LLM: `enrich`에서 `Flapping24hCount >= 4`면 규칙 기반
    "판단보류"(`verdict_model = "rule:flapping"`)로 저장하고 LLM 생략;
    `LastVerdictAt`이 30분(`reanalyzeCooldown`) 이내면 생략. 임베딩 호출은 이
    가드들 통과 후로 미룸(플래핑 시 낭비 방지).
  - `incidentai.Enabled()`로 키 없으면 예산 소비 자체를 건너뜀.
- **API**: `GET /api/incidents/{site}/analysis` 응답에 `summary`(scorecard+blurb)
  추가. 장애 이력이 아예 없어도 summary만 있으면 `hasData: true`.
- **프론트**: `AiAnalysisSection`의 `StabilityBlock`이 모든 상태에서 렌더 —
  blurb 있으면 우선, 없으면 `text.js`의 `scorecardSentence`(결정론적 문장) 폴백.
  문구 전부 `text.js`의 `aiAnalysis`.
- **RAG 아님**: 임베딩은 여전히 저장만 하고 retrieval에 안 씀. 스코어카드는 SQL
  집계 기반 grounding이지 벡터 검색이 아니다. pgvector 승격은 코퍼스 커진 뒤 별도.
- **⚠️ DB 스키마**: `incidents.blip` 컬럼 + `service_summaries` 테이블은
  `incidentstore.New`의 `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN
  IF NOT EXISTS`로 자동 마이그레이션. 기존 행의 `blip`은 FALSE(과거 0분 건은 그대로
  남지만 신규만 필터됨).

## 모니터링 아키텍처 변경 (핵심, 2026-08 — 아래 일부는 위 2026-09-07 업데이트로 대체됨)

기존엔 Express 서버 안에서 `node-cron`으로 5분마다 자체 점검했는데, Render 무료 티어는 트래픽 없으면 프로세스가 잠들어서 그 안의 cron도 같이 멈추는 문제가 있었음(카톡 알림 자동화를 얹어도 서버가 자고 있으면 못 감지). 그래서 모니터링을 서버에서 완전히 분리함. (아래 "백엔드: Express → Go" 절에서 실제 파일은 Go로 다시 바뀌었지만, 이 분리 구조 자체는 그대로 유지됨.)

- 상태 체크 로직: HTTP API 서버와 모니터 스크립트가 공유하는 순수 로직.
- 모니터 스크립트: GitHub Actions가 실행하는 1회성 점검. 상태 기록하고, 실제 상태 전환(최초 기록 제외)에만 알림 발송.
- 메일러: SMTP 자격증명 없으면 조용히 skip.
- 카카오 알림: **아직 no-op 플레이스홀더.** 카카오톡 채널 자체가 아직 없음(사용자 확인함). 구독자 대상 실시간 브로드캐스트가 목적이라 "카카오톡 채널 친구 대상 메시지 API"(친구톡) 방향이 맞음 — "나에게 보내기"(개인용)나 알림톡(사업자 인증 필요)은 해당 안 됨. `KAKAO_ADMIN_KEY` env가 있으면 동작하도록 자리만 잡아둠. **다음 단계**: 카카오톡 채널 개설 → 카카오 비즈니스에서 "메시지 API" 사용 신청(심사) → Admin 키 발급 → 실제 발송 호출 구현 + GitHub secret 등록.
- `.github/workflows/monitor.yml`: `*/5 * * * *` 크론으로 모니터 스크립트 실행. `backend/data/status.json`이 실제로 바뀐 경우에만 봇 커밋으로 리포에 다시 push(상태 전환 이력이 git log에 남음). GitHub Actions 러너는 매번 새로 체크아웃되는 휘발성 환경이라, 상태 지속을 위해 `data/status.json`을 git 추적 대상으로 함(예전엔 Render 로컬 디스크 전용이라 gitignore였음).

## 프론트엔드: CRA → Next.js (App Router) 전환 (핵심)

검색 노출 목표 키워드(`상명대 서버상태`, `상명대 서버`, `이캠 서버`, `이캠 안됨`, `상명대 이캠 안됨`)가 생겨서 순수 CSR인 CRA를 버리고 Next.js로 옮김. CRA는 크롤러가 받는 최초 HTML이 빈 껍데기라 색인에 불리함.

- `src/app/layout.js`: `metadata` export로 title/description/OG 태그를 서버에서 렌더 — 크롤러가 JS 실행 없이도 바로 읽음. GA는 `next/script`로 이전.
- `src/app/page.js`: 서버 컴포넌트. `<StatusDashboard/>`(클라이언트) 위/아래로 목표 키워드가 실제로 들어간 소개 문단(`<h1>`, `<p>`)을 서버 렌더 — `npm run build` 후 프로덕션 서버로 확인, 최초 HTML에 모든 키워드 문구가 존재함을 검증함.
- `src/components/StatusDashboard.jsx`: 예전 `App.js`의 폴링 로직 그대로, `'use client'`로 표시. Navbar/MainBg/StatusBar/Footer는 변경 없음.
- `src/app/robots.js`, `src/app/sitemap.js`: Next 파일 컨벤션으로 자동 생성.
- CRA 잔재 제거: `src/index.js`, `reportWebVitals`, `react-scripts`/`web-vitals`/`testing-library` 의존성, 그리고 **git에 커밋되던 `build/` 폴더**(Next의 `.next/`는 gitignore 대상이라 이제 커밋 안 함 — 예전 CRA 특이 구조는 더 이상 해당 없음).
- Next 16.3.0 사용(`npm install next@latest`로 postcss/sharp 취약점 있던 15.x 회피, `npm audit` 0건 확인).

### 로컬 개발 명령어 변경

예전 `npm start`(CRA) → 이제 `npm run dev`(Next dev 서버, 기본 포트 3000). 프로덕션 미리보기는 `npm run build && npm start`.

## 스타일링: styled-components → Tailwind CSS

App Router에서 styled-components는 SSR용 배선(`lib/registry.jsx` + `next.config.js`의 `compiler.styledComponents`)이 따로 필요해서, Next.js가 기본으로 미는 Tailwind로 교체함.

- Tailwind v4 (`npm install tailwindcss @tailwindcss/postcss postcss`) — v4는 `tailwind.config.js` 없이 zero-config, `postcss.config.mjs`에 플러그인 등록 + `globals.css` 맨 위에 `@import "tailwindcss";`만 있으면 됨.
- `Navbar`/`MainBg`/`StatusBar`/`Footer`를 `styled.div` → 일반 엘리먼트 + Tailwind 유틸리티 클래스로 전환. `StatusBar`의 상태등 색상(`statusColor`)은 런타임에 결정되는 값이라 Tailwind 클래스로 못 박아둘 수 없어서 `style={{ backgroundColor: ... }}` 인라인 스타일 그대로 유지.
- `lib/registry.jsx`, `next.config.js`의 styled-components 컴파일러 옵션, `styled-components` 의존성 전부 제거.
- IDE의 Tailwind lint가 임의값 클래스(`h-[50px]`, `max-w-[720px]`)에 표준 스케일 클래스(`h-12.5`, `max-w-180`)를 쓰라고 제안해서 그대로 반영함.

## 백엔드: Express(Node) → Go 재작성

원래 군대에서 빠르게 만든다고 Express로 시작한 건데, 이번엔 실서비스로 쓸 리포를 그대로 Go 연습 겸 재작성함(별도 연습 프로젝트가 아니라 이 리포 `backend/`를 통째로 교체 — 사용자가 직접 선택함). API 계약(엔드포인트 경로, JSON 응답 모양)은 그대로 유지해서 프론트엔드는 손 안 댐.

- `backend/go.mod`: 모듈명 `smu-server-status-viewer/backend`, Go 1.26.
- `backend/cmd/server/main.go`: HTTP API 서버 (`net/http` 표준 라이브러리). 엔드포인트 4개(`/status/home`, `/status/notice`, `/status/sammul`, `/status/ecampus`) 동일. CORS는 직접 미들웨어로 구현(허용 origin 1개만), rate limit도 `internal/ratelimit`으로 직접 구현한 고정 윈도우 리미터(분당 20회, express-rate-limit과 동일 스펙) — 여러 인스턴스로 스케일하면 메모리 기반이라 안 맞지만 지금 단일 인스턴스 구조엔 문제없음. 클라이언트 IP는 `X-Forwarded-For`에서 읽음(Render 리버스 프록시 뒤라 예전 `trust proxy` 설정과 동일한 이유).
- `backend/cmd/checkstatus/main.go`: GitHub Actions가 실행하는 1회성 점검 스크립트 (`go run ./cmd/checkstatus`). 예전 `check-status.js`와 동일한 흐름.
- `backend/internal/statuschecker`: 상태 체크 로직 — GET + 브라우저 User-Agent + 5초 타임아웃 + 리다이렉트 5회 제한, 예전 로직과 동일. `Result.ResponseTime`은 Go에서 `any` 타입으로 선언해서, JS 때처럼 보통은 숫자(ms)로, timeout일 땐 문자열 `"N/A"`로 직렬화됨 — **프론트엔드가 기대하는 응답 모양이 그대로 유지되도록 의도적으로 이렇게 함.**
- `backend/internal/statusstore`: `data/status.json` 읽기/기록 로직 그대로 이식.
- `backend/internal/mailer`: `gopkg.in/gomail.v2`로 SMTP 발송. SMTP 자격증명/수신자 없으면 조용히 skip하는 동작 동일. `SMTP_SECURE` env는 이제 안 씀(포트로 TLS 방식 자동 판단).
- `backend/internal/kakao`: 예전과 동일한 no-op 플레이스홀더.
- 로컬 실행: `cd backend && go run ./cmd/server` (기본 포트 5000, macOS는 AirPlay가 5000 쓰니 `PORT=5050 go run ./cmd/server` 권장). 빌드: `go build -o smu-server ./cmd/server`.
- 검증 완료: `go build/vet/gofmt` 클린, 서버 4개 엔드포인트 + CORS preflight/허용-비허용 origin 헤더 + rate limit(21번째 요청부터 429) 스모크 테스트, `checkstatus`도 빌드된 바이너리와 `go run`(CI가 쓰는 방식) 둘 다 확인.

## 배포 관련 — 아직 안 한 것

- **Render/Vercel 대시보드 재연결 안 함.** 지금은 로컬 레포만 새 GitHub 주소(`jiwonsudo/smu-server-status-viewer`)로 push된 상태. 실제 자동배포가 되려면:
  - Render: 기존 백엔드 서비스의 연결된 GitHub 레포를 `smu-server-status-viewer`으로 바꾸고 Root Directory를 `backend`로 설정. **런타임이 Node → Go로 바뀌었으니 Render의 Environment를 "Go"로, Build Command를 `go build -o smu-server ./cmd/server`, Start Command를 `./smu-server`로 설정해야 함.** `.env`(SMTP_*, ALERT_EMAIL_TO)도 그대로 다시 넣어야 함(레포 바뀌어도 환경변수는 안 넘어옴).
  - Vercel: 프로젝트의 연결 레포를 `smu-server-status-viewer`으로 바꾸고 Root Directory `frontend`로 설정. **Framework Preset이 Next.js로 잡히는지 확인**(CRA 프리셋으로 남아있으면 빌드 깨짐).
  - GitHub Actions 워크플로우가 이메일/카카오 알림을 보내려면 **Settings → Secrets and variables → Actions**에 `SMTP_HOST/PORT/USER/PASS/FROM`, `ALERT_EMAIL_TO`, (나중에) `KAKAO_ADMIN_KEY` 등록 필요.
- FE의 `URL_ROOT`가 여전히 `https://smu-server-status-viewer-be.onrender.com`로 하드코딩됨 — Render 서비스 자체 URL은 레포만 바꾸면 유지되니 재배포 후에도 그대로 쓸 수 있음. 다만 서비스를 완전히 새로 만드는 경우엔 URL이 바뀌므로 확인 필요.
- `layout.js`의 `metadataBase`/OG `url`/`sitemap.js`/`robots.js`가 전부 `https://smu-server-status-viewer.vercel.app`로 하드코딩됨 — Vercel 도메인이 바뀌면 같이 고쳐야 함.
- BE `/status/notice` 엔드포인트는 그대로 남아있음(FE에서 안 씀).
