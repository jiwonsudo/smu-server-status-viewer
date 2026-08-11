# SMU Server Status Viewer — 작업 컨텍스트 (2026-08-10)

이 워크스페이스는 이제 단일 모노레포. `https://github.com/jiwonsudo/smu-server-status-viewer` 로 push 완료됨.
- `frontend/`, `backend/` 둘 다 이 워크스페이스 루트의 git 저장소(하나의 `.git`)에 포함됨.
- 기존 두 레포(`SMU-Server-Status-Viewer`, `SMU-Server-Status-Viewer-BE`)의 커밋 히스토리는 `git subtree add`로 각각 `frontend/`, `backend/` 프리픽스 아래 보존해서 가져옴 — `git log`에서 예전 커밋도 그대로 조회 가능.
- 예전 두 레포의 로컬 작업 사본은 `frontend.old-standalone-repo/`, `backend.old-standalone-repo/`로 이름만 바꿔서 백업 보존 중(`.gitignore`에 추가해서 새 모노레포엔 안 들어감). 배포 전환 확인되면 삭제해도 됨.
- 기존 GitHub 레포 2개(`SMU-Server-Status-Viewer`, `SMU-Server-Status-Viewer-BE`)는 아직 그대로 살아있음. **삭제하지 말고 Archive 권장** — 새 모노레포로 배포 전환 확인 후에.

## 모니터링 아키텍처 변경 (핵심)

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
