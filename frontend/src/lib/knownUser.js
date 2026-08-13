// 이 브라우저에서 로그인을 완료한 적이 있는지를 localStorage에 남겨둔다.
// 처음 로그인하는 사람에게만 "카카오톡 메시지 전송 동의 필요" 경고와
// 스크린샷 안내를 보여주고, 이미 한 번 겪어본 사람(재로그인)한테는
// 매번 똑같은 설명을 반복해서 보여주지 않기 위한 용도다. 계정을 완전히
// 새로 만든 건지 정확히 아는 방법은 아니고(다른 브라우저/기기면 다시
// 뜬다) 어디까지나 UX용 추정치다.
const KEY = 'smu-known-user';

export function hasLoggedInBefore() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markLoggedIn() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등)해도 치명적이지 않음 — 다음에도 경고가 한 번 더 뜨는 정도
  }
}

export function clearKnownUser() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 무시 — 지워지지 않아도 기능상 문제 없음
  }
}
