import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import pool from './db/pool';
import { setupSocket } from './socket/index';
import { startCleanupJob } from './jobs/cleanup';

import authRoutes from './routes/auth';
import accessRoutes from './routes/access';
import userRoutes from './routes/users';
import channelRoutes from './routes/channels';
import messageRoutes from './routes/messages';
import dmRoutes from './routes/dm';
import noticeRoutes from './routes/notices';
import memoryRoutes from './routes/memories';
import uploadRoutes from './routes/upload';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(limiter);

app.set('trust proxy', 1);

const sessionMiddleware = session({
  store: new (require('connect-pg-simple')(session))({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
});

app.use(sessionMiddleware);
io.use((socket, next) => {
  sessionMiddleware(socket.request as any, {} as any, next as any);
});

app.use('/api/auth', authRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

setupSocket(io);

startCleanupJob();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };
