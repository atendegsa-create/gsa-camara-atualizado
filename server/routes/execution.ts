import express from 'express';
import { ExecutionDocumentService } from '../services/ExecutionDocumentService';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.post('/:id/generate-execution', verifyToken, async (req: any, res) => {
  try {
    const processId = req.params.id;
    const userId = req.user?.uid || 'system';
    const userName = req.user?.name || req.user?.email || 'Sistema Automático';

    const result = await ExecutionDocumentService.generateExecutionPetition(processId, userId, userName);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro na geração da execução:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
