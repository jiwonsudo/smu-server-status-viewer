// TODO: 카카오톡 채널 "친구 대상 메시지 API" 연동.
// 채널 개설 + 메시지 API 사용 신청(카카오 비즈니스 심사)이 끝나면
// KAKAO_ADMIN_KEY, KAKAO_SENDER_KEY 등을 GitHub Actions secrets에 넣고
// 아래 no-op을 실제 발송 호출(Kakao Developers 문서 기준)로 교체한다.
async function sendStatusChangeKakao(serviceName, previousStatus, currentStatus) {
  if (!process.env.KAKAO_ADMIN_KEY) {
    console.warn('[kakao] KAKAO_ADMIN_KEY가 없어 카카오톡 알림을 보내지 않습니다.');
    return;
  }

  console.warn('[kakao] 카카오톡 채널 메시지 API가 아직 연동되지 않았습니다.');
}

module.exports = { sendStatusChangeKakao };
