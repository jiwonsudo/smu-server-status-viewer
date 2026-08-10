const axios = require('axios');

const SERVICE_URL = {
  HOME: 'https://www.smu.ac.kr/kor/index.do',
  NOTICE: 'https://www.smu.ac.kr/kor/life/notice.do',
  SAMMUL: 'https://smul.smu.ac.kr/',
  ECAMPUS: 'https://ecampus.smu.ac.kr/',
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

async function checkServiceStatus(url) {
  const start = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 5000,
      maxRedirects: 5,
      headers: BROWSER_HEADERS,
      responseType: 'stream',
    });
    response.data.destroy(); // 응답 바디는 필요 없으므로 즉시 스트림 종료
    const duration = Date.now() - start;

    if (response.status === 200) {
      return {
        status: 'ok',
        responseTime: duration,
        message: '정상 서비스',
      };
    } else {
      return {
        status: 'error',
        responseTime: duration,
        message: `서비스 비정상: ${response.status}`,
      };
    }
  } catch (error) {
    const duration = Date.now() - start;
    if (error.code === 'ECONNABORTED') {
      return {
        status: 'timeout',
        responseTime: 'N/A',
        message: '매우 느림(비정상)',
      };
    } else {
      return {
        status: 'error',
        responseTime: duration,
        message: '서비스 접속 실패',
        error: error.message,
      };
    }
  }
}

module.exports = { checkServiceStatus, SERVICE_URL };
