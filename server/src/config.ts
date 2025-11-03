export const CONFIG = {
  rpID: process.env.RP_ID || 'localhost',
  rpName: process.env.RP_NAME || 'MyApp',
  origin: process.env.ORIGIN || 'http://localhost:3000',
  challengeTimeout: 60000,
 challengeTTL: 60,
};