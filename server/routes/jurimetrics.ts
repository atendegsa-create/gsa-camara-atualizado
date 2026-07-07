import express from 'express';
import { JurimetricsEngine } from '../services/JurimetricsEngine';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.post('/compare', verifyToken, async (req: any, res) => {
  try {
    const { banco_contrato, tipo_acao, valor_causa_min, valor_causa_max } = req.body;

    if (!banco_contrato) {
      return res.status(400).json({ error: 'O parâmetro banco_contrato é obrigatório.' });
    }

    const resultado = await JurimetricsEngine.analisarPreditividade({
      banco_contrato,
      tipo_acao,
      valor_causa_min: valor_causa_min ? Number(valor_causa_min) : undefined,
      valor_causa_max: valor_causa_max ? Number(valor_causa_max) : undefined
    });

    res.status(200).json(resultado);

  } catch (error: any) {
    console.error('Erro ao gerar relatório de jurimetria:', error);
    res.status(500).json({ error: 'Falha interna no motor de predição.' });
  }
});

export default router;
