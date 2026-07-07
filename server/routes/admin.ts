import express from 'express';
import { db } from '../lib/firebase';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.get('/leads', verifyToken, async (req: any, res) => {
  try {
    // Only master admins or analysts should be able to view this
    const userRole = req.user.role || req.user.tipo_usuario; // Check both in case one is set
    if (!req.user || !['MASTER', 'ADMIN', 'MasterAdmin', 'ANALISTA', 'AdminGeral', 'ADMIN_MASTER'].includes(userRole)) {
      return res.status(403).json({ error: `Acesso negado. Role: ${userRole}` });
    }

    const snapshot = await db.collection('leads_vitrine').get();
    const leadsData: any[] = [];
    const now = new Date().getTime();

    snapshot.forEach((doc) => {
      const data = doc.data();
      let isSlaEstourado = false;
      let horasDesdeCaptura = 0;

      if (data.data_captura) {
        // Handle both Firestore Timestamp and ISO string
        let capturaTime: number;
        if (data.data_captura.toDate) {
            capturaTime = data.data_captura.toDate().getTime();
        } else if (data.data_captura._seconds) {
            capturaTime = data.data_captura._seconds * 1000;
        } else {
            capturaTime = new Date(data.data_captura).getTime();
        }
        
        horasDesdeCaptura = (now - capturaTime) / (1000 * 60 * 60);
        
        // SLA is calculated based on hours
        if (data.sla_horas && horasDesdeCaptura > data.sla_horas) {
          isSlaEstourado = true;
        } else if (!data.sla_horas && horasDesdeCaptura > 24) { // Default SLA 24h
           isSlaEstourado = true;
        }
      }

      leadsData.push({ 
        id: doc.id, 
        ...data,
        isSlaEstourado,
        horasDesdeCaptura
      });
    });

    res.status(200).json({ leads: leadsData });
  } catch (error: any) {
    console.error("Erro ao buscar leads globais no admin:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
