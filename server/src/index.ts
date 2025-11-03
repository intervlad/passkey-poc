import express, { Request, Response } from 'express';
import cors from 'cors';
import { AuthController } from './controllers/auth-controller';
import redisService from './services/redis-service';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(express.json());

redisService.connect().then(() => {
  console.log('Connected to Redis');
}).catch((err) => {
  console.error('Failed to connect to Redis:', err);
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/auth/passkey/init', AuthController.initializePassKeyAuth);
app.post('/auth/passkey/verify', AuthController.verifyPassKeyResponse);

app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`PassKey init: http://localhost:${PORT}/auth/passkey/init`);
  console.log(`PassKey verify: http://localhost:${PORT}/auth/passkey/verify`);
});