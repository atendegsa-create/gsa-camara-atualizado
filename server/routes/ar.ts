import express from 'express';
import { db, admin } from '../lib/firebase';
import { verifyToken } from '../middleware/auth';
import { ai, executeAI } from '../lib/ai';
import { enviarEmailNotificacaoAR, enviarEmailConfirmacaoSolicitante } from '../lib/emailService';
import { enviarMensagemComBotaoLink } from '../lib/whatsappService';

const router = express.Router();

// 1. Criar Notificação Extrajudicial (AR Online)
router.post('/criar', verifyToken, async (req: any, res) => {
  try {
    const { 
      notificado_nome, notificado_documento, notificado_email, notificado_whatsapp,
      solicitante_nome, solicitante_documento, solicitante_email, solicitante_whatsapp,
      fato_resumo, valor_ar, isento_pagamento,
      tipo_envio, tipo_documento, modo_base
    } = req.body;

    const userRole = req.user?.role; // 'Admin' ou 'Tenant'
    const tenantId = req.user?.tenantId || 'master';

    // Regra de segurança: Unidade Credenciada nunca pode isentar pagamento
    const homologaIsencao = userRole === 'Admin' ? isento_pagamento : false;
    const statusInicial = homologaIsencao ? 'LIBERADO_ENVIO' : 'AGUARDANDO_PAGAMENTO';

    const tituloDocto = tipo_documento === 'PROCESSO' ? 'PROCESSO ADMINISTRATIVO EXTRAJUDICIAL' : 'NOTIFICAÇÃO EXTRAJUDICIAL';
    const notificadoTexto = tipo_envio === 'LOTE' ? 'Lote de Notificados (Anexo Planilha)' : `${notificado_nome} (Doc: ${notificado_documento})`;
    const fatosExtra = modo_base === 'ARQUIVO' ? 'Fatos baseados no documento em anexo.' : fato_resumo;

    // Gerar Texto Oficial via IA (Modelo Padrão Base)
    const fallbackHTML = `
      <p><b>${tituloDocto}</b></p>
      <p><b>Notificado(a):</b> ${notificadoTexto}</p>
      <p><b>Solicitante:</b> ${solicitante_nome} (Doc: ${solicitante_documento})</p>
      <br/>
      <p>Fatos Motivadores: ${fatosExtra}</p>
      <br/>
      <p>Fica V. Sa. notificado(a) a manifestar-se no prazo de 48 horas sob pena de abertura de procedimento arbitral ou judicial.</p>
    `;

    let textoGeradoHTML = "";
    try {
      textoGeradoHTML = await executeAI(async () => {
        const promptAI = `
          Atue como um Notário e Procurador Jurídico Extrajudicial Sênior. 
          Escreva uma peça oficial do tipo: ${tituloDocto}, formal, detalhada e incontestável em HTML (p, br, b, ul, li).
          Notificou-se: ${notificadoTexto}.
          Solicitante/Notificante: ${solicitante_nome} (Doc: ${solicitante_documento}).
          Fatos motivadores: ${fatosExtra}.
          Insira cláusula determinando o prazo de 48 horas para manifestação sob pena de abertura de procedimento arbitral ou judicial na Câmara GSA.
        `;
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptAI
        });
        return response.text;
      }, fallbackHTML);
    } catch (error: any) {
      console.warn("Erro ao gerar texto AR (usando fallback interno).");
      textoGeradoHTML = fallbackHTML;
    }

    // Criar o registro no banco de dados
    const arRef = await db!.collection('ar_online').add({
      nup_ar: `AR-${Date.now().toString().slice(-6)}`,
      notificado_nome: tipo_envio === 'LOTE' ? 'Lote de Notificados (Planilha)' : notificado_nome,
      notificado_documento: tipo_envio === 'LOTE' ? 'Múltiplos' : notificado_documento,
      notificado_email, notificado_whatsapp,
      solicitante_nome, solicitante_documento, solicitante_email, solicitante_whatsapp,
      fato_resumo: fatosExtra,
      texto_notificacao: textoGeradoHTML,
      valor_ar: Number(valor_ar),
      isento: homologaIsencao,
      status: statusInicial,
      tenantId,
      tipo_envio, tipo_documento, modo_base,
      criado_em: new Date().toISOString(),
      cobranca_id: homologaIsencao ? 'ISENTO' : `COB-${Date.now()}`
    });

    // Se for isento, já realiza os disparos imediatamente
    if (homologaIsencao) {
      await dispararCanaisNotificacao(
        arRef.id, 
        String(textoGeradoHTML || ''), 
        String(notificado_email || ''), 
        String(notificado_whatsapp || ''),
        String(solicitante_email || ''),
        String(solicitante_nome || ''),
        String(notificado_nome || '')
      );
    } else {
      // REGISTRO DE COBRANÇA (Simulação integrada ou chamada ao teu Asaas)
      await db!.collection('cobrancas').add({
        ar_id: arRef.id,
        solicitante_email,
        valor: Number(valor_ar),
        status: 'PENDENTE',
        criado_em: new Date().toISOString()
      });
    }

    res.status(201).json({ 
      success: true, 
      ar_id: arRef.id, 
      status: statusInicial, 
      message: homologaIsencao ? 'AR criada e disparada gratuitamente pelo Admin.' : 'AR criada. Aguardando pagamento da taxa.' 
    });

  } catch (error: any) {
    console.error("ERRO COMPLETO AR:", error);
    res.status(500).json({ error: 'Erro ao processar AR Online: ' + error.message, stack: error.stack });
  }
});

