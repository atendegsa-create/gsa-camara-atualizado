import { db, admin } from '../lib/firebase';
import { enviarEmailNotificacaoAR } from '../lib/emailService'; 
import { enviarMensagemComBotaoLink } from '../lib/whatsappService';

interface DadosArPayload {
  processoId: string;
  tenantSlug: string;
  requerente_nome: string;
  requerido_nome: string;
  requerido_email: string;
  requerido_telefone: string;
  resumo_fato: string;
}

export async function dispararArOnlineOficial(dados: DadosArPayload) {
  try {
    if (!db) {
      throw new Error("Erro interno do servidor (Firebase não inicializado).");
    }

    // 1. Regista a intenção de citação jurídica no Firestore
    const dataEnvio = admin.firestore.FieldValue.serverTimestamp();
    const arDocRef = await db.collection('notificacoes_ar').add({
      processoId: dados.processoId,
      tenantSlug: dados.tenantSlug,
      requerente_nome: dados.requerente_nome,
      requerido_nome: dados.requerido_nome,
      status: 'ENVIADO',
      historico_acessos: [],
      data_envio: dataEnvio
    });

    // 2. Gera o link de rastreamento seguro apontando para o nosso backend
    const baseUrl = process.env.VITE_APP_URL || 'https://camaragsa.com.br';
    const linkRastreavelAR = `${baseUrl}/api/ar/acesso/${arDocRef.id}`;

    // 3. Disparo Omnichannel para o Requerido
    const mensagemTexto = `Notificação Oficial: Olá ${dados.requerido_nome}, foi aberto um procedimento de mediação extrajudicial contra si por ${dados.requerente_nome}. Aceda ao portal oficial para visualizar os termos da proposta.`;

    // Dispara WhatsApp e E-mail em paralelo
    await Promise.all([
      enviarMensagemComBotaoLink(dados.requerido_telefone, mensagemTexto, linkRastreavelAR, 'Visualizar Processo'),
      enviarEmailNotificacaoAR(dados.requerido_email, dados.requerido_nome, dados.requerente_nome, linkRastreavelAR)
    ]);

    return { success: true, notificacaoId: arDocRef.id };

  } catch (error) {
    console.error("Falha no disparo do AR Online:", error);
    throw new Error("Erro ao processar envio de AR.");
  }
}
