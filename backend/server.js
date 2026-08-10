require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { startMonitor } = require('./lib/monitor');

const app = express();
const port = process.env.PORT || 5000;

// Render 등 프록시 뒤에서 실행되므로, X-Forwarded-For 기반으로 클라이언트 IP를 신뢰한다.
app.set('trust proxy', 1);

const corsOptions = {
  origin: ['https://smu-server-status-viewer.vercel.app'],
  methods: ['GET', 'OPTIONS'],
};

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many requests from this IP, please try again a minute later.',
});

app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json());

// 각 서비스 URL 설정
const serviceURL = {
  HOME: 'https://www.smu.ac.kr/kor/index.do',
  NOTICE: 'https://www.smu.ac.kr/kor/life/notice.do',
  SAMMUL: 'https://smul.smu.ac.kr/',
  ECAMPUS: 'https://ecampus.smu.ac.kr/'
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

// 서버 상태 확인 함수
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
    const duration = Date.now() - start;  // 응답 시간 계산

    if (response.status === 200) {
      return {
        status: 'ok',
        responseTime: duration,
        message: '정상 서비스'
      };
    } else {
      return {
        status: 'error',
        responseTime: duration,
        message: `서비스 비정상: ${response.status}`
      };
    }
  } catch (error) {
    const duration = Date.now() - start;
    if (error.code === 'ECONNABORTED') {
      return { 
        status: 'timeout', 
        responseTime: 'N/A',
        message: '매우 느림(비정상)' 
      };
    } else {
      return { 
        status: 'error', 
        responseTime: duration,
        message: '서비스 접속 실패', 
        error: error.message 
      };
    }
  }
}

// 상태 확인 엔드포인트들
app.get('/status/home', async (req, res) => {
  const result = await checkServiceStatus(serviceURL.HOME);
  res.json(result);
});

app.get('/status/notice', async (req, res) => {
  const result = await checkServiceStatus(serviceURL.NOTICE);
  res.json(result);
});

app.get('/status/sammul', async (req, res) => {
  const result = await checkServiceStatus(serviceURL.SAMMUL);
  res.json(result);
});

app.get('/status/ecampus', async (req, res) => {
  const result = await checkServiceStatus(serviceURL.ECAMPUS);
  res.json(result);
});

// 서버 실행
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  startMonitor(serviceURL, checkServiceStatus);
});