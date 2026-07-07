import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

async function limparDadosDeTeste() {
  const keyPath = path.resolve(process.cwd(), 'firebase-key.json');
  let serviceAccount;
  if (fs.existsSync(keyPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  
  if (!serviceAccount) throw new Error('Credenciais administrativas não encontradas.');

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  
  const adminApp = admin.apps.length === 0 ? admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  }) : admin.app();
  
  const db = getFirestore(adminApp, 'ai-studio-4551b9d4-cbf8-4a88-96e4-47c6d55b185b'); // ID do seu banco
  
  // Coleções que serão completamente limpas
  const colecoesParaLimpar = ['leads_vitrine', 'processos', 'transacoes', 'financeiro_transacoes', 'auditoria_rx'];
  
  console.log('🧹 Iniciando limpeza cirúrgica de dados de teste...');

  for (const colecao of colecoesParaLimpar) {
    const snapshot = await db.collection(colecao).get();
    if (snapshot.empty) {
      console.log(`[OK] Coleção ${colecao} já está vazia.`);
      continue;
    }

    console.log(`Apagando ${snapshot.size} documentos da coleção ${colecao}...`);
    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      // Se for a coleção de processos, limpa as subcoleções primeiro para não deixar resíduos
      if (colecao === 'processos') {
        const subLogs = await doc.ref.collection('logs').get();
        subLogs.forEach(subDoc => batch.delete(subDoc.ref));
        
        const subDocs = await doc.ref.collection('documentos').get();
        subDocs.forEach(subDoc => batch.delete(subDoc.ref));

        const subWpp = await doc.ref.collection('whatsapp_logs').get();
        subWpp.forEach(subDoc => batch.delete(subDoc.ref));
      }

      batch.delete(doc.ref);
      count++;

      if (count === 400) { // Limite de segurança do batch do Firestore
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    console.log(`[SUCESSO] Coleção ${colecao} foi completamente limpa.`);
  }

  console.log('✨ O banco de dados está limpo, higienizado e pronto para operação oficial!');
}

limparDadosDeTeste().catch(console.error);
