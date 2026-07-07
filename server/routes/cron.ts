import express from 'express';
import { db, admin } from '../lib/firebase';
import { notifyDeadlineExpired } from '../lib/notifications';
import { SlaEscalationCron } from '../services/SlaEscalationCron';
import { enviarWhatsApp } from '../lib/whatsappService';
import { enviarEmail } from '../lib/emailService';

const router = express.Router();

// Middleware de segurança para o cron (protegido por secret no header)
const verifyCronSecret = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const secret = process.env.CRON_SECRET || 'fallback-secret';
  
  if (authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized cron access" });
  }
  next();
};

/**
 * ROTA DE VERIFICAÇÃO DIÁRIA DE PRAZOS
 * Deve ser chamada via Cloud Scheduler ou similar
 */
router.post('/verificar-prazos', verifyCronSecret, async (req, res) => {
  console.log("⏱️ Iniciando verificação diária de prazos...");
  
  try {
    const agora = admin.firestore.Timestamp.now();
    
    // Buscar processos que estão com prazo ativo e ainda não expiraram no status
    // Filtramos processos que têm data_vencimento_prazo < agora E status != 'AGUARDANDO_DECISAO'
    const snapshot = await db!.collection('processos')
      .where('data_vencimento_prazo', '<=', agora)
      .where('status', '!=', 'AGUARDANDO_DECISAO')
      .get();

    if (snapshot.empty) {
      return res.json({ success: true, processed: 0, message: "Nenhum prazo expirado hoje." });
    }

    const batch = db!.batch();
    const notifications: Promise<any>[] = [];
    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Verificamos se o status realmente deve ser mudado (double check logic)
      // Se já estiver em um status terminal, ignoramos
      const terminalStatuses = ['ENCERRADO', 'ACORDO', 'SEM_ACORDO', 'JUDICIAL', 'CANCELADO'];
      if (terminalStatuses.includes(data.status)) continue;

      const processRef = db!.collection('processos').doc(doc.id);
      
      batch.update(processRef, {
        status: 'AGUARDANDO_DECISAO',
        updatedAt: agora,
        historico_eventos: admin.firestore.FieldValue.arrayUnion({
          data: new Date().toISOString(),
          evento: "Prazo de 15 dias expirado sem resposta. Status alterado para Aguardando Decisão.",
          tipo: "SISTEMA"
        })
      });

      // Notificar via Webhook (SDR/Procurador) usando helper centralizado
      notifications.push(
        notifyDeadlineExpired({
          processoId: doc.id,
          nup: data.nup,
          cliente: data.cliente_nome,
          procurador_id: data.procurador_responsavel_id
        })
      );

      count++;
    }

    await batch.commit();
    await Promise.all(notifications);

    res.json({ success: true, processed: count });
  } catch (error: any) {
    console.error("❌ Erro na cron de prazos:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ROTA DE FISCALIZAÇÃO DO SLA ANTI-ABANDONO
 * Confisca leads inativos de Unidades e transfere para a GSA Master
 */
router.post('/verificar-sla', verifyCronSecret, async (req, res) => {
  try {
    const result = await SlaEscalationCron.executarFiscalizacaoSLA();
    res.status(200).json(result);
  } catch (error: any) {
    console.error("❌ Erro na cron de fiscalização do SLA:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ROTA DE CRON: RECUPERAÇÃO GLOBAL DE CHECKOUT ABANDONADO
 * Executada periodicamente (Ex: a cada 30 minutos) pelo Cloud Scheduler
 */
router.post('/recuperar-checkouts', verifyCronSecret, async (req, res) => {
  console.log("🛒 Iniciando varredura global de checkouts abandonados...");
  
  try {
    const agora = new Date();
    // Define a janela de tempo: criado há mais de 2 horas e menos de 24 horas
    const duasHorasAtras = new Date(agora.getTime() - 2 * 60 * 60 * 1000);
    const vinteQuatroHorasAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

    // Busca leads da vitrine ou checkout com pagamentos pendentes na janela estipulada
    const snapshot = await db!.collection('leads_vitrine')
      .where('status', '==', 'LEAD_NOVO')
      .where('pagamento_prioridade', '==', false)
      .where('data_captura', '<=', admin.firestore.Timestamp.fromDate(duasHorasAtras))
      .where('data_captura', '>=', admin.firestore.Timestamp.fromDate(vinteQuatroHorasAtras))
      .get();

    if (snapshot.empty) {
      return res.json({ success: true, recuperados: 0, message: "Nenhum checkout abandonado pendente de recuperação." });
    }

    let count = 0;
    const batch = db!.batch();

    for (const doc of snapshot.docs) {
      const lead = doc.data();

      // Evita reenvio se o lead já passou pela régua de recuperação
      if (lead.checkout_recuperado_em) continue;

      const leadRef = db!.collection('leads_vitrine').doc(doc.id);

      // 1. Constrói o link personalizado de checkout dinamicamente com base no serviço
      let linkCheckout = `https://seusdireitosbr.com.br/solucoes`;
      if (lead.servico_solicitado?.includes('AR') || lead.servico_solicitado?.includes('Notificação')) {
        linkCheckout = `https://seusdireitosbr.com.br/notificacao-digital?leadId=${doc.id}`;
      } else if (lead.servico_solicitado?.includes('Contrato') || lead.servico_solicitado?.includes('Assinatura')) {
        linkCheckout = `https://seusdireitosbr.com.br/checkout-assinatura?leadId=${doc.id}`;
      }

      // 2. Dispara a mensagem amigável e profissional no WhatsApp
      const mensagemWhatsapp = `Olá, ${lead.nome}! Vimos que você iniciou a solicitação para o serviço de *${lead.servico_solicitado}* na GSA Câmara, mas o pagamento da taxa de ativação ainda não foi compensado.\n\nClique no link oficial abaixo para concluir sua emissão e garantir seus direitos com total validade jurídica:\n👉 ${linkCheckout}`;
      
      if (lead.telefone) {
        await enviarWhatsApp(lead.telefone, mensagemWhatsapp);
      }

      // 3. Dispara o E-mail de reforço institucional
      if (lead.email) {
        const assuntoEmail = `Conclua sua solicitação de ${lead.servico_solicitado} - GSA Câmara`;
        const corpoEmail = `
          <h3>Olá, ${lead.nome}!</h3>
          <p>Identificamos que a sua solicitação para o serviço de <strong>${lead.servico_solicitado}</strong> está aguardando a finalização do pagamento.</p>
          <p>Nossa plataforma opera com segurança jurídica master e extrajudicial para proteger seus interesses de forma ágil.</p>
          <p>Para prosseguir e liberar a análise dos nossos especialistas, clique no botão abaixo:</p>
          <p><a href="${linkCheckout}" style="background-color:#10b981; color:white; padding:12px 20px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block;">Concluir Atendimento Agora</a></p>
          <br/>
          <p>Atenciosamente,<br/><strong>Equipe de Governança GSA Câmara</strong></p>
        `;
        await enviarEmail({ to: lead.email, subject: assuntoEmail, html: corpoEmail });
      }

      // 4. Atualiza o banco marcando que o lembrete foi enviado
      batch.update(leadRef, {
        checkout_recuperado_em: admin.firestore.FieldValue.serverTimestamp(),
        'tracking_log': admin.firestore.FieldValue.arrayUnion({
          data: new Date().toISOString(),
          evento: 'REGUA_RECOV_DISPARADA',
          mensagem: 'Régua automática de checkout abandonado enviada por WhatsApp e E-mail.'
        })
      });

      count++;
    }

    await batch.commit();

    // Adiciona log de monitoramento diário na collection metricas_cron
    if (count > 0) {
      try {
        await db!.collection('metricas_cron').add({
          tipo_cron: 'recuperar-checkouts',
          tentativas_reengajamento: count,
          data_execucao: admin.firestore.FieldValue.serverTimestamp(),
          mensagem: `A cron de recuperação rodou e tentou recuperar ${count} checkouts.`
        });
      } catch (logError) {
        console.error("Erro ao gravar log em metricas_cron:", logError);
      }
    }

    res.json({ success: true, recuperados: count });

  } catch (error: any) {
    console.error("❌ Erro crítico na cron de recuperação global de checkout:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
