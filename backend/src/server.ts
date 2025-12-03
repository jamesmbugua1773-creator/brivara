import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimiterMiddleware } from './utils/rateLimit.js';
import router from './routes/index.js';
import { scheduleDailyROI } from './engines/roi.js';

const app = express();
// Relax CORP to allow frontend to fetch API from another origin
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// CORS: allow all origins in dev for ease; restrict in production
const isDev = process.env.NODE_ENV !== 'production';
app.use(cors(isDev ? {
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,
  optionsSuccessStatus: 200,
} : {
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3002',
    ];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,
  optionsSuccessStatus: 200,
}));
// Ensure preflight requests are handled
app.options('*', cors());
// Extra dev headers to avoid Safari strictness
if (isDev) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
}
app.use(express.json());
app.use(morgan('combined'));
app.use(rateLimiterMiddleware);

app.use('/api', router);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Brivara backend running on port ${port}`);
});

// Start schedulers
try {
  scheduleDailyROI();
} catch (e) {
  console.error('Failed to start ROI scheduler:', (e as any)?.message || e);
}
