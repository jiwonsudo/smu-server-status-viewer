const cron = require('node-cron');
const statusStore = require('./statusStore');
const { sendStatusChangeEmail } = require('./mailer');

const MONITORED_SERVICES = ['HOME', 'SAMMUL', 'ECAMPUS'];

// 5분마다 지정된 서비스들을 자체 점검하고, 상태가 바뀐 경우에만 메일을 보낸다.
function startMonitor(serviceURL, checkServiceStatus) {
  const runCheck = async () => {
    for (const serviceName of MONITORED_SERVICES) {
      const result = await checkServiceStatus(serviceURL[serviceName]);
      const { changed, previousStatus } = statusStore.recordStatus(serviceName, result.status);

      if (changed && previousStatus !== null) {
        await sendStatusChangeEmail(serviceName, previousStatus, result.status);
      }
    }
  };

  cron.schedule('*/5 * * * *', runCheck);

  // 서버 기동 시 최초 1회 즉시 점검하여 기준 상태를 기록한다.
  runCheck();
}

module.exports = { startMonitor };
