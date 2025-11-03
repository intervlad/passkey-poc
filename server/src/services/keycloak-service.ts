import axios from 'axios';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  'not-before-policy': number;
  session_state: string;
  scope: string;
}

class KeycloakService {
  private baseUrl: string;
 private realm: string;
  private clientId: string;
  private clientSecret: string;
  private adminUsername: string;
  private adminPassword: string;

  constructor() {
    this.baseUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    this.realm = process.env.KEYCLOAK_REALM || 'myapp';
    this.clientId = process.env.KEYCLOAK_CLIENT_ID || 'user-management';
    this.clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || 'this_is_a_secure_secret_1234567890';
    this.adminUsername = process.env.KEYCLOAK_ADMIN_USERNAME || 'admin';
    this.adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
  }

   async getAdminToken(): Promise<string> {
    try {
      const clientTokenResponse = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const clientToken = (clientTokenResponse.data as { access_token: string }).access_token;

      const adminTokenResponse = await axios.post(
        `${this.baseUrl}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          subject_token: clientToken,
          requested_subject: 'admin', 
          requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
          requested_audience: 'admin-cli'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return (adminTokenResponse.data as { access_token: string }).access_token;
    } catch (error) {
      console.error('Error getting admin token:', error);
      throw new Error('Failed to get admin token from Keycloak');
    }
  }

 async getUserByEmail(email: string): Promise<any | null> {
    try {
      const clientTokenResponse = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const clientToken = (clientTokenResponse.data as { access_token: string }).access_token;

      const response = await axios.get(
        `${this.baseUrl}/admin/realms/${this.realm}/users`,
        {
          headers: {
            'Authorization': `Bearer ${clientToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            email,
            exact: true,
          },
        }
      );

      const users = response.data as any[];
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

 async createUserInKeycloak(email: string): Promise<string> {
    try {
      const clientTokenResponse = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const clientToken = (clientTokenResponse.data as { access_token: string }).access_token;

      const userPayload = {
        username: email,
        email,
        enabled: true,
        emailVerified: true,
        attributes: {
          passkey_user: true,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/admin/realms/${this.realm}/users`,
        userPayload,
        {
          headers: {
            'Authorization': `Bearer ${clientToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.headers.location.split('/').pop();
    } catch (error) {
      console.error('Error creating user in Keycloak:', error);
      throw new Error('Failed to create user in Keycloak');
    }
 }

  async impersonateUser(userId: string): Promise<TokenResponse> {
    try {
      const clientTokenResponse = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const clientToken = (clientTokenResponse.data as { access_token: string }).access_token;

      const userTokenResponse = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          subject_token: clientToken,
          requested_subject: userId,
          requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
          requested_audience: this.clientId
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return userTokenResponse.data as TokenResponse;
    } catch (error) {
      console.error('Error impersonating user:', error);
      throw new Error('Failed to impersonate user in Keycloak');
    }
  }

  async getUserTokens(email: string): Promise<TokenResponse> {
    let user = await this.getUserByEmail(email);

    if (!user) {
      const userId = await this.createUserInKeycloak(email);
      user = { id: userId, email };
    }

    return await this.impersonateUser(user.id);
  }
}

export default new KeycloakService();