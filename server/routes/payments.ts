import express from 'express';
import axios from 'axios';
import QRCode from 'qrcode';
import { db, admin } from '../lib/firebase';
import { verifyToken } from '../middleware/auth';
import { calcularSplitAsaasDinamico } from '../utils/splitCalculator';

const router = express.Router();

router.post('/pix', verifyToken, async (req, res) => {
  const { processoId, level, email, nome, cpfCnpj, whatsapp, totalValue } = req.body;
  const apiKey = process.env.ASAAS_API_KEY;

  try {
    let pixData;

    if (!apiKey) {
      throw new Error("ASAAS_API_KEY não configurada. Não é possível gerar cobrança real.");
    }

    const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
      const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";
      const headers = { "access_token": apiKey };

      const search = await axios.get(`${baseUrl}/customers?email=${encodeURIComponent(email)}`, { headers });
      let customerId = search.data.data?.[0]?.id;
      
      if (!customerId) {
        const customerPayload: any = { name: nome, email };
        if (cpfCnpj && cpfCnpj !== '00000000000') {
          customerPayload.cpfCnpj = cpfCnpj;
        }
        if (whatsapp && whatsapp.replace(/\D/g, '').length >= 10) {
           customerPayload.mobilePhone = whatsapp;
        }
        
        try {
          const custResp = await axios.post(`${baseUrl}/customers`, customerPayload, { headers });
          customerId = custResp.data.id;
        } catch (e: any) {
           // Fallback to name and email only
           const custResp = await axios.post(`${baseUrl}/customers`, { name: nome, email }, { headers });
           customerId = custResp.data.id;
        }
      }

      let val = 47.00;
      if (totalValue !== undefined && totalValue > 0) {
        val = Number(totalValue);
      } else if (level === "1") {
        val = 17.00;
      } else if (level === "2") {
        val = 47.00;
      }

      const paymentResp = await axios.post(`${baseUrl}/payments`, {
        customer: customerId,
        billingType: "PIX",
        value: val,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        description: `Câmara GSA - Level ${level}`,
        externalReference: JSON.stringify({ processoId, level, type: 'public_lead' })
      }, { headers });

      const paymentId = paymentResp.data.id;
      const qrResp = await axios.get(`${baseUrl}/payments/${paymentId}/pixQrCode`, { headers });

      pixData = {
        qr_code: qrResp.data.payload,
        qr_code_base64: qrResp.data.encodedImage,
        payment_id: paymentId,
        gateway: 'asaas'
      };

    res.json(pixData);
  } catch (error: any) {
    console.error("Erro ao gerar PIX:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao gerar PIX.", details: error.response?.data || error.message });
  }
});

