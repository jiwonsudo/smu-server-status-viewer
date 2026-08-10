import StatusDashboard from '../components/StatusDashboard';

export default function Home() {
  return (
    <>
      <div className="dashboard-viewport">
        <StatusDashboard />
      </div>
      <section className="intro">
        <h1>상명대학교 서버상태 실시간 확인</h1>
        <p>
          상명대 서버(홈페이지), 이캠퍼스(이캠) 서버, 샘물 서버의 접속 가능 여부와 응답 속도를
          5분 간격으로 자동 점검합니다. 이캠 안됨, 상명대 서버 접속 장애 등 문제가 발생하면
          위 상태창에서 바로 확인할 수 있습니다.
        </p>
      </section>
    </>
  );
}
