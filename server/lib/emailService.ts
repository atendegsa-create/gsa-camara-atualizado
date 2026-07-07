import nodemailer from 'nodemailer';

// Configure normal SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'gsacamara@72hrs.info',
      pass: process.env.EMAIL_PASS,
    },
  });
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const enviarEmail = async ({ to, subject, html }: EmailOptions) => {
  try {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PASS || !to) {
      console.warn("⚠️ SMTP não configurado ou email ausente. E-mail não enviado.");
      return false; 
    }

    const transporter = createTransporter();

    const result = await transporter.sendMail({
      from: '"Câmara GSA" <gsacamara@72hrs.info>',
      to,
      subject,
      html
    });

    console.log(`[E-mail Enviado] ${result.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Erro SMTP] Falha ao enviar e-mail para ${to}:`, error);
    return false;
  }
};

export const enviarEmailNotificacaoAR = async (emailRequerido: string, nomeRequerido: string, nomeRequerente: string, linkAcesso: string) => {
  try {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PASS || !emailRequerido) {
      console.warn("⚠️ SMTP não configurado ou email ausente. E-mail de notificação não enviado.");
      return false; 
    }

    const transporter = createTransporter();

    const result = await transporter.sendMail({
      from: '"Câmara GSA" <gsacamara@72hrs.info>',
      to: emailRequerido,
      subject: 'URGENTE: Notificação Extrajudicial - Câmara GSA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Câmara GSA Oficial</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff; color: #334155;">
            <h2 style="font-size: 20px; margin-top: 0;">Notificação Extrajudicial</h2>
            <p style="line-height: 1.6;">Prezado(a) <strong>${nomeRequerido}</strong>,</p>
            <p style="line-height: 1.6;">Você está sendo formalmente notificado(a) sobre a abertura de um procedimento de mediação extrajudicial requerido por <strong>${nomeRequerente}</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkAcesso}" style="background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: bold; border-radius: 6px; display: inline-block;">
                Acessar Termos da Notificação
              </a>
            </div>
            
            <p style="font-size: 14px; color: #64748b; line-height: 1.5;">O acesso ao link registrará automaticamente a confirmação de recebimento (AR Digital) da presente notificação jurídica.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            Câmara Privada de Mediação e Conciliação GSA<br>
            Ambiente Seguro e Criptografado
          </div>
        </div>
      `
    });

    console.log(`[AR E-mail Enviado] ${result.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Erro SMTP AR] Falha ao enviar e-mail para ${emailRequerido}:`, error);
    return false;
  }
};

export const enviarEmailConfirmacaoSolicitante = async (emailSolicitante: string, nomeSolicitante: string, nomeRequerido: string, linkAcesso: string) => {
  try {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PASS || !emailSolicitante) {
      console.warn("⚠️ SMTP não configurado ou email ausente. E-mail de notificação não enviado.");
      return false; 
    }

    const transporter = createTransporter();

    const result = await transporter.sendMail({
      from: '"Câmara GSA" <gsacamara@72hrs.info>',
      to: emailSolicitante,
      subject: '✅ Confirmação: Notificação Extrajudicial Disparada',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <h1 style="color: #10b981; margin: 0; font-size: 24px;">GSA Câmara</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff; color: #334155;">
            <h2 style="font-size: 20px; margin-top: 0;">Sua Notificação Foi Enviada!</h2>
            <p style="line-height: 1.6;">Prezado(a) <strong>${nomeSolicitante}</strong>,</p>
            <p style="line-height: 1.6;">O pagamento da sua AR foi confirmado e a Notificação Extrajudicial destinada a <strong>${nomeRequerido}</strong> foi oficialmente despachada por nossos canais.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkAcesso}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: bold; border-radius: 6px; display: inline-block;">
                Acompanhar Status da AR
              </a>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            Equipe GSA Soluções
          </div>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error(`[Erro SMTP Confirmação] Falha ao enviar para ${emailSolicitante}:`, error);
    return false;
  }
};

export const enviarEmailBoasVindas = async (emailCliente: string, nomeCliente: string, linkPagamento: string) => {
  try {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PASS) {
      console.warn("⚠️ SMTP não configurado. E-mail não enviado para:", emailCliente);
      return false; // Silently fail if not configured
    }

    const transporter = createTransporter();

    const result = await transporter.sendMail({
      from: '"Câmara GSA" <gsacamara@72hrs.info>',
      to: emailCliente,
      subject: 'O seu Requerimento de Mediação foi recebido - Câmara GSA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Câmara GSA</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff; color: #334155;">
            <h2 style="font-size: 20px; margin-top: 0;">Olá, ${nomeCliente},</h2>
            <p style="line-height: 1.6;">O seu requerimento de mediação extrajudicial foi protocolado com sucesso na nossa plataforma.</p>
            <p style="line-height: 1.6;">Para que possamos emitir a notificação oficial (AR Online) para a parte contrária e dar início imediato ao processo, por favor, regularize a Taxa de Abertura do Procedimento (TAP).</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkPagamento}" style="background-color: #f59e0b; color: #0f172a; text-decoration: none; padding: 14px 28px; font-weight: bold; border-radius: 6px; display: inline-block;">
                Aceder à Fatura e Pagar Taxa
              </a>
            </div>
            
            <p style="font-size: 14px; color: #64748b; line-height: 1.5;">Após a confirmação do pagamento, um dos nossos procuradores entrará em contacto consigo através do WhatsApp para alinhar a estratégia.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            Câmara Privada de Mediação e Conciliação GSA<br>
            Ambiente Seguro e Criptografado
          </div>
        </div>
      `
    });

    console.log(`[E-mail Enviado] ${result.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Erro SMTP] Falha ao enviar e-mail para ${emailCliente}:`, error);
    // Don't crash the server, just return false
    return false;
  }
};

export const enviarEmailNotificacaoPrioridade = async (leadNome: string, leadId: string) => {
  try {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PASS) {
      console.warn("⚠️ SMTP não configurado. E-mail de notificação de prioridade não enviado.");
      return false;
    }

    const transporter = createTransporter();
    const hierarquiaEmail = process.env.HIERARQUIA_EMAIL || 'atende.gsa@gmail.com';

    const result = await transporter.sendMail({
      from: '"Sistema GSA" <gsacamara@72hrs.info>',
      to: hierarquiaEmail,
      subject: `🚨 URGENTE: Novo Lead Prioritário - ${leadNome}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eab308; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #ca8a04; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">NOVO LEAD PRIORITÁRIO</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff; color: #334155;">
            <p style="line-height: 1.6;">Atenção! Um novo lead acaba de efetuar o pagamento para atendimento prioritário na Vitrine.</p>
            
            <div style="background-color: #fefce8; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fef08a;">
              <p style="margin: 5px 0;"><strong>Nome do Lead:</strong> ${leadNome}</p>
              <p style="margin: 5px 0;"><strong>ID:</strong> ${leadId}</p>
            </div>
            
            <p style="line-height: 1.6; font-weight: bold; color: #b45309;">
              Acesse a plataforma imediatamente para iniciar o atendimento deste cliente.
            </p>
          </div>
        </div>
      `
    });

    console.log(`[E-mail Enviado] Notificação de Prioridade para ${hierarquiaEmail}: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Erro SMTP Prioridade] Falha ao enviar para ${leadNome}:`, error);
    return false;
  }
};

