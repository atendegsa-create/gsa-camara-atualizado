import express from 'express';
import { BlindBiddingEngine } from '../services/BlindBiddingEngine';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.post('/:id/submit', verifyToken, async (req: any, res) => {
  try {
    const processId = req.params.id;
    const { party, amount } = req.body;

    if (!party || !amount) {
      return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }

    const result = await BlindBiddingEngine.submitBid(processId, party, Number(amount));
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro no Blind Bidding:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
