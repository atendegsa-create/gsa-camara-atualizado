import express from 'express';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/disparar-avulso', upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum documento anexado.' });
    }
    
    // Mock the backend handling of the Assinafy document dispatch
    const leadId = req.body.leadId;

    // TODO: Actually send to Assinafy and handle the return
    
    res.status(200).json({ 
      success: true, 
      message: 'Documento disparado com sucesso via Assinafy (mock)' 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao disparar documento', details: error.message });
  }
});

export default router;