router.post('/asaas/customer', verifyToken, async (req, res) => {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Asaas API Key não configurada no servidor." });

  const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
  const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";
  const headers = { "access_token": apiKey };

  try {
    const customerData = req.body;
    const search = await axios.get(`${baseUrl}/customers?email=${encodeURIComponent(customerData.email)}`, { headers });
    if (search.data.data && search.data.data.length > 0) {
      return res.json({ id: search.data.data[0].id });
    }

    const resp = await axios.post(`${baseUrl}/customers`, customerData, { headers });
    res.json({ id: resp.data.id });
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

router.post('/asaas/split-charge', verifyToken, async (req, res) => {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Asaas API Key não configurada no servidor." });

  const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
  const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";
  const headers = { "access_token": apiKey };

  const { paymentData, splits, tenantId, processoId } = req.body;

  try {
    const payload: any = {
      ...paymentData,
      billingType: "PIX",
      dueDate: paymentData.dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    };

    if (splits && splits.length > 0) {
      payload.split = splits;
    }

    const resp = await axios.post(`${baseUrl}/payments`, payload, { headers });
    const paymentId = resp.data.id;

    const pixData = await axios.get(`${baseUrl}/payments/${paymentId}/pixQrCode`, { headers });

    res.json({
      id: paymentId,
      paymentId,
      invoiceUrl: resp.data.invoiceUrl,
      pixPayload: pixData.data.payload,
      pixImage: pixData.data.encodedImage,
      copiaECola: pixData.data.payload,
      qrCode: pixData.data.encodedImage,
      netValue: resp.data.netValue,
      gateway: 'asaas'
    });
  } catch (error: any) {
    const errorData = error.response?.data || { error: error.message };
    console.error("Asaas Split Payment Error:", JSON.stringify(errorData));

    try {
      await db!.collection('financeiro_logs').add({
        tenantId: tenantId || 'master',
        processoId: processoId || 'checkout_novo',
        error: errorData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'SPLIT_FAILURE',
        payload_attempted: { paymentData, splits }
      });
    } catch (logErr) {
      console.error("Falha ao registrar log financeiro:", logErr);
    }

    try {
      const payload: any = {
        ...paymentData,
        billingType: "PIX",
        dueDate: paymentData.dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      };
      
      const resp = await axios.post(`${baseUrl}/payments`, payload, { headers });
      const paymentId = resp.data.id;
      const pixData = await axios.get(`${baseUrl}/payments/${paymentId}/pixQrCode`, { headers });

      res.json({
        id: paymentId,
        paymentId,
        pixPayload: pixData.data.payload,
        pixImage: pixData.data.encodedImage,
        copiaECola: pixData.data.payload,
        qrCode: pixData.data.encodedImage,
        gateway: 'asaas',
        warning: "Pagamento gerado sem split devido a erro técnico"
      });
    } catch (fallbackError: any) {
      res.status(500).json({ error: "Erro crítico ao gerar cobrança mesmo sem split.", detail: fallbackError.message });
    }
  }
});

router.post('/asaas/subscription', verifyToken, async (req, res) => {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Asaas API Key não configurada." });

  const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
  const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";
  const headers = { "access_token": apiKey };

  const { tenantId, valorMensalidade, diaVencimento } = req.body;

  try {
    const tenantSnap = await db!.collection('tenants').doc(tenantId).get();
    if (!tenantSnap.exists) throw new Error("Tenant não encontrado");
    const tenantData = tenantSnap.data();

    const customerData = {
      name: tenantData?.nome_unidade || 'Credenciada',
      email: tenantData?.email || 'email@desconhecido.com',
      cpfCnpj: tenantData?.documento || '00000000000'
    };

    let customerId;
    const search = await axios.get(`${baseUrl}/customers?email=${encodeURIComponent(customerData.email)}`, { headers });
    if (search.data.data && search.data.data.length > 0) {
      customerId = search.data.data[0].id;
    } else {
      const custResp = await axios.post(`${baseUrl}/customers`, customerData, { headers });
      customerId = custResp.data.id;
    }

    const now = new Date();
    let dueDate = new Date(now.getFullYear(), now.getMonth(), diaVencimento);
    if (dueDate <= now) {
      dueDate.setMonth(dueDate.getMonth() + 1); 
    }

    const payload = {
      customer: customerId,
      billingType: "PIX", 
      nextDueDate: dueDate.toISOString().split('T')[0],
      value: valorMensalidade,
      cycle: "MONTHLY",
      description: `Mensalidade Franquia GSA Câmara - ${tenantData?.nome_unidade}`,
      externalReference: `mensalidade_tenant_${tenantId}`
    };

    const resp = await axios.post(`${baseUrl}/subscriptions`, payload, { headers });
    res.json(resp.data);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao criar assinatura.", detail: error.response?.data || error.message });
  }
});

router.post('/create-payment', verifyToken, async (req, res) => {
  const { plano, faixa, nome, email, whatsapp, processoId, tenantId: manualTenantId } = req.body;
  const apiKey = process.env.ASAAS_API_KEY;

  try {
    let finalTenantId = manualTenantId || 'master';
    let tenantData = null;

    if (processoId) {
      const procDoc = await db!.collection('processos').doc(processoId).get();
      if (procDoc.exists) {
        finalTenantId = procDoc.data()?.tenantId || finalTenantId;
      }
    }

    if (finalTenantId !== 'master') {
      const tenantDoc = await db!.collection('tenants').doc(finalTenantId).get();
      if (tenantDoc.exists) {
        tenantData = tenantDoc.data();
      }
    }

    let value = 0;
    if (plano === 'diagnostico' || faixa === 'diagnostico') value = 47.00;
    else if (plano === 'atendimento') value = 24.90;
    else if (plano === 'triagem_inss') value = 24.90;
    else {
      const pricing: any = {
        ate50: { vista: 697, entrada: 197 },
        '50a100': { vista: 997, entrada: 247 },
        '100a150': { vista: 1497, entrada: 397 },
        acima150: { vista: 1997, entrada: 497 }
      };
      const f = pricing[faixa as string] || pricing['ate50'];
      value = plano === 'vista' ? f.vista : f.entrada;
    }

    if (!apiKey) {
      return res.status(500).json({ error: "ASAAS_API_KEY não configurada. Não é possível gerar cobrança real." });
    }

    const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
    const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";
    const headers = { "access_token": apiKey };

    const search = await axios.get(`${baseUrl}/customers?email=${encodeURIComponent(email)}`, { headers });
    let customerId = search.data.data?.[0]?.id;
    if (!customerId) {
        const custResp = await axios.post(`${baseUrl}/customers`, { name: nome, email, mobilePhone: whatsapp }, { headers });
        customerId = custResp.data.id;
    }

    const splits = await calcularSplitAsaasDinamico(finalTenantId, req.body.afiliadoId || null, plano, 'COBRANCA');

    const paymentData = {
      customer: customerId,
      value,
      description: `Câmara GSA - ${plano} (${faixa})`,
      externalReference: JSON.stringify({ processoId, tenantId: finalTenantId, plano, faixa })
    };

    const payload: any = {
      ...paymentData,
      billingType: "PIX",
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    };

    if (splits && splits.length > 0) payload.split = splits;

    try {
      const resp = await axios.post(`${baseUrl}/payments`, payload, { headers });
      const paymentId = resp.data.id;
      const pixData = await axios.get(`${baseUrl}/payments/${paymentId}/pixQrCode`, { headers });

      res.json({
        id: paymentId,
        pixPayload: pixData.data.payload,
        qr_code: pixData.data.encodedImage, 
        qr_code_base64: pixData.data.encodedImage,
        copiaECola: pixData.data.payload,
        gateway: 'asaas'
      });
    } catch (e: any) {
      console.error("Erro no Split API /create-payment:", e.response?.data || e.message);
      
      await db!.collection('financeiro_logs').add({
        evento: 'ERROR_CREATE_PAYMENT_SPLIT',
        tenantId: finalTenantId,
        processoId: processoId || null,
        error: e.response?.data || e.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      delete payload.split;
      const resp = await axios.post(`${baseUrl}/payments`, payload, { headers });
      const paymentId = resp.data.id;
      const pixData = await axios.get(`${baseUrl}/payments/${paymentId}/pixQrCode`, { headers });

      res.json({
        id: paymentId,
        pixPayload: pixData.data.payload,
        qr_code_base64: pixData.data.encodedImage,
        copiaECola: pixData.data.payload,
        gateway: 'asaas',
        warning: 'Split failed, fallback to direct'
      });
    }
  } catch (error: any) {
    console.error("Erro geral no /create-payment:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment-status', verifyToken, async (req, res) => {
  const { id } = req.query;
  const apiKey = process.env.ASAAS_API_KEY;

  try {
    if (!id) return res.status(400).json({ error: "ID não fornecido" });

    if (!apiKey) {
      return res.status(500).json({ error: "Asaas API Key não configurada." });
    }

    const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
      const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";
      const headers = { "access_token": apiKey };

      const resp = await axios.get(`${baseUrl}/payments/${id}`, { headers });
      res.json({ status: resp.data.status, value: resp.data.value });
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao checar status" });
  }
});

router.post('/gerar-tap-lead', express.json(), async (req, res) => {
  try {
    const { nome, cpfCnpj, email, whatsapp, valorTap, tenantId, afiliadoId } = req.body;

    if (!nome || !cpfCnpj || !valorTap) {
      return res.status(400).json({ error: 'Dados insuficientes para gerar cobrança.' });
    }

    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ASAAS_API_KEY não configurada no servidor.' });
    }

    const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
    const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey
    };

    let customerId;
    try {
      const customerResponse = await axios.post(`${baseUrl}/customers`, {
        name: nome,
        cpfCnpj: cpfCnpj,
        email: email,
        mobilePhone: whatsapp,
      }, { headers });
      customerId = customerResponse.data.id;
    } catch(e: any) {
      const customerResponse = await axios.post(`${baseUrl}/customers`, {
        name: nome,
        cpfCnpj: cpfCnpj,
        email: email,
      }, { headers });
      customerId = customerResponse.data.id;
    }

    if (!customerId) {
       return res.status(400).json({ error: 'Falha ao registar cliente no gateway financeiro.' });
    }

    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 3);
    const dueDate = dataVencimento.toISOString().split('T')[0];

    const splits = await calcularSplitAsaasDinamico(tenantId || 'master', afiliadoId || null, 'TAP', 'TAP');

    const payload: any = {
      customer: customerId,
      billingType: 'UNDEFINED', 
      value: valorTap,
      dueDate: dueDate,
      description: 'Taxa de Abertura de Procedimento (TAP) - Câmara GSA',
      externalReference: `LEAD-${cpfCnpj}`
    };

    if (splits && splits.length > 0) payload.split = splits;

    const chargeResponse = await axios.post(`${baseUrl}/payments`, payload, { headers });

    const chargeData = chargeResponse.data;

    res.status(200).json({ 
      success: true, 
      invoiceUrl: chargeData.invoiceUrl,
      paymentId: chargeData.id 
    });

  } catch (error: any) {
    console.error("Erro na rota de pagamentos:", error.response?.data || error);
    res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
  }
});

router.post('/gerar-pix-analise', async (req, res) => {
  try {
    const { nome, cpfCnpj, email, whatsapp, leadId, tenantSlug, consultorId } = req.body;
    const apiKey = process.env.ASAAS_API_KEY;

    if (!apiKey) return res.status(500).json({ error: "Asaas API Key não configurada." });

    const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
    const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";
    const headers = { 'Content-Type': 'application/json', 'access_token': apiKey };

    let customerId;
    try {
       const customerResponse = await axios.post(`${baseUrl}/customers`, { name: nome, cpfCnpj, email, mobilePhone: whatsapp }, { headers });
       customerId = customerResponse.data.id;
    } catch(e) {
       const customerResponse = await axios.post(`${baseUrl}/customers`, { name: nome, cpfCnpj, email }, { headers });
       customerId = customerResponse.data.id;
    }

    const tenantSnap = await db!.collection('tenants').doc(tenantSlug).get();
    const tenantData = tenantSnap.data();
    const servicoAlvoDesc = req.body.servicoAlvo || 'MEDIACAO';
    const regrasServico = tenantData?.comissoes_servicos?.[servicoAlvoDesc];
    const taxaAnalise = regrasServico?.taxa_analise ?? 47.00;

    const regrasDeSplit = await calcularSplitAsaasDinamico(tenantSlug, consultorId || null, servicoAlvoDesc, 'ANALISE');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    const payload: any = {
      customer: customerId,
      billingType: 'PIX',
      value: taxaAnalise,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Taxa de Análise de Conflito (${servicoAlvoDesc}) - Câmara GSA`,
      externalReference: JSON.stringify({ leadId, tipo: 'TAXA_ANALISE' })
    };

    if (regrasDeSplit && regrasDeSplit.length > 0) payload.split = regrasDeSplit;

    const chargeResponse = await axios.post(`${baseUrl}/payments`, payload, { headers });

    const pixResponse = await axios.get(`${baseUrl}/payments/${chargeResponse.data.id}/pixQrCode`, { headers });

    res.status(200).json({ 
      success: true, 
      paymentId: chargeResponse.data.id,
      invoiceUrl: chargeResponse.data.invoiceUrl,
      pixQrCodeImage: pixResponse.data.encodedImage, 
      pixCopiaECola: pixResponse.data.payload 
    });

  } catch (error: any) {
    console.error("Erro ao gerar PIX de análise:", error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao processar pagamento PIX.' });
  }
});

export default router;
