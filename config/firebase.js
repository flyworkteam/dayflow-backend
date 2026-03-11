const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.resolve(
  __dirname,
  '..',
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json'
);

// Only initialize if service account file exists
if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.warn(
    '⚠️  Firebase service account not found at',
    serviceAccountPath,
    '— Auth endpoints will use mock mode.'
  );
  // Initialize without credentials for development/mock mode
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

module.exports = admin;
