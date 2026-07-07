import express from 'express';
import { AsaasSplitService } from '../services/AsaasSplitService';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.post('/gerar-cobranca/:processoId', verifyToken, async (req, res) => {
  try {
    const { processoId } = req.params;
    const { clienteIdAsaas, valor, vencimento, descricao } = req.body;

    if (!clienteIdAsaas || !valor || !vencimento) {
      return res.status(400).json({ error: 'Dados incompletos para gerar a cobrança.' });
    }

    const cobranca = await AsaasSplitService.gerarCobrancaComSplit(
      processoId, 
      clienteIdAsaas, 
      Number(valor), 
      vencimento, 
      descricao || 'Cobrança com Split'
    );

    res.status(200).json({ success: true, cobranca });
  } catch (error: any) {
    console.error('Erro ao gerar cobrança com split:', error.response?.data || error.message);
    res.status(500).json({ error: 'Falha ao processar pagamento com divisão de lucros.' });
  }
});

router.post('/gerar-cobranca-servico/:id', async (req, res) => {
  try {
    // Mock the response for prototype purposes
    res.status(200).json({ 
      success: true, 
      cobranca: {
        pixCopiaECola: '00020101021126580014br.gov.bcb.pix0136' + Math.random().toString(36).substring(2, 15),
        qrCodeBase64: ''
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao processar cobrança' });
  }
});

router.get('/analise-fiscal/:processoId/:valor', async (req, res) => {
  try {
    const { processoId, valor } = req.params;
    const analise = await AsaasSplitService.calcularBasesFiscais(processoId, Number(valor));
    return res.status(200).json(analise);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
