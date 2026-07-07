import express from 'express';
import { db, admin } from '../lib/firebase';
import { verifyToken } from '../middleware/auth';
import { ServiceRoutingEngine } from '../services/ServiceRoutingEngine';
import { VitrineLeadRequest } from '../../src/types/vitrine';

const router = express.Router();

router.post('/capturar', verifyToken, async (req: any, res) => {
  try {
    const lead = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      formId: req.body.origem || 'desconhecido',
      owner_uid: req.user?.uid || null
    };
    const docRef = await db!.collection('leads').add(lead);
    res.json({ success: true, leadId: docRef.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
