import express from 'express';
import { B2BBatchService } from '../services/B2BBatchService';
import { JurimetricsService } from '../services/JurimetricsService';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.post('/import-debtors', verifyToken, async (req: any, res) => {
  try {
    const { tenantId, credorId, debtors } = req.body;

    // Validação básica do payload
    if (!tenantId || !credorId || !debtors || !Array.isArray(debtors)) {
      return res.status(400).json({ error: 'Payload inválido. Certifique-se de enviar tenantId, credorId e o array de debtors.' });
    }

    if (debtors.length > 5000) {
       return res.status(400).json({ error: 'Limite excedido. Envie no máximo 5000 registros por lote.' });
    }

    const resultado = await B2BBatchService.processBatchImport(tenantId, credorId, debtors);
    
    res.status(200).json({
      message: 'Lote importado e processamento iniciado com sucesso',
      ...resultado
    });

  } catch (error: any) {
    console.error('Erro na importação de lote:', error);
    res.status(500).json({ error: 'Erro interno no servidor', detalhes: error.message });
  }
});

router.get('/predictability', verifyToken, async (req: any, res) => {
  try {
    const credor = req.query.credor as string;
    if (!credor) {
      return res.status(400).json({ error: 'Credor identificador é obrigatório.' });
    }
    const result = await JurimetricsService.calculatePredictability(credor);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao calcular preditividade:', error);
    res.status(500).json({ error: 'Erro interno ao calcular preditividade', detalhes: error.message });
  }
});

export default router;
