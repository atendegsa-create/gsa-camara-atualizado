import express from 'express';
import { JurimetricsService } from '../services/JurimetricsService';
import { JurimetricsEngine } from '../services/JurimetricsEngine';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.get('/predict/:credor', verifyToken, async (req: any, res) => {
  try {
    const credor = req.params.credor;
    if (!credor) {
      return res.status(400).json({ error: 'Credor identificador é obrigatório.' });
    }
    const result = await JurimetricsService.calculatePredictability(credor);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro na jurimetria:', error);
    res.status(500).json({ error: 'Erro ao processar dados preditivos', detalhes: error.message });
  }
});

router.post('/advanced', verifyToken, async (req: any, res) => {
  try {
    const { banco_contrato, tipo_acao, valor_causa_min, valor_causa_max } = req.body;
    if (!banco_contrato) {
      return res.status(400).json({ error: 'O nome do banco ou instituição é obrigatório.' });
    }
    const result = await JurimetricsEngine.analisarPreditividade({
      banco_contrato,
      tipo_acao,
      valor_causa_min: valor_causa_min ? Number(valor_causa_min) : undefined,
      valor_causa_max: valor_causa_max ? Number(valor_causa_max) : undefined
    });
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro na jurimetria avançada:', error);
    res.status(500).json({ error: 'Erro ao calcular jurimetria preditiva comparativa', detalhes: error.message });
  }
});

export default router;

