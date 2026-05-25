/**
 * Firebase Initialization Configuration
 * Handles Firebase Admin SDK setup and Firestore instance
 */

const admin = require('firebase-admin');

const hasEnvCredentials =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

let credential;

if (hasEnvCredentials) {
  credential = admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
} else {
  // Fallback for local development when a service account JSON file is present.
  // This keeps production deployments independent from a checked-in key file.
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const serviceAccount = require('./firebase-key.json');
  credential = admin.credential.cert(serviceAccount);
}

admin.initializeApp({
  credential,
});

const db = admin.firestore();

module.exports = {
  admin,
  db,
};
