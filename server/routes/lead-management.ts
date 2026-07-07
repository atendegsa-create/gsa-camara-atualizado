import express from 'express';
import admin from 'firebase-admin';
import { db } from '../lib/firebase';
import { LeadManagerService } from '../services/LeadManagerService';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.post('/:id/nota', verifyToken, async (req: any, res) => {
  try {
    const { mensagem, novoStatus } = req.body;
    const adminId = req.user?.uid;

    if (!mensagem) {
      return res.status(400).json({ error: 'A mensagem da nota é obrigatória.' });
    }

    if (!db) {
      throw new Error('Banco de dados não inicializado');
    }

    // Busca o nome do admin no Firestore
    const userDoc = await db.collection('usuarios').doc(adminId).get();
    const adminNome = userDoc.exists 
      ? (userDoc.data()?.nome_completo || userDoc.data()?.nome || 'Administrador') 
      : 'Administrador';

    const result = await LeadManagerService.adicionarNotaAtendimento(req.params.id, adminId, adminNome, mensagem, novoStatus);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao adicionar nota ao lead:', error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/convidar-app', verifyToken, async (req, res) => {
  try {
    const result = await LeadManagerService.convidarLeadParaApp(req.params.id);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao convidar lead para o app:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
