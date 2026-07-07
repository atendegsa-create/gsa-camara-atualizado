import express from 'express';
import { enviarEmail, enviarEmailBoasVindas } from '../lib/emailService';
import { enviarMensagemComBotaoLink } from '../lib/whatsappService';

const router = express.Router();

router.post('/notify-pendency', async (req, res) => {
  try {
    const { emailCliente, nomeCliente, nomeProcesso } = req.body;
    
    if (!emailCliente || !nomeCliente || !nomeProcesso) {
      return res.status(400).json({ error: 'Dados insuficientes' });
    }

    await enviarEmail({
      to: emailCliente,
      subject: "Nova pendência no seu processo",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Olá, ${nomeCliente}</h2>
          <p>O advogado solicitou novos itens para o processo <strong>${nomeProcesso}</strong>.</p>
          <p>Por favor, acesse o portal para visualizar as solicitações.</p>
        </div>
      `
    });
    
    return res.status(200).json({ message: 'Notificação enviada' });
  } catch (error) {
    console.error("Erro na notificação de pendência:", error);
    return res.status(500).json({ error: "Erro ao enviar notificação." });
  }
});

router.post('/welcome-lead', async (req, res) => {
  try {
    const { nome, email, whatsapp, leadId, linkPagamento } = req.body;

    if (!nome || !email || !whatsapp) {
      return res.status(400).json({ error: 'Dados insuficientes (nome, email, whatsapp)' });
    }

    const _link = linkPagamento || "https://camaragsa.com.br/pagamento-pendente";

    const emailPromise = enviarEmailBoasVindas(email, nome, _link);
    const whatsappPromise = enviarMensagemComBotaoLink(
      whatsapp,
      `Olá ${nome}, o seu requerimento de mediação foi recebido com sucesso pela Câmara GSA.\n\nPara darmos andamento imediato e dispararmos a notificação (AR Online) para a parte contrária, por favor, regularize a taxa administrativa através do link seguro abaixo.`,
      _link,
      "Pagamento da Taxa Administrativa (TAP)"
    );

    await Promise.all([emailPromise, whatsappPromise]);

    return res.status(200).json({ message: 'Notificações Omnichannel disparadas com sucesso' });

  } catch (error: any) {
    console.error("Erro na rota /api/notifications/welcome-lead:", error);
    return res.status(500).json({ error: "Erro interno ao processar notificações." });
  }
});

export default router;
