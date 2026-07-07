import express from 'express';
import { db, admin } from '../lib/firebase';
import { enviarMensagemTexto } from '../../src/services/whatsappService';
import { GeminiMediatorService } from '../services/GeminiMediatorService';

const router = express.Router();

/**
 * Endpoint de Chat da Web ou Webhook simulado para o Devedor negociar com o Bot de Conciliação Ativa
 */
router.post('/chat', async (req, res) => {
  const { processId, message, sender } = req.body;

  if (!processId || !message) {
    return res.status(400).json({ error: 'ProcessId e message são obrigatórios' });
  }

  try {
    const processRef = db!.collection('processos').doc(processId);
    const processDoc = await processRef.get();

    if (!processDoc.exists) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    const processData = processDoc.data() || {};

    // 1. Salvar mensagem do devedor no histórico em tempo real do Chat UI
    const chatColl = processRef.collection('negotiation_chats');
    await chatColl.add({
      role: sender || 'user',
      text: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Chamar o serviço de mediação GeminiMediatorService
    const resultJson = await GeminiMediatorService.processNegotiationMessage(processId, message);

    // 3. Salvar resposta do bot no histórico em tempo real do Chat UI
    await chatColl.add({
      role: 'model',
      text: resultJson.mensagem_whatsapp,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. Enviar mensagem mock do WhatsApp (se o devedor tiver número de telefone configurado)
    if (processData.parte_contraria_telefone) {
      await enviarMensagemTexto(
        processData.parte_contraria_telefone,
        resultJson.mensagem_whatsapp,
        processId
      );
    }

    res.json({
      success: true,
      botResponse: resultJson.mensagem_whatsapp,
      status: resultJson.novo_status,
      valor_fechado: resultJson.valor_acordo_fechado,
      parcelas_fechadas: resultJson.parcelas_fechadas || null,
      justificativa: "Composição consensual assistida por IA."
    });

  } catch (error: any) {
    console.error("Erro no Bot de Conciliação Ativa:", error);
    res.status(500).json({ error: error.message || 'Erro interno no assistente' });
  }
});

/**
 * Webhook simulado para receber mensagens do WhatsApp (ex: Twilio, Evolution API, Z-API)
 */
router.post('/webhook', async (req, res) => {
  const { from, text, processId } = req.body;

  if (!from || !text || !processId) {
    return res.status(400).json({ error: 'Campos from, text e processId são obrigatórios' });
  }

  try {
    // Simula uma chamada para a rota de chat interna para reaproveitar a inteligência
    const processRef = db!.collection('processos').doc(processId);
    const processDoc = await processRef.get();

    if (!processDoc.exists) {
      return res.status(404).json({ error: 'Processo correspondente não encontrado' });
    }

    // Chama o bot de negociação
    const botResponse = await fetch(`http://localhost:3000/api/processos/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processId, message: text, sender: 'user' })
    });

    const result = await botResponse.json();
    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error("Erro no webhook de conciliação:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Webhook de Produção para receber mensagens de APIs reais de WhatsApp (Z-API / Evolution API)
 * Identifica o processo ativo do devedor pelo número de telefone, processa a mensagem via IA e responde.
 */
router.post('/webhook/whatsapp/receive', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Campos phone e message são obrigatórios' });
    }

    // Normalização do número de telefone recebido para facilitar a busca
    const cleanPhone = phone.replace(/\D/g, '');
    
    let processDoc: any = null;

    // Busca todos os processos em negociação ativa
    const query1 = await db!.collection('processos')
      .where('negotiation_params.status_negociacao', 'in', ['AGUARDANDO_CONTATO', 'EM_ANDAMENTO'])
      .get();

    if (!query1.empty) {
      // Filtrar em memória para garantir compatibilidade com múltiplos formatos de telefone
      processDoc = query1.docs.find(doc => {
        const data = doc.data();
        const tel1 = data.parte_contraria_telefone ? data.parte_contraria_telefone.replace(/\D/g, '') : '';
        const tel2 = data.cliente_whatsapp ? data.cliente_whatsapp.replace(/\D/g, '') : '';
        
        return (tel1 && (tel1.endsWith(cleanPhone) || cleanPhone.endsWith(tel1))) ||
               (tel2 && (tel2.endsWith(cleanPhone) || cleanPhone.endsWith(tel2)));
      });
    }

    if (!processDoc) {
      return res.status(200).send('Nenhum processo ativo para este número de telefone.');
    }

    const processId = processDoc.id;

    // 1. Salvar mensagem do devedor no histórico em tempo real do Chat UI
    const chatColl = db!.collection('processos').doc(processId).collection('negotiation_chats');
    await chatColl.add({
      role: 'user',
      text: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Chamar o serviço de mediação GeminiMediatorService
    const aiResponse = await GeminiMediatorService.processNegotiationMessage(processId, message);

    // 3. Salvar resposta do bot no histórico em tempo real do Chat UI
    await chatColl.add({
      role: 'model',
      text: aiResponse.mensagem_whatsapp,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. Enviar mensagem de volta via WhatsApp usando o serviço de mensageria configurado
    await enviarMensagemTexto(phone, aiResponse.mensagem_whatsapp, processId);

    // Roteamento pós-resposta e automações
    if (aiResponse.novo_status === 'ACORDO_FECHADO') {
      console.log(`[CONCILIAÇÃO] Acordo fechado com sucesso para o Processo ${processId}!`);
    } else if (aiResponse.novo_status === 'IMPASSE') {
      console.log(`[CONCILIAÇÃO] Impasse gerado para o Processo ${processId}. Encaminhando para mediação humana.`);
    }

    res.status(200).json({ 
      success: true, 
      processId, 
      botResponse: aiResponse.mensagem_whatsapp,
      status: aiResponse.novo_status
    });
  } catch (error: any) {
    console.error('Erro no webhook de mediação ativa:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
