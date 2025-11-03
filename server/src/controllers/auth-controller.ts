import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PassKeyService } from '../services/passkey-service';
import redisService from '../services/redis-service';
import keycloakService from '../services/keycloak-service';
import { User } from '../types';

const prisma = new PrismaClient();

export class AuthController {
  static async initializePassKeyAuth(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      let user = await prisma.webAuthnUser.findUnique({
        where: { email }
      });

      let options;
      let type: 'registration' | 'authentication';
      let userId: string;
      console.log('USER: ', user);
      if (user) {
        type = 'authentication';
        userId = user.id;
        console.log(
          'Пользователь существует, инициируем аутентификацию, userID: ',
          userId
        );
        let credentials: any[] = [];
        if (user.credentials && Array.isArray(user.credentials)) {
          credentials = (user.credentials as any[])
            .filter((cred) => cred != null)
            .map((cred) => {
              let id;
              if (typeof cred.id === 'string') {
                id = cred.id;
              } else if (
                cred.id &&
                typeof cred.id === 'object' &&
                'data' in cred.id &&
                Array.isArray(cred.id.data)
              ) {
                id = Buffer.from(cred.id.data).toString('base64');
              } else if (Buffer.isBuffer(cred.id)) {
                id = cred.id.toString('base64');
              } else {
                console.warn('Invalid credential id format, skipping:', cred);
                return null;
              }

              if (id) {
                return {
                  id,
                  transports: cred.transports || [
                    'usb',
                    'ble',
                    'nfc',
                    'internal'
                  ],
                  ...cred
                };
              }
              return null;
            })
            .filter((cred) => cred !== null);
        }

        options = await PassKeyService.generateAuthenticationOptions(
          user as any,
          credentials
        );
      } else {
        user = await prisma.webAuthnUser.create({
          data: {
            email,
            credentials: [] 
          }
        });

        type = 'registration';
        userId = user.id;

        options = await PassKeyService.generateRegistrationOptions(user as any);
      }

      await redisService.setChallenge(userId, options.challenge, type);

      res.json({
        type,
        options,
        userId
      });
    } catch (error) {
      console.error('Error initializing PassKey auth:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verifyPassKeyResponse(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { userId, type, response, email } = req.body;

      if (!userId || !type || !response || !email) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      console.log('BODY: ', req.body);
      const challengeData = await redisService.getChallenge(userId, type);
      console.log('challengeData: ', challengeData);
      if (!challengeData) {
        res.status(400).json({ error: 'Challenge not found or expired' });
        return;
      }

      if (
        !(await redisService.validateChallenge(
          userId,
          challengeData.challenge,
          type
        ))
      ) {
        res.status(400).json({ error: 'Invalid challenge' });
        return;
      }

      if (type === 'registration') {
        const verification = await PassKeyService.verifyRegistration(
          response,
          challengeData.challenge,
          {
            id: userId,
            email,
            createdAt: new Date(),
            credentials: []
          } as User,
          process.env.ORIGIN || 'http://localhost:3000'
        );

        if (!verification.verified) {
          res.status(400).json({ error: 'Registration verification failed' });
          return;
        }

        const user = await prisma.webAuthnUser.findUnique({
          where: { id: userId }
        });
        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        let currentCredentials: any[] = [];
        if (user.credentials && Array.isArray(user.credentials)) {
          currentCredentials = (user.credentials as any[])
            .filter((cred) => cred != null)
            .map((cred) => {
              let id;
              if (typeof cred.id === 'string') {
                id = cred.id;
              } else if (
                cred.id &&
                typeof cred.id === 'object' &&
                'data' in cred.id &&
                Array.isArray(cred.id.data)
              ) {
                id = Buffer.from(cred.id.data).toString('base64');
              } else if (Buffer.isBuffer(cred.id)) {
                id = cred.id.toString('base64');
              } else {
                console.warn('Invalid credential id format, skipping:', cred);
                return null;
              }

              if (id) {
                return {
                  id,
                  publicKey: cred.publicKey,
                  counter: cred.counter,
                  created: cred.created,
                  transports: cred.transports || [
                    'usb',
                    'ble',
                    'nfc',
                    'internal'
                  ],
                  ...cred
                };
              }
              return null;
            })
            .filter((cred) => cred !== null); // Убираем все null значения
        }

        const updatedCredentials = [
         ...currentCredentials,
         {
           id: verification.credential.id,
           publicKey: Buffer.isBuffer(verification.credential.publicKey)
             ? verification.credential.publicKey.toString('base64')
             : verification.credential.publicKey,
           counter: verification.credential.counter,
           created: verification.credential.created
         }
       ];

        await prisma.webAuthnUser.update({
          where: { id: userId },
          data: { credentials: updatedCredentials }
        });
      } else if (type === 'authentication') {
        const user = await prisma.webAuthnUser.findUnique({
          where: { id: userId }
        });
        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }
        console.log('user: ', user);
        let credentials: any[] = [];
        if (user.credentials && Array.isArray(user.credentials)) {
          credentials = (user.credentials as any[])
            .filter((cred) => cred != null)
            .map((cred) => {
              let id;
              if (typeof cred.id === 'string') {
                id = cred.id;
              } else if (
                cred.id &&
                typeof cred.id === 'object' &&
                'data' in cred.id &&
                Array.isArray(cred.id.data)
              ) {
                id = Buffer.from(cred.id.data).toString('base64');
              } else if (Buffer.isBuffer(cred.id)) {
                id = cred.id.toString('base64');
              } else {
                console.warn('Invalid credential id format, skipping:', cred);
                return null;
              }

              if (id) {
                return {
                  id,
                  publicKey: cred.publicKey,
                  counter: cred.counter,
                  created: cred.created,
                  transports: cred.transports || [
                    'usb',
                    'ble',
                    'nfc',
                    'internal'
                  ],
                  ...cred
                };
              }
              return null;
            })
            .filter((cred) => cred !== null);
        }

        const credential = credentials.find((cred: any) => {
          let credId;
          if (typeof cred.id === 'string') {
            credId = cred.id;
          } else if (
            cred.id &&
            typeof cred.id === 'object' &&
            'data' in cred.id &&
            Array.isArray(cred.id.data)
          ) {
            credId = Buffer.from(cred.id.data).toString('base64');
          } else if (Buffer.isBuffer(cred.id)) {
            credId = cred.id.toString('base64');
          } else {
            console.warn('Invalid credential id format:', cred);
            return false;
          }

          let responseId;
          if (typeof response.id === 'string') {
            responseId = response.id;
          } else if (
            response.id &&
            typeof response.id === 'object' &&
            'data' in response.id &&
            Array.isArray(response.id.data)
          ) {
            responseId = Buffer.from(response.id.data).toString('base64');
          } else if (Buffer.isBuffer(response.id)) {
            responseId = response.id.toString('base64');
          } else {
            console.warn('Invalid response id format:', response);
            return false;
          }

          return credId === responseId;
        });

        if (!credential) {
          res.status(400).json({ error: 'Credential not found' });
          return;
        }
        console.log('VERIFY DATA: ', {
          response,
          credential,
          challengeData: challengeData.challenge
        });
        const verification = await PassKeyService.verifyAuthentication(
          response,
          challengeData.challenge,
          credential,
          process.env.ORIGIN || 'http://localhost:3000'
        );

        if (!verification.verified) {
          res.status(400).json({ error: 'Authentication verification failed' });
          return;
        }

        const updatedCredentials = credentials.map((cred: any) => {
          let credId;
          if (typeof cred.id === 'string') {
            credId = cred.id;
          } else if (
            cred.id &&
            typeof cred.id === 'object' &&
            'data' in cred.id &&
            Array.isArray(cred.id.data)
          ) {
            credId = Buffer.from(cred.id.data).toString('base64');
          } else if (Buffer.isBuffer(cred.id)) {
            credId = cred.id.toString('base64');
          } else {
            console.warn('Invalid credential id format:', cred);
            return cred;
          }

          let responseId;
          if (typeof response.id === 'string') {
            responseId = response.id;
          } else if (
            response.id &&
            typeof response.id === 'object' &&
            'data' in response.id &&
            Array.isArray(response.id.data)
          ) {
            responseId = Buffer.from(response.id.data).toString('base64');
          } else if (Buffer.isBuffer(response.id)) {
            responseId = response.id.toString('base64');
          } else {
            console.warn('Invalid response id format:', response);
            return cred;
          }

          if (credId === responseId) {
            return {
              ...cred,
              counter: verification.newCounter,
              publicKey: typeof cred.publicKey === 'string'
                ? cred.publicKey
                : Buffer.isBuffer(cred.publicKey)
                  ? cred.publicKey.toString('base64')
                  : cred.publicKey
            };
          }
          return cred;
        });

        await prisma.webAuthnUser.update({
          where: { id: userId },
          data: { credentials: updatedCredentials }
        });
      } else {
        res.status(400).json({ error: 'Invalid operation type' });
        return;
      }

      await redisService.deleteChallenge(userId, type);

      const tokens = await keycloakService.getUserTokens(email);

      res.json({
        success: true,
        tokens
      });
    } catch (error) {
      console.error('Error verifying PassKey response:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