// 2. Webhook / Simulação de Confirmação de Pagamento
router.post('/webhook-pagamento/:arId', async (req, res) => {
  try {
    const { arId } = req.params;
    const arDocRef = db!.collection('ar_online').doc(arId);
    const arSnap = await arDocRef.get();

    if (!arSnap.exists) return res.status(404).json({ error: 'AR não localizada.' });
    const data = arSnap.data();

    if (data?.status === 'AGUARDANDO_PAGAMENTO') {
      await arDocRef.update({ status: 'LIBERADO_ENVIO', pago_em: new Date().toISOString() });
      
      // Disparar canais automaticamente pós-pagamento
      await dispararCanaisNotificacao(
        String(arId), 
        String(data.texto_notificacao || ''), 
        String(data.notificado_email || ''), 
        String(data.notificado_whatsapp || ''),
        String(data.solicitante_email || ''),
        String(data.solicitante_nome || ''),
        String(data.notificado_nome || '')
      );
    }

    res.json({ success: true, message: 'Pagamento computado e notificações enviadas.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Disparar Canais Oficiais após homologação
router.post('/disparar-canais-oficiais', async (req, res) => {
  try {
    const { arId } = req.body;
    const arDocRef = db!.collection('ar_online').doc(arId);
    const arSnap = await arDocRef.get();

    if (!arSnap.exists) return res.status(404).json({ error: 'AR não localizada.' });
    const data = arSnap.data();

    // Disparar canais automaticamente pós-assinatura
    await dispararCanaisNotificacao(
      String(arId), 
      String(data?.texto_notificacao || ''), 
      String(data?.notificado_email || ''), 
      String(data?.notificado_whatsapp || ''),
      String(data?.solicitante_email || ''),
      String(data?.solicitante_nome || ''),
      String(data?.notificado_nome || '')
    );

    res.json({ success: true, message: 'Notificações disparadas com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Função Auxiliar de Disparos Omnichannel
async function dispararCanaisNotificacao(id: string, texto: string, email: string, whatsapp: string, emailSolicitante?: string, nomeSolicitante?: string, nomeRequerido?: string) {
  const linkAcesso = `https://camara.gsa.com/conferir-ar/${id}`;
  
  // Envio por E-mail para Notificado
  if (email) {
    await enviarEmailNotificacaoAR(email, nomeRequerido || "Requerido", nomeSolicitante || "GSA Câmara", linkAcesso);
  }

  // Envio por WhatsApp para Notificado
  if (whatsapp) {
    const msgZap = `⚠️ *NOTIFICAÇÃO EXTRAJUDICIAL - GSA CÂMARA*\n\nPrezado(a), consta em nosso sistema um procedimento extrajudicial formalizado contra você.\n\nVisualizar termos e responder oficialmente pelo link:\n👉 ${linkAcesso}`;
    await enviarMensagemComBotaoLink(whatsapp, msgZap, linkAcesso, "Acessar Painel de Resposta Oficial");
  }

  // E-mail de confirmação para Solicitante
  if (emailSolicitante) {
    await enviarEmailConfirmacaoSolicitante(emailSolicitante, nomeSolicitante || "Solicitante", nomeRequerido || "Requerido", linkAcesso);
  }
}

// Adicionado suporte a rastreabilidade B2B na criação de AR Online
router.post('/criar-portal', async (req, res) => {
  try {
    const { nome_notificado, cpf_cnpj, telefone, email, endereco_completo, assunto, texto_base, tenantId } = req.body;
    
    const nup = `AR-${Date.now().toString().slice(-6)}`;
    
    const docRef = await db!.collection('ar_online').add({
      nup_ar: nup,
      nome_notificado,
      cpf_cnpj,
      telefone,
      email,
      endereco_completo,
      assunto,
      texto_base,
      tenantId: tenantId || 'master',
      status: 'AGUARDANDO_PAGAMENTO',
      taxa_sistema_valor: 349.00, // Herda o valor TAP/AR oficial parametrizado
      criado_em: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ success: true, arId: docRef.id, nup });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;