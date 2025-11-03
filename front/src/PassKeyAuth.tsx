import React, { useState } from 'react';
import authService, { PassKeyVerifyRequest } from './authService';

const PassKeyAuth: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [tokens, setTokens] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAuth = async () => {
    if (!email) {
      setStatus('Please enter your email');
      return;
    }

    setIsLoading(true);
    setStatus('Initializing authentication...');

    try {
      const initResponse = await authService.initPassKeyAuth(email);
      setStatus(`Authentication initialized. Type: ${initResponse.type}`);

      let credential: any;
      if (initResponse.type === 'registration') {
        setStatus('Please register your PassKey...');
        credential = await authService.registerCredential(initResponse.options);
      } else {
        setStatus('Please authenticate with your PassKey...');
        credential = await authService.authenticateCredential(initResponse.options);
      }

      const verifyRequest: PassKeyVerifyRequest = {
        userId: initResponse.userId,
        type: initResponse.type,
        response: credential,
        email: email
      };

      setStatus('Verifying authentication...');
      const tokenResponse = await authService.verifyPassKeyAuth(verifyRequest);

      if (tokenResponse.success) {
        setTokens(tokenResponse.tokens);
        setStatus('Authentication successful!');
      } else {
        setStatus('Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setStatus(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="passkey-auth">
      <h2>PassKey Authentication</h2>
      
      <div className="auth-form">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        <button onClick={handleAuth} disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Authenticate with PassKey'}
        </button>
      </div>

      {status && (
        <div className="status">
          <h3>Status:</h3>
          <p>{status}</p>
        </div>
      )}

      {tokens && (
        <div className="tokens">
          <h3>Authentication Tokens:</h3>
          <pre>{JSON.stringify(tokens, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default PassKeyAuth;