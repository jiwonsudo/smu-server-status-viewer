# 변경 이력 (Changelog)

스뮤온(SMUON) / 상명대 서버 상태 뷰어의 버전별 변경 이력.

버전은 [유의적 버전](https://semver.org/lang/ko/)을 따르며, 태그가 없던 초기
구간은 git 히스토리의 마일스톤을 기준으로 소급해서 매겼다. 상세 설계 배경은
루트의 `CONTEXT.md` 참고.

- 서비스 URL: <https://issmuok.site>
- 저장소: <https://github.com/jiwonsudo/smu-server-status-viewer>

---

## v2.0.0 — 2026-09-07

**상시 가동 서버로 모니터링 통합 + AI 장애 패턴 분석.**

### 추가
- **AI 장애 패턴 분석**: 장애가 확정되면 과거 이력을 근거로 "일시적 / 지속적 /
  판단보류"를 판정하고 근거·예상 복구 시간을 자연어로 보여준다. LLM(`gpt-4o-mini`)은
  장애당 1회만 호출하고 결과를 DB에 저장 — 조회 시점엔 호출하지 않는다. 판정 근거는
  SQL 집계(같은 시간대·요일·학사맥락 장애 빈도, 복구시간 중앙값, 24시간 내 재발).
  incident 요약문 임베딩 파이프라인도 함께 구축(현재는 저장만, pgvector 승격 대비).
- 상세 모달에 **"장애 이력 / 최근 안정성"** 섹션 상시 노출 — 정상일 때도 이 서비스의
  과거 장애 건수·복구 시간·최근 목록을 볼 수 있다.
- 2차 안전망: 외부 업타임 핑거가 죽었을 때를 감지하는 15분 간격 `/healthz` 워크플로.
- 관리자용 재분석 엔드포인트(`POST /api/incidents/{id}/reanalyze`, `ADMIN_TOKEN` 게이트).

### 변경
- **콜드스타트 제거**: 방문 시 몇 초간 "서버 확인 중"이 뜨던 문제.
  - 프론트: 상태 데이터를 15초 TTL로 캐시(ISR) → Vercel이 즉시 서빙, 갱신은 백그라운드.
    Render 콜드스타트가 첫 화면을 더 이상 막지 않는다.
  - 백엔드: 상태 캐시 첫 갱신을 논블로킹으로 → 서버·`/healthz`가 부팅 즉시 응답.
  - keepalive를 GitHub Actions 크론(지연·누락 잦음)에서 외부 업타임 핑거(2분)로 이관.
- **모니터링을 상시 가동 Go 서버로 통합**: 상태 전환 감지·알림을 5분 주기 GitHub
  Actions 스크립트에서 서버 내부(`internal/statemonitor`)로 옮김. 15초 갱신에 붙어
  30초 이상 지속되는 전환만 알림 — 순간 blip은 무시한다.
- 상태 기준선을 git 추적 `data/status.json`에서 Postgres 테이블로 이관.
- 짧은 장애(90초 내 복구)는 이력에는 남기되 AI 분석은 생략 — 잦은 blip에 비용을 쓰지 않는다.

### 제거
- `backend/cmd/checkstatus`, `backend/internal/statusstore`, `backend/data/status.json`.

### 이관 필요 (운영)
- 알림 관련 환경변수(`RESEND_*`, `ALERT_EMAIL_TO`, `DISCORD_WEBHOOK_*`)를 GitHub Actions
  Secrets → **Render 환경변수**로.
- 신규 환경변수(선택): `OPENAI_API_KEY`(AI 분석·임베딩), `ADMIN_TOKEN`(재분석), `DISCORD_WEBHOOK_OPS`(안전망).

---

## v1.1.0 — 2026-08-12 ~ 08-13

**실시간화 + 알림 채널 전환 + 커스텀 도메인.**

### 추가
- 상태 점검 결과를 서버에서 15초마다 캐시 → 방문자 수와 무관하게 SMU로 나가는
  요청이 고정. 클라이언트 폴링 대신 **SSE**로 갱신 순간을 그대로 푸시.
- 커스텀 도메인 `issmuok.site` (API는 `api.issmuok.site`).
- 문의 폼: 비방·허위사실 관련 고지 + 동의 체크박스, 이름/닉네임 필수.

### 변경
- **알림을 Kakao에서 Discord 웹훅으로 전환** — 로그인·구독자 관리 없이 채널 참여만으로
  실시간 알림. 사이트별 채널로 분리해 관심 없는 건 뮤트 가능.
- 이메일 발송을 SMTP → Resend HTTP API (Render가 아웃바운드 SMTP 포트를 막음).
- 상태 인디케이터를 카드 왼쪽 테두리 → 상단 바로.
- SEO/OG 마감: 검색 제목 확장, 공유용 제목 분리, 손수 디자인한 OG 이미지.

### 성능
- Pretendard 가변 폰트 서브셋 2MB → 117KB.
- Lighthouse 기반 접근성·성능 수정, Postgres 커넥션 풀 상한.

---

## v1.0.0 — 2026-08-10 ~ 08-11

**모노레포 통합 + 전면 재작성.** 군 복무 중 급조한 프로토타입을 실서비스용으로
다시 씀. API 계약(엔드포인트 경로, 응답 모양)은 유지해 마이그레이션을 무중단으로.

### 변경
- 프론트/백엔드 두 저장소를 **단일 모노레포**로 통합 (커밋 히스토리 보존).
- 프론트: **CRA → Next.js (App Router)** — 크롤러가 JS 실행 없이 상태를 읽도록 SSR.
- 스타일: **styled-components → Tailwind CSS**.
- 백엔드: **Express(Node) → Go** 재작성 (표준 라이브러리 `net/http`, 최소 의존성).
- 모니터링을 Express 프로세스에서 분리 → GitHub Actions 크론 (Render 무료 티어가
  트래픽 없으면 프로세스를 재우는 문제 대응).
- 패키지 매니저 npm → pnpm.

### 추가
- Kakao 로그인 + 사이트별 알림 구독, Postgres 기반 조회수 집계.
- UI 전면 리디자인: 모달 시스템, 내비게이션 재구성.
- SEO 오버홀: SSR 초기 상태, 리치 메타데이터, FAQ 구조화 데이터, robots/sitemap.

### 제거
- 모니터링 대상에서 학술정보관(도서관).

---

## v0.x — 프로토타입 (2025-05 ~ 2026-08)

`smu-uptime` 이름의 초기 버전. **Express + Create React App.**

- 홈·공지·이캠퍼스 상태 점검 API, CORS 화이트리스트, 분당 요청 리미터, 응답시간 표시.
- `node-cron` 자체 점검 + 상태 변경 시 이메일 알림, SAMMUL(샘물) 엔드포인트.
- styled-components 기반 UI, Google Analytics.
- 초기 커밋: 2025-05-04.
