import express from 'express';
import { ServiceRoutingEngine } from '../services/ServiceRoutingEngine';
import { VitrineLeadRequest } from '../../src/types/vitrine';
import { db } from '../lib/firebase';
import { enviarEmailNotificacaoPrioridade } from '../lib/emailService';

const router = express.Router();

router.get('/afiliado/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !db) return res.status(404).json({ error: 'Not found' });
    
    // 1. Tenta buscar pelo ID exato (retrocompatibilidade)
    let userDoc = await db.collection('usuarios').doc(id).get();
    let data = userDoc.exists ? userDoc.data() : null;
    let finalId = id;

    // 2. Se não encontrou, tenta buscar por codigo_afiliado (case-insensitive)
    if (!data) {
      const codeUpper = id.toUpperCase();
      const querySnapshot = await db.collection('usuarios')
        .where('codigo_afiliado', '==', codeUpper)
        .limit(1)
        .get();
        
      if (!querySnapshot.empty) {
        userDoc = querySnapshot.docs[0];
        data = userDoc.data();
        finalId = userDoc.id; // UID completo real
      }
    }

    // 3. Se ainda não encontrou, tenta por prefixo do UID (ex: GSNNQE8P)
    if (!data && id.length >= 6) {
      const querySnapshot = await db.collection('usuarios')
        .where('__name__', '>=', id)
        .where('__name__', '<=', id + '\uf8ff')
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        userDoc = querySnapshot.docs[0];
        data = userDoc.data();
        finalId = userDoc.id; // UID completo real
      }
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Afiliado não encontrado' });
    }
    
    res.json({ 
      id: finalId,
      nome: data?.nome_completo || data?.name || data?.email || 'Afiliado Parceiro' 
    });
  } catch (error) {
    console.error('Erro ao buscar afiliado:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/capturar-lead', async (req, res) => {
  try {
    const payload: VitrineLeadRequest = req.body;

    // Validação básica
    if (!payload.nome || !payload.telefone || !payload.servico_solicitado || !payload.categoria_servico) {
      return res.status(400).json({ error: 'Dados incompletos. Nome, telefone, serviço e categoria são obrigatórios.' });
    }

    const resultado = await ServiceRoutingEngine.processNewLead(payload);

    // Retorna sucesso para o frontend exibir a mensagem de agradecimento
    res.status(200).json({
      message: 'Solicitação recebida com sucesso. Nossa equipe entrará em contato.',
      ...resultado
    });

  } catch (error: any) {
    console.error('Erro ao capturar lead da vitrine:', error);
    res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
  }
});

import axios from 'axios';

router.post('/gerar-pix-prioridade', async (req, res) => {
  try {
    const { leadId, nome, cpf, telefone, email } = req.body;
    const apiKey = process.env.ASAAS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "ASAAS_API_KEY não configurada no servidor." });
    }

    const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
    const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";
    const headers = { "access_token": apiKey };

    // Find or create customer
    let customerId;
    const search = await axios.get(`${baseUrl}/customers?cpfCnpj=${encodeURIComponent(cpf || '')}`, { headers });
    if (search.data.data && search.data.data.length > 0) {
      customerId = search.data.data[0].id;
    } else {
      const custResp = await axios.post(`${baseUrl}/customers`, {
        name: nome || 'Cliente Prioritário',
        cpfCnpj: cpf || undefined,
        email: email || undefined,
        mobilePhone: telefone || undefined
      }, { headers });
      customerId = custResp.data.id;
    }

    // Create Payment
    const paymentResp = await axios.post(`${baseUrl}/payments`, {
      customer: customerId,
      billingType: "PIX",
      value: 24.90,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      description: `Atendimento Prioritário - Câmara GSA`,
      externalReference: JSON.stringify({ leadId, type: 'prioridade_vitrine' })
    }, { headers });

    const paymentId = paymentResp.data.id;
    const qrResp = await axios.get(`${baseUrl}/payments/${paymentId}/pixQrCode`, { headers });

    // Mark lead with payment_id
    if (db && leadId) {
      await db.collection('leads_vitrine').doc(leadId).update({
        prioridade_payment_id: paymentId,
        prioridade_payment_status: 'PENDING'
      });
    }

    res.json({
      qr_code: qrResp.data.payload,
      qr_code_base64: qrResp.data.encodedImage,
      payment_id: paymentId
    });

  } catch (error: any) {
    console.error("Erro ao gerar PIX de prioridade:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro interno ao processar PIX de prioridade." });
  }
});

router.post('/prioridade/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !db) return res.status(400).json({ error: 'ID inválido' });

    const docRef = db.collection('leads_vitrine').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const leadData = docSnap.data();

    // Prevent fake confirmation if there's no payment ID
    if (!leadData?.prioridade_payment_id) {
      return res.status(400).json({ error: 'Pagamento não gerado.' });
    }

    // Only update if not already confirmed by webhook
    if (leadData?.prioridade_payment_status !== 'CONFIRMED') {
      const apiKey = process.env.ASAAS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'ASAAS_API_KEY não configurada no servidor.' });
      }

      const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
      const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";
      const headers = { "access_token": apiKey };

      const resp = await axios.get(`${baseUrl}/payments/${leadData.prioridade_payment_id}`, { headers });
      
      if (resp.data.status !== 'CONFIRMED' && resp.data.status !== 'RECEIVED') {
        return res.status(400).json({ error: 'Pagamento ainda não foi confirmado no Asaas.' });
      }

      await docRef.update({
        is_priority: true,
        pagamento_prioridade: true,
        prioridade_payment_status: 'CONFIRMED',
        data_atualizacao: new Date()
      });

      // Notify hierarchy
      if (leadData?.nome) {
        await enviarEmailNotificacaoPrioridade(leadData.nome, id);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao marcar prioridade:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro interno ao consultar Asaas' });
  }
});

export default router;
