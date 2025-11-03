import { createClient, RedisClientType } from 'redis';
import { ChallengeData } from '../types';

class RedisService {
  private client: RedisClientType;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.disconnect();
  }

  async setChallenge(
    userId: string,
    challenge: string,
    type: 'registration' | 'authentication'
  ): Promise<void> {
    const challengeKey = `challenge:${userId}:${type}`;
    const challengeData: ChallengeData = {
      userId,
      challenge,
      type,
      createdAt: Date.now()
    };

    await this.client.setEx(
      challengeKey,
      parseInt(process.env.CHALLENGE_TTL || '60'),
      JSON.stringify(challengeData)
    );
  }

  async getChallenge(
    userId: string,
    type: 'registration' | 'authentication'
  ): Promise<ChallengeData | null> {
    const challengeKey = `challenge:${userId}:${type}`;
    const data = await this.client.get(challengeKey);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as ChallengeData;
  }

  async deleteChallenge(
    userId: string,
    type: 'registration' | 'authentication'
  ): Promise<boolean> {
    const challengeKey = `challenge:${userId}:${type}`;
    const deleted = await this.client.del(challengeKey);
    return deleted > 0;
  }

  async validateChallenge(
    userId: string,
    challenge: string,
    type: 'registration' | 'authentication'
  ): Promise<boolean> {
    const storedChallenge = await this.getChallenge(userId, type);

    if (!storedChallenge) {
      return false;
    }

    if (storedChallenge.challenge !== challenge) {
      return false;
    }

    return true;
  }
}

export default new RedisService();
