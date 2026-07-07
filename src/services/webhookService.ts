import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { atribuirMediador } from '../lib/distribution';
import { enviarMensagemComBotaoLink } from './whatsappService';

/**
 * Serviço de Integração via Webhook para a Câmara GSA
 * Conecta o SaaS ao sistema de SDR (Flowbuild, n8n, Zapier, etc.)
 */

interface LeadData {
  nome: string;
  documento: string;
  email: string;
  whatsapp: string;
  protocolo: string;
  tipoContrato: string;
}

const WEBHOOK_URL = "https://seu-webhook-gsa.com/api/leads"; // Placeholder para configuração futura
const ALERTA_URL = "https://seu-webhook-gsa.com/api/alerta-pagamento"; // Placeholder

export const enviarLeadGSA = async (data: LeadData) => {
  console.log("🚀 Enviando lead para SDR:", data);
  
  try {
    const webhookUrl = (import.meta as any).env.VITE_GSA_WEBHOOK_URL || WEBHOOK_URL;
    
    if (webhookUrl.includes("seu-webhook")) {
      console.warn("⚠️ WEBHOOK_URL ainda é o placeholder. Lead não enviado para destino real.");
      return true;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: data.nome,
        documento: data.documento,
        email: data.email,
        contato: data.whatsapp,
        protocolo: data.protocolo,
        servico: data.tipoContrato,
        status: "Aguardando Pagamento",
        timestamp: new Date().toISOString()
      })
    });
    return response.ok;
  } catch (error) {
    console.error("❌ Erro ao enviar lead:", error);
    return false;
  }
};

export const alertaPagamentoUrgente = async (protocolo: string) => {
  console.log("⚠️ Disparando alerta de pagamento urgente para protocolo:", protocolo);
  
  try {
    const ALERTA_URL = "https://seu-webhook-gsa.com/api/alerta-pagamento";
    const alertaUrl = (import.meta as any).env.VITE_GSA_ALERTA_URL || ALERTA_URL;

    if (alertaUrl.includes("seu-webhook")) {
      console.warn("⚠️ ALERTA_URL ainda é o placeholder. Alerta não enviado.");
      return true;
    }

    const response = await fetch(alertaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensagem: `⚠️ URGENTE: Cliente com protocolo ${protocolo} informou que pagou o RX!`,
        prioridade: "Alta",
        equipe: "Administrativo/Rafaela",
        timestamp: new Date().toISOString()
      })
    });
    return response.ok;
  } catch (error) {
    console.error("❌ Erro ao disparar alerta:", error);
    return false;
  }
};

/**
 * Módulo de Automação de Comunicação via WhatsApp
 * Gatilho: Quando a cobrança do Asaas é criada
 */
export const notificarCobrancaCriada = async (clienteWhatsapp: string, clienteNome: string, paymentLink: string, processoId?: string) => {
  const mensagem = `Olá ${clienteNome || 'Cliente'}, sua fatura da Câmara GSA foi gerada com sucesso e está disponível para pagamento seguro.`;
  await enviarMensagemComBotaoLink(
    clienteWhatsapp,
    mensagem,
    paymentLink,
    "Realizar Pagamento (PIX/Boleto)",
    processoId
  );

  // Aqui também agendamos o lembrete de vencimento
  agendarLembreteVencimento(clienteWhatsapp, clienteNome, paymentLink, processoId);
};

/**
 * Função simulada para agendar o envio 1 dia antes do vencimento
 * Num ambiente real (ex: n8n, Cloud Tasks), isto dispararia um agendamento assíncrono
 */
export const agendarLembreteVencimento = async (clienteWhatsapp: string, clienteNome: string, paymentLink: string, processoId?: string) => {
   console.log(`[WHATSAPP MOCK] Lembrete agendado para 1 dia antes do vencimento para ${clienteWhatsapp}`);
   
   if (processoId) {
     await addDoc(collection(db, 'processos', processoId, 'whatsapp_logs'), {
        telefone: clienteWhatsapp,
        texto: `[SISTEMA] Lembrete Automático de Pagamento programado para as vésperas do vencimento.`,
        tipo: 'TEXTO',
        status: 'ENVIADO',
        data_envio: serverTimestamp()
      });
   }
};

export const processarPagamentoAsaas = async (payload: any) => {
  console.log("💳 Processando Webhook Asaas:", payload);
  
  try {
    // No Asaas, o evento de confirmação pode ser PAYMENT_CONFIRMED ou PAYMENT_RECEIVED
    const isConfirmed = [
      'PAYMENT_CONFIRMED', 
      'PAYMENT_RECEIVED', 
      'PAYMENT_SETTLED'
    ].includes(payload.event);

    if (!isConfirmed) return { success: false, reason: "Evento não é de confirmação" };

    const payment = payload.payment;
    let metadata: any = {};
    
    try {
      metadata = typeof payment.externalReference === 'string' 
        ? JSON.parse(payment.externalReference) 
        : payment.externalReference;
    } catch (e) {
      metadata = { processoId: payment.externalReference };
    }

    const { processoId } = metadata;

    if (!processoId) throw new Error("ID do processo não encontrado no externalReference");

    // 1. Atualizar status do pagamento no Firestore
    const processoRef = doc(db, 'processos', processoId);
    await updateDoc(processoRef, {
      status: 'Ativo - Aguardando Mediação',
      status_tap: 'PAGO',
      data_pagamento_tap: serverTimestamp(),
      ultima_atualizacao: serverTimestamp()
    });

    console.log(`✅ Processo ${processoId} marcado como pago. Iniciando roleta...`);

    // 2. Disparar Motor de Distribuição (Roleta)
    await atribuirMediador(processoId);

    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao processar pagamento:", error);
    return { success: false, error };
  }
};
