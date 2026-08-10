require('dotenv').config();

const { checkServiceStatus, SERVICE_URL } = require('../lib/statusChecker');
const statusStore = require('../lib/statusStore');
const { sendStatusChangeEmail } = require('../lib/mailer');
const { sendStatusChangeKakao } = require('../lib/kakaoNotifier');

const MONITORED_SERVICES = ['HOME', 'SAMMUL', 'ECAMPUS'];

// GitHub Actions 스케줄에서 1회 실행되는 상태 점검 스크립트.
// 상태가 바뀐 서비스가 하나라도 있으면 data/status.json이 갱신되고,
// 워크플로우가 그 diff를 감지해 커밋 + 알림 발송을 트리거한다.
async function main() {
  let anyChanged = false;

  for (const serviceName of MONITORED_SERVICES) {
    const result = await checkServiceStatus(SERVICE_URL[serviceName]);
    const { changed, previousStatus } = statusStore.recordStatus(serviceName, result.status);

    if (changed) {
      anyChanged = true;
      console.log(`[check-status] ${serviceName}: ${previousStatus ?? '(최초 기록)'} -> ${result.status}`);

      if (previousStatus !== null) {
        await Promise.all([
          sendStatusChangeEmail(serviceName, previousStatus, result.status),
          sendStatusChangeKakao(serviceName, previousStatus, result.status),
        ]);
      }
    }
  }

  if (!anyChanged) {
    console.log('[check-status] 변경 없음.');
  }
}

main().catch((error) => {
  console.error('[check-status] 실행 중 오류:', error);
  process.exit(1);
});
