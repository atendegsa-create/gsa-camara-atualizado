import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

async function migrate() {
  const keyPath = path.resolve(process.cwd(), 'firebase-key.json');
  let serviceAccount;
  if (fs.existsSync(keyPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  
  if (!serviceAccount) throw new Error('Credenciais não encontradas.');
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  
  const adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  const defaultDb = getFirestore(adminApp, '(default)');
  const targetDb = getFirestore(adminApp, 'ai-studio-4551b9d4-cbf8-4a88-96e4-47c6d55b185b'); // ID do seu banco
  
  const snap = await defaultDb.collection('usuarios').get();
  console.log(`Encontrados ${snap.size} usuários no banco de origem.`);
  
  let batch = targetDb.batch();
  let count = 0;
  let totalMigrated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const docRef = targetDb.collection('usuarios').doc(doc.id);
    batch.set(docRef, data);
    count++;
    totalMigrated++;

    // O Firestore aceita no máximo 500 operações por batch
    if (count === 490) {
      await batch.commit();
      console.log(`${totalMigrated} usuários migrados...`);
      batch = targetDb.batch(); // Inicia um novo lote
      count = 0;
    }
  }

  // Faz o commit dos documentos restantes
  if (count > 0) {
    await batch.commit();
  }

  console.log(`Migração concluída com sucesso! Total: ${totalMigrated}`);
}

migrate().catch(console.error);
