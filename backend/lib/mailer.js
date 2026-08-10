const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendStatusChangeEmail(serviceName, previousStatus, currentStatus) {
  const to = process.env.ALERT_EMAIL_TO;
  const mailer = getTransporter();

  if (!mailer || !to) {
    console.warn('[mailer] SMTP 또는 수신 이메일 설정이 없어 알림 메일을 보내지 않습니다.');
    return;
  }

  const subject = `[SMU 서버 상태] ${serviceName}: ${previousStatus ?? '알수없음'} → ${currentStatus}`;
  const text = `${serviceName} 서비스 상태가 변경되었습니다.\n\n이전 상태: ${previousStatus ?? '알수없음'}\n현재 상태: ${currentStatus}\n시각: ${new Date().toLocaleString('ko-KR')}`;

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error('[mailer] 알림 메일 발송 실패:', error.message);
  }
}

module.exports = { sendStatusChangeEmail };
