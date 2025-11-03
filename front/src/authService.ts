import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface PassKeyInitResponse {
  type: 'registration' | 'authentication';
  options: any;
  userId: string;
}

export interface PassKeyVerifyRequest {
  userId: string;
  type: 'registration' | 'authentication';
  response: any;
  email: string;
}

export interface TokenResponse {
  success: boolean;
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
    token_type: string;
    session_state: string;
    scope: string;
  };
}

class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async initPassKeyAuth(email: string): Promise<PassKeyInitResponse> {
    const response = await fetch(`${this.baseUrl}/auth/passkey/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize PassKey auth: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async verifyPassKeyAuth(request: PassKeyVerifyRequest): Promise<TokenResponse> {
    const response = await fetch(`${this.baseUrl}/auth/passkey/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to verify PassKey auth: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

 async registerCredential(options: any) {
    try {
      const credential = await startRegistration(options);
      return credential;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

 async authenticateCredential(options: any) {
    try {
      const credential = await startAuthentication(options);
      return credential;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }
}

export default new AuthService();