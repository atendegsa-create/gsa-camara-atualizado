import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

function initializeFirebase() {
  if (admin.apps.length > 0) return getFirestore(admin.app(), 'ai-studio-4551b9d4-cbf8-4a88-96e4-47c6d55b185b');

  try {
    const keyPath = path.resolve(process.cwd(), 'firebase-key.json');
    let serviceAccount;

    if (fs.existsSync(keyPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }

    if (serviceAccount) {
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      const adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      return getFirestore(adminApp, 'ai-studio-4551b9d4-cbf8-4a88-96e4-47c6d55b185b');
    }
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase Admin:", error);
  }
  return null;
}

export const db = initializeFirebase();
export { admin };
