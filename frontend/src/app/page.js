import StatusDashboard from '../components/StatusDashboard';

export default function Home() {
  return (
    <>
      <div className="relative min-h-screen">
        <StatusDashboard />
      </div>
      <section className="mx-auto max-w-180 px-5 py-10 text-[#555]">
        <h1 className="text-[1.3em] text-[#333]">상명대학교 서버상태 실시간 확인</h1>
        <p className="leading-relaxed">
          상명대 서버(홈페이지), 이캠퍼스(이캠) 서버, 샘물 서버의 접속 가능 여부와 응답 속도를
          5분 간격으로 자동 점검합니다. 이캠 안됨, 상명대 서버 접속 장애 등 문제가 발생하면
          위 상태창에서 바로 확인할 수 있습니다.
        </p>
      </section>
    </>
  );
}
