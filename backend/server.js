require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { checkServiceStatus, SERVICE_URL } = require('./lib/statusChecker');

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

// 상태 확인 엔드포인트들
app.get('/status/home', async (req, res) => {
  const result = await checkServiceStatus(SERVICE_URL.HOME);
  res.json(result);
});

app.get('/status/notice', async (req, res) => {
  const result = await checkServiceStatus(SERVICE_URL.NOTICE);
  res.json(result);
});

app.get('/status/sammul', async (req, res) => {
  const result = await checkServiceStatus(SERVICE_URL.SAMMUL);
  res.json(result);
});

app.get('/status/ecampus', async (req, res) => {
  const result = await checkServiceStatus(SERVICE_URL.ECAMPUS);
  res.json(result);
});

// 서버 실행
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
