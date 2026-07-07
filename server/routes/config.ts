import express from 'express';
import { db } from '../lib/firebase';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.get(['/master', '/'], verifyToken, async (req, res) => {
  try {
    const doc = await db!.collection('config').doc('master').get();
    res.json(doc.exists ? doc.data() : {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post(['/master', '/'], verifyToken, async (req, res) => {
  try {
    await db!.collection('config').doc('master').set(req.body, { merge: true });
    res.status(200).json({ success: true, message: "Configurações salvas!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
