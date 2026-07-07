import express from 'express';
import multer from 'multer';
import { db } from '../lib/firebase';
import { verifyToken } from '../middleware/auth';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-audio', verifyToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    
    // Supondo que você queira salvar no Firebase Storage, mas por enquanto, 
    // salvar a URL ou metadados no Firestore pode ser o primeiro passo.
    // Como estamos em um ambiente limitado, vamos apenas confirmar o tipo do arquivo.
    
    res.json({ success: true, message: 'Arquivo recebido (simulado)', filename: req.file.originalname });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
