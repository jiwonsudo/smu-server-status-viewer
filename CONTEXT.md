# SMU Server Status Viewer — 작업 컨텍스트 (2026-08-10)

이 워크스페이스는 이제 단일 모노레포. `https://github.com/jiwonsudo/smu-uptime` 로 push 완료됨.
- `frontend/`, `backend/` 둘 다 이 워크스페이스 루트의 git 저장소(하나의 `.git`)에 포함됨.
- 기존 두 레포(`SMU-Server-Status-Viewer`, `SMU-Server-Status-Viewer-BE`)의 커밋 히스토리는 `git subtree add`로 각각 `frontend/`, `backend/` 프리픽스 아래 보존해서 가져옴 — `git log`에서 예전 커밋도 그대로 조회 가능.
- 예전 두 레포의 로컬 작업 사본은 `frontend.old-standalone-repo/`, `backend.old-standalone-repo/`로 이름만 바꿔서 백업 보존 중(`.gitignore`에 추가해서 새 모노레포엔 안 들어감). 배포 전환 확인되면 삭제해도 됨.
- 기존 GitHub 레포 2개(`SMU-Server-Status-Viewer`, `SMU-Server-Status-Viewer-BE`)는 아직 그대로 살아있음. **삭제하지 말고 Archive 권장** — 새 모노레포로 배포 전환 확인 후에.

## 모니터링 아키텍처 변경 (핵심)

기존엔 Express 서버 안에서 `node-cron`으로 5분마다 자체 점검했는데, Render 무료 티어는 트래픽 없으면 프로세스가 잠들어서 그 안의 cron도 같이 멈추는 문제가 있었음(카톡 알림 자동화를 얹어도 서버가 자고 있으면 못 감지). 그래서 모니터링을 서버에서 완전히 분리함.

- `backend/lib/statusChecker.js`: `checkServiceStatus`/`SERVICE_URL` — Express 엔드포인트와 모니터 스크립트가 공유하는 순수 로직.
- `backend/scripts/check-status.js`: GitHub Actions가 실행하는 1회성 점검 스크립트. `statusStore`로 상태 기록하고, 실제 상태 전환(최초 기록 제외)에만 알림 발송.
- `backend/lib/mailer.js`: 기존 그대로(SMTP 자격증명 없으면 조용히 skip).
- `backend/lib/kakaoNotifier.js`: **아직 no-op 플레이스홀더.** 카카오톡 채널 자체가 아직 없음(사용자 확인함). 구독자 대상 실시간 브로드캐스트가 목적이라 "카카오톡 채널 친구 대상 메시지 API"(친구톡) 방향이 맞음 — "나에게 보내기"(개인용)나 알림톡(사업자 인증 필요)은 해당 안 됨. `KAKAO_ADMIN_KEY` env가 있으면 동작하도록 자리만 잡아둠. **다음 단계**: 카카오톡 채널 개설 → 카카오 비즈니스에서 "메시지 API" 사용 신청(심사) → Admin 키 발급 → `kakaoNotifier.js`에 실제 발송 호출 구현 + GitHub secret 등록.
- `.github/workflows/monitor.yml`: `*/5 * * * *` 크론으로 `check-status.js` 실행. `backend/data/status.json`이 실제로 바뀐 경우에만 봇 커밋으로 리포에 다시 push(상태 전환 이력이 git log에 남음). GitHub Actions 러너는 매번 새로 체크아웃되는 휘발성 환경이라, 상태 지속을 위해 `data/status.json`을 이제 git 추적 대상으로 바꿈(예전엔 Render 로컬 디스크 전용이라 gitignore였음).
- `backend/server.js`: `startMonitor`/`node-cron` 제거. 이제 순수하게 요청 기반 API 서버.

## 배포 관련 — 아직 안 한 것

- **Render/Vercel 대시보드 재연결 안 함.** 지금은 로컬 레포만 새 GitHub 주소(`jiwonsudo/smu-uptime`)로 push된 상태. 실제 자동배포가 되려면:
  - Render: 기존 백엔드 서비스의 연결된 GitHub 레포를 `smu-uptime`으로 바꾸고 Root Directory를 `backend`로 설정. `.env`(SMTP_*, ALERT_EMAIL_TO)도 그대로 다시 넣어야 함(레포 바뀌어도 환경변수는 안 넘어옴).
  - Vercel: 마찬가지로 프로젝트의 연결 레포를 `smu-uptime`으로 바꾸고 Root Directory `frontend`로 설정.
  - GitHub Actions 워크플로우가 이메일/카카오 알림을 보내려면 **Settings → Secrets and variables → Actions**에 `SMTP_HOST/PORT/SECURE/USER/PASS/FROM`, `ALERT_EMAIL_TO`, (나중에) `KAKAO_ADMIN_KEY` 등록 필요.
- FE의 `URL_ROOT`가 여전히 `https://smu-server-status-viewer-be.onrender.com`로 하드코딩됨 — Render 서비스 자체 URL은 레포만 바꾸면 유지되니 재배포 후에도 그대로 쓸 수 있음. 다만 서비스를 완전히 새로 만드는 경우엔 URL이 바뀌므로 확인 필요.
- BE `/status/notice` 엔드포인트는 그대로 남아있음(FE에서 안 씀).
