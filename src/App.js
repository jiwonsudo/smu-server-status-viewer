import { useState, useEffect, useMemo, useRef } from 'react';
import { MainBg, Navbar, StatusBar, Footer } from './components';
import axios from 'axios';

const REFRESH_INTERVAL_MS = 60 * 1000;
const DELAY_NOTICE_MS = 8 * 1000; // Render 콜드스타트 대응: 이 시간 이상 응답이 없으면 지연 문구 표시

function App() {
  const [statusData, setStatusData] = useState([
    { statusMsg: null, statusColor: '#f0ad4e', responseTime: null },
    { statusMsg: null, statusColor: '#f0ad4e', responseTime: null },
    { statusMsg: null, statusColor: '#f0ad4e', responseTime: null }
  ]);
  const [isDelayed, setIsDelayed] = useState(false);

  const URL_ROOT = 'https://smu-server-status-viewer-be.onrender.com';

  const siteInfos = useMemo (() => {
    return [
    { title: '상명대학교 홈페이지', url: 'https://www.smu.ac.kr/kor/index.do', endpoint: '/status/home'},
    { title: '상명대학교 이캠퍼스', url: 'https://ecampus.smu.ac.kr/', endpoint: '/status/ecampus'},
    { title: '상명대학교 샘물', url: 'https://smul.smu.ac.kr/', endpoint: '/status/sammul'},
    ];
  }, []);

  const delayTimerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsDelayed(false);
      delayTimerRef.current = setTimeout(() => setIsDelayed(true), DELAY_NOTICE_MS);

      const promises = siteInfos.map((siteInfo, index) => {
        return axios
          .get(`${URL_ROOT}${siteInfo.endpoint}`)
          .then((response) => {
            const { status, message, responseTime } = response.data;
            let color = '#f0ad4e'; // default yellow
            if (status === 'ok') color = '#5cb85c'; // green
            else if (status === 'timeout' || status === 'error') color = '#d9534f'; // red

            setStatusData((prevData) => {
              const newData = [...prevData];
              newData[index] = { statusMsg: message, statusColor: color, responseTime: responseTime === 'N/A' ? `${responseTime}` : `${responseTime}ms` };
              return newData;
            });
          })
          .catch((error) => {
            let statusMsg = '상태 점검 실패';
            let statusColor = '#d9534f'; // red
            let responseTime = '점검 실패';

            if (error.response && error.response.status === 429) {
              statusMsg = '잠시 후 시도';
              responseTime = 'N/A';
            } else if (error.code === 'ECONNABORTED') {
              statusMsg = '매우 느림(비정상)';
              responseTime = 'N/A';
            }

            setStatusData((prevData) => {
              const newData = [...prevData];
              newData[index] = { statusMsg, statusColor, responseTime };
              return newData;
            });
          });
      });

      await Promise.all(promises);
      clearTimeout(delayTimerRef.current);
      setIsDelayed(false);
    };

    fetchData();
    const intervalId = setInterval(fetchData, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      clearTimeout(delayTimerRef.current);
    };
  }, [siteInfos]);

  return (
    <>
      <Navbar/>
      <MainBg>
        {siteInfos.map((siteInfo, index) => (
          <StatusBar
            key={siteInfo.title}
            title={siteInfo.title}
            url={siteInfo.url}
            href={siteInfo.url}
            statusMsg={statusData[index]?.statusMsg || (isDelayed ? '확인 지연(서버 기동 중...)' : '서버 확인 중...')}
            statusColor={statusData[index]?.statusColor || '#f0ad4e'}
            responseTime={statusData[index]?.responseTime || (isDelayed ? '잠시만 기다려주세요' : '응답 확인 중...')}
          />
        ))}
      </MainBg>
      <Footer/>
    </>
  );
}

export default App;
