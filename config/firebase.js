/**
 * Firebase Initialization Configuration
 * Handles Firebase Admin SDK setup and Firestore instance
 */

const admin = require('firebase-admin');
const path = require('path');

// Load Firebase credentials from JSON file
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = {
  admin,
  db,
};
