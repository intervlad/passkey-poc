export interface User {
  id: string;
  email: string;
  createdAt: Date;
  credentials: any[];
}

export interface ChallengeData {
  userId: string;
  challenge: string;
  type: 'registration' | 'authentication';
  createdAt: number;
}

export interface PassKeyInitResponse {
  type: 'registration' | 'authentication';
  options: any;
  userId?: string;
}