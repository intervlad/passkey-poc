import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  GenerateAuthenticationOptionsOpts,
  GenerateRegistrationOptionsOpts,
  VerifyAuthenticationResponseOpts,
  VerifyRegistrationResponseOpts
} from '@simplewebauthn/server';
import { isoCBOR } from '@simplewebauthn/server/helpers';
import { User } from '../types';
import { CONFIG } from '../config';

export class PassKeyService {
  static async generateRegistrationOptions(
    user: User,
    excludeCredentials: any[] = []
  ): Promise<any> {
    const options: GenerateRegistrationOptionsOpts = {
      rpName: CONFIG.rpName,
      rpID: CONFIG.rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.email,
      challenge: Buffer.from(crypto.randomUUID()),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'preferred'
      },
      excludeCredentials: excludeCredentials
        .filter((cred) => cred != null)
        .map((cred) => {
          let credId;
          if (typeof cred.id === 'string') {
            credId = cred.id;
          } else if (cred.id instanceof Buffer) {
            credId = cred.id.toString('base64');
          } else if (
            cred.id &&
            typeof cred.id === 'object' &&
            'data' in cred.id &&
            Array.isArray(cred.id.data)
          ) {
            credId = Buffer.from(cred.id.data).toString('base64');
          } else {
            console.warn('Invalid credential id format:', cred);
            return null;
          }

          return {
            id: credId,
            type: 'public-key',
            transports: cred.transports || ['usb', 'ble', 'nfc', 'internal']
          };
        })
        .filter((cred) => cred !== null),
      supportedAlgorithmIDs: [-7, -257]
    };

    return await generateRegistrationOptions(options);
  }

  static async generateAuthenticationOptions(
    user: User,
    allowCredentials: any[]
  ): Promise<any> {
    const options: GenerateAuthenticationOptionsOpts = {
      rpID: CONFIG.rpID,
      challenge: Buffer.from(crypto.randomUUID()),
      allowCredentials: allowCredentials
        .filter((cred) => cred != null)
        .map((cred) => {
          let credId;
          if (typeof cred.id === 'string') {
            credId = cred.id;
          } else if (cred.id instanceof Buffer) {
            credId = cred.id.toString('base64');
          } else if (
            cred.id &&
            typeof cred.id === 'object' &&
            'data' in cred.id &&
            Array.isArray(cred.id.data)
          ) {
            credId = Buffer.from(cred.id.data).toString('base64');
          } else {
            console.warn('Invalid credential id format:', cred);
            return null;
          }

          return {
            id: credId,
            type: 'public-key',
            transports: cred.transports || ['usb', 'ble', 'nfc', 'internal']
          };
        })
        .filter((cred) => cred !== null),
      userVerification: 'preferred'
    };

    return await generateAuthenticationOptions(options);
  }

  static async verifyRegistration(
    response: any,
    expectedChallenge: string,
    user: User,
    origin: string
  ): Promise<any> {
    const verificationOptions: VerifyRegistrationResponseOpts = {
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: CONFIG.rpID
    };

    const verification = await verifyRegistrationResponse(verificationOptions);

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('Registration verification failed');
    }

    return {
      verified: verification.verified,
      credential: {
        id: Buffer.isBuffer(verification.registrationInfo.credential.id)
          ? verification.registrationInfo.credential.id.toString('base64')
          : typeof verification.registrationInfo.credential.id === 'string'
          ? verification.registrationInfo.credential.id
          : Buffer.from(
              String(verification.registrationInfo.credential.id || '')
            ).toString('base64'),
        publicKey: Buffer.isBuffer(
          verification.registrationInfo.credential.publicKey
        )
          ? verification.registrationInfo.credential.publicKey.toString(
              'base64'
            )
          : typeof verification.registrationInfo.credential.publicKey ===
            'string'
          ? verification.registrationInfo.credential.publicKey
          : Buffer.from(
              String(verification.registrationInfo.credential.publicKey || '')
            ).toString('base64'),
        counter: verification.registrationInfo.credential.counter || 0,
        created: new Date()
      }
    };
  }

  static async verifyAuthentication(
    response: any,
    expectedChallenge: string,
    credential: any,
    origin: string
  ): Promise<any> {
    let publicKeyBuffer: Buffer;
    if (typeof credential.publicKey === 'string') {
      if (/^[A-Za-z0-9+/=]+$/.test(credential.publicKey)) {
        try {
          const csvStr = atob(credential.publicKey);
          const numbers = csvStr.split(',').map(Number);
          publicKeyBuffer = Buffer.from(new Uint8Array(numbers));
        } catch (e) {
          publicKeyBuffer = Buffer.from(credential.publicKey, 'base64');
        }
      } else {
        throw new Error('Invalid publicKey string format');
      }
    } else if (credential.publicKey instanceof Buffer) {
      publicKeyBuffer = credential.publicKey;
    } else if (
      credential.publicKey?.type === 'Buffer' &&
      Array.isArray(credential.publicKey.data)
    ) {
      publicKeyBuffer = Buffer.from(credential.publicKey.data);
    } else {
      throw new Error('Unsupported publicKey format');
    }

    let credentialIdStr: string;
    if (typeof credential.id === 'string') {
      credentialIdStr = credential.id;
    } else if (credential.id instanceof Buffer) {
      credentialIdStr = credential.id.toString('base64url');
    } else if (
      credential.id?.type === 'Buffer' &&
      Array.isArray(credential.id.data)
    ) {
      credentialIdStr = Buffer.from(credential.id.data).toString('base64url');
    } else {
      throw new Error('Invalid credential.id format');
    }

    const webAuthnCredential = {
      id: credentialIdStr,
      publicKey: new Uint8Array(publicKeyBuffer),
      counter: credential.counter || 0
    };

    const verificationOptions = {
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: CONFIG.rpID,
      credential: webAuthnCredential
    };

    const verification = await verifyAuthenticationResponse(
      verificationOptions
    );

    if (!verification.verified) {
      throw new Error('Authentication verification failed');
    }

    return {
      verified: verification.verified,
      newCounter:
        verification.authenticationInfo?.newCounter || credential.counter
    };
  }
}
