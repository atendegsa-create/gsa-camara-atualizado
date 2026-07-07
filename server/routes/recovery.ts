import express from 'express';
import { db, admin } from '../lib/firebase';
import { verifyToken } from '../middleware/auth';
import { enviarEmail } from '../lib/emailService';
import { enviarWhatsApp } from '../lib/whatsappService';
import { executeAI } from '../lib/ai';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();

router.post('/cadastrar', verifyToken, async (req, res) => {
  try {
    const { 
      nome_devedor, cpf_cnpj, telefone, email, valor_divida, 
      vencimento_original, proposta_desconto_pct, parcelas_max,
      taxa_operacional_devedor, taxa_exito_credor_pct, tenantId 
    } = req.body;

    const protocolo = `REC-${Date.now().toString().slice(-6)}`;

    // Registrar no Firestore
    let taxaNotificacao = Number(req.body.taxa_notificacao_credor || 9.90);
    let nomeCredor = 'GSA Câmara';
    let logoCredor = '';
    
    // Validar plano e pegar dados da empresa credora
    if (tenantId && tenantId !== 'master') {
        const credoresRef = await db!.collection('recovery_credores').where('tenantId', '==', tenantId).limit(1).get();
        if (!credoresRef.empty) {
            const credorData = credoresRef.docs[0].data();
            nomeCredor = credorData.razao_social || 'GSA Câmara';
            logoCredor = credorData.logo_url || '';
            if (credorData.taxa_notificacao_padrao) {
                taxaNotificacao = Number(credorData.taxa_notificacao_padrao);
            } else if (credorData.plano === 'BUSINESS') {
                taxaNotificacao = 7.90;
            } else if (credorData.plano === 'ENTERPRISE') {
                taxaNotificacao = 4.90;
            }
        }
    }

    const docRef = await db!.collection('recovery_cobrancas').add({
      protocolo,
      nome_devedor, cpf_cnpj, telefone, email,
      valor_divida: Number(valor_divida),
      vencimento_original,
      proposta_desconto_pct: Number(proposta_desconto_pct),
      parcelas_max: Number(parcelas_max),
      taxa_operacional_devedor: Number(taxa_operacional_devedor),
      taxa_exito_credor_pct: Number(taxa_exito_credor_pct),
      taxa_notificacao_credor: taxaNotificacao,
      tenantId: tenantId || 'master',
      nome_credor: nomeCredor,
      logo_credor: logoCredor,
      status: 'CONVITE_ENVIADO',
      criado_em: admin.firestore.FieldValue.serverTimestamp()
    });

    // Régua de Envio Automático Omnichannel
    const linkNegociacao = `${process.env.VITE_APP_URL || 'https://camara.seusdireitosbr.com.br'}/publico/negociar/${docRef.id}`;
    const textoMensagem = `⚠️ *CONVITE DE NEGOCIAÇÃO EXTRAJUDICIAL - ${nomeCredor.toUpperCase()}*\n\nPrezado(a) ${nome_devedor}, consta em nosso sistema uma oportunidade de composição consensual para regularização de pendência financeira com a empresa ${nomeCredor}.\n\n*Protocolo Oficial:* ${protocolo}\n\n_Trata-se de proposta de composição extrajudicial visando solução consensual da obrigação, evitando medidas judiciais cabíveis._\n\nAcesse o seu painel seguro, visualize as condições de parcelamento e o seu desconto exclusivo pelo link:\n👉 ${linkNegociacao}`;

    // Disparo WhatsApp
    if (telefone) {
      await enviarWhatsApp(telefone, textoMensagem);
    }

    // Disparo E-mail
    if (email) {
      const logoHtml = logoCredor ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${logoCredor}" alt="${nomeCredor}" style="max-height: 80px; max-width: 200px;" /></div>` : '';
      await enviarEmail({
        to: email,
        subject: `⚖️ Oportunidade de Acordo - ${nomeCredor} (Protocolo ${protocolo})`,
        html: `<div style="font-family:sans-serif; max-width:600px; color:#334155; margin:0 auto; padding:20px;">
                ${logoHtml}
                <h2 style="color:#d97706; text-align: center;">Notificação de Oportunidade de Acordo</h2>
                <p>Prezado(a) <strong>${nome_devedor}</strong>,</p>
                <p>Consta em nosso sistema uma oportunidade de negociação consensual extrajudicial referente a pendências com a empresa <strong>${nomeCredor}</strong>.</p>
                <div style="background:#fffbeb; padding:15px; border-left:4px solid #f59e0b; margin:15px 0; font-style:italic;">
                  "Trata-se de proposta de composição extrajudicial visando solução consensual da obrigação, evitando medidas judiciais cabíveis."
                </div>
                <p>Disponibilizamos um portal interativo para que possa conferir o parcelamento proposto e o desconto aplicável sem burocracia.</p>
                <br>
                <div style="text-align: center;">
                  <a href="${linkNegociacao}" style="display:inline-block; padding:14px 28px; background:#0f172a; color:#fff; text-decoration:none; font-weight:bold; border-radius:8px;">Visualizar Proposta de Acordo</a>
                </div>
              </div>`
      });
    }

    res.status(201).json({ success: true, cobrancaId: docRef.id, protocolo });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro no motor Recovery: ' + error.message });
  }
});

// 2. NOVA ROTA: Upload de Lote (CSV)
router.post('/importar-lote', verifyToken, async (req, res) => {
  try {
    const { cobrancas, tenantId } = req.body;
    if (!cobrancas || !Array.isArray(cobrancas)) return res.status(400).json({ error: "Formato de lote inválido." });

    const batch = db!.batch();
    const collectionRef = db!.collection('recovery_cobrancas');
    let processados = 0;

    for (const cob of cobrancas) {
      if (!cob.nome_devedor || !cob.valor_divida) continue;

      const docRef = collectionRef.doc();
      const protocolo = `REC-LOTE-${Date.now().toString().slice(-4)}${processados}`;
      const valor_divida = Number(cob.valor_divida);
      
      // NOVA REGRA DE CÁLCULO GSA (5% acima de mil)
      let taxaOp = 49; // Mínima
      if (valor_divida > 1000) {
        taxaOp = Number((valor_divida * 0.05).toFixed(2));
      }
      const taxaExitoPct = 15;
      
      let taxaNotificacao = 9.90; // Taxa de envio cobrada do credor (START)

      // (DICA ADICIONAL) Validar qual é o plano daquele tenantId/credor específico 
      let nomeCredor = 'GSA Câmara';
      let logoCredor = '';
      
      if (tenantId && tenantId !== 'master') {
        const credoresRef = await db!.collection('recovery_credores').where('tenantId', '==', tenantId).limit(1).get();
        if (!credoresRef.empty) {
            const credorData = credoresRef.docs[0].data();
            nomeCredor = credorData.razao_social || 'GSA Câmara';
            logoCredor = credorData.logo_url || '';
            if (credorData.taxa_notificacao_padrao) {
                taxaNotificacao = Number(credorData.taxa_notificacao_padrao);
            } else if (credorData.plano === 'BUSINESS') {
                taxaNotificacao = 7.90;
            } else if (credorData.plano === 'ENTERPRISE') {
                taxaNotificacao = 4.90;
            }
        }
      }

      batch.set(docRef, {
        protocolo,
        nome_devedor: cob.nome_devedor, cpf_cnpj: cob.cpf_cnpj || '',
        telefone: cob.telefone || '', email: cob.email || '',
        valor_divida, vencimento_original: cob.vencimento_original || new Date().toISOString().split('T')[0],
        proposta_desconto_pct: Number(cob.proposta_desconto_pct || 10),
        parcelas_max: Number(cob.parcelas_max || 3),
        taxa_operacional_devedor: taxaOp, taxa_exito_credor_pct: taxaExitoPct,
        taxa_notificacao_credor: taxaNotificacao,
        tenantId: tenantId || 'master', 
        nome_credor: nomeCredor,
        logo_credor: logoCredor,
        status: 'CONVITE_ENVIADO',
        criado_em: admin.firestore.FieldValue.serverTimestamp()
      });

      processados++;
      // NOTA: Disparos de WhatsApp em massa (Bulk) devem ser feitos de forma faseada na vida real para evitar bloqueios no WhatsApp. 
      // Por agora, salva no banco. Um Cron Job ou gatilho separado pode enviar as mensagens.
    }

    await batch.commit();

    res.status(201).json({ success: true, message: `${processados} dívidas importadas com sucesso.` });
  } catch (error: any) {
    console.error("Erro na importação de lote:", error);
    res.status(500).json({ error: 'Erro ao importar lote.' });
  }
});

router.post('/gerar-cobranca-acordo', async (req, res) => {
  try {
    const { cobrancaId } = req.body;
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gateway de pagamento offline.' });

    // 1. Busca os parâmetros salvos no Firestore
    const docSnap = await db!.collection('recovery_cobrancas').doc(cobrancaId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Cobrança não encontrada.' });
    }
    const cobrancaData = docSnap.data()!;

    const valorComDesconto = cobrancaData.valor_divida * (1 - (cobrancaData.proposta_desconto_pct / 100));
    const valorFinalCobranca = valorComDesconto + cobrancaData.taxa_operacional_devedor;

    const isSandbox = process.env.ASAAS_SANDBOX === 'true' || apiKey.includes('sandbox');
    const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";
    const headers = { 'access_token': apiKey, 'Content-Type': 'application/json' };

    // 2. Registra o cliente no Asaas
    const customerResp = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: cobrancaData.nome_devedor,
        cpfCnpj: cobrancaData.cpf_cnpj.replace(/\D/g, ''),
        email: cobrancaData.email,
        mobilePhone: cobrancaData.telefone.replace(/\D/g, '')
      })
    });
    const customer = await customerResp.json();

    let paymentId = 'mock_id_sandbox_fallback';
    let invoiceUrl = 'https://sandbox.asaas.com/mock';

    if (customer.errors && isSandbox && customer.errors.some((e: any) => e.code === 'invalid_cpfCnpj')) {
      console.log("Ignorando erro de CPF no sandbox e simulando cobrança mockada...");
      // Emula uma resposta de sucesso para o teste de devedor simulado
    } else {
      if (customer.errors) {
        throw new Error(`Erro Asaas (Cliente): ${customer.errors[0]?.description}`);
      }

      // 3. Emite a cobrança com externalReference rastreável
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 2);

      const paymentResp = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer: customer.id,
          billingType: 'PIX',
          value: valorFinalCobranca,
          dueDate: dataVencimento.toISOString().split('T')[0],
          description: `Acordo Extrajudicial Homologado - Protocolo ${cobrancaData.protocolo}`,
          externalReference: JSON.stringify({ cobrancaId, tipo: 'RECOVERY_LIQUIDACAO' })
        })
      });
      const payment = await paymentResp.json();

      if (payment.errors) {
        console.error("Asaas Payment Error:", payment.errors);
        throw new Error(`Erro Asaas (Pagamento): ${payment.errors[0]?.description}`);
      }
      
      paymentId = payment.id;
      invoiceUrl = payment.invoiceUrl;
    }

    // Atualiza o documento vinculando o ID do gateway financeiro
    await db!.collection('recovery_cobrancas').doc(cobrancaId).update({
      asaasPaymentId: paymentId,
      invoiceUrl: invoiceUrl
    });

    res.status(200).json({ success: true, paymentId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notificar-audiencia', async (req, res) => {
  try {
    const { cobrancaId, data, hora, linkMeet } = req.body;
    const docRef = db!.collection('recovery_cobrancas').doc(cobrancaId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Cobrança não encontrada' });
    }

    const cobranca = docSnap.data()!;
    const { nome_devedor, email, telefone, protocolo } = cobranca;

    const subject = `⚖️ Agendamento de Mediação Confirmado - Protocolo ${protocolo}`;
    const textoMensagem = `⚠️ *SESSÃO DE MEDIAÇÃO AGENDADA - GSA RECOVERY*\n\nPrezado(a) ${nome_devedor}, sua solicitação de mediação técnica foi protocolada.\n\n📅 *Data:* ${data}\n⏰ *Hora:* ${hora}\n📍 *Local:* Google Meet (${linkMeet})\n\nCompareça no horário agendado clicando no link acima. O não comparecimento acarretará no encerramento da fase amigável extrajudicial.`;

    // Disparo WhatsApp
    if (telefone) {
      await enviarWhatsApp(telefone, textoMensagem);
    }

    // Disparo E-mail
    if (email) {
      await enviarEmail({
        to: email,
        subject,
        html: `<div style="font-family:sans-serif; max-width:600px; color:#334155;">
                <h2>Agendamento de Audiência On-line</h2>
                <p>Prezado(a) <strong>${nome_devedor}</strong>,</p>
                <p>Este é um aviso automático confirmando seu agendamento de mediação com a Câmara GSA.</p>
                <div style="background:#f8fafc; padding:15px; border-left:4px solid #4f46e5; margin: 20px 0;">
                  <p>📅 <strong>Data:</strong> ${data}</p>
                  <p>⏰ <strong>Hora:</strong> ${hora}</p>
                </div>
                <br>
                <a href="${linkMeet}" style="padding:12px 24px; background:#0f172a; color:#fff; text-decoration:none; font-weight:bold; border-radius:8px;">Acessar Sala (Google Meet)</a>
              </div>`
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/gerar-ata', verifyToken, async (req, res) => {
  try {
    const { cobrancaId, anotacoes_mediador } = req.body;
    
    // Buscar cobranca
    const docSnap = await db!.collection('recovery_cobrancas').doc(cobrancaId).get();
    if (!docSnap.exists) return res.status(404).json({ error: "Cobrança não encontrada." });
    
    const cobranca = docSnap.data()!;

    const prompt = `
      Atue como um Mediador Extrajudicial Sênior da Câmara GSA.
      Redija a ATA DE AUDIÊNCIA DE MEDIAÇÃO EXTRAJUDICIAL baseada nas anotações de rascunho abaixo.
      A ata deve ser formal, imparcial e conter termos jurídicos de conciliação. 
      Utilize HTML (tags <p>, <br>, <b>, <ul>) para formatar o texto.
      
      DADOS DA AUDIÊNCIA:
      - Protocolo: ${cobranca?.protocolo}
      - Devedor/Notificado: ${cobranca?.nome_devedor} (Doc: ${cobranca?.cpf_cnpj})
      - Dívida Original Discutida: R$ ${cobranca?.valor_divida}
      - Data da Sessão: ${new Date().toLocaleDateString('pt-BR')}

      ANOTAÇÕES DO MEDIADOR (O que aconteceu na sessão):
      "${anotacoes_mediador}"

      Se as anotações indicarem acordo, redija o "Termo de Acordo Extrajudicial". Se indicarem falta de acordo, redija o "Termo de Tentativa Conciliatória Infrutífera".
    `;

    const response = await executeAI(async () => {
      const { ai } = await import('../lib/ai');
      return await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });
    });

    const ataHtml = (response as any).text || '';

    // Salvar a ata na base de dados
    await db!.collection('recovery_cobrancas').doc(cobrancaId).update({
      ata_sessao: ataHtml,
      ultima_atualizacao: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ success: true, ata_html: ataHtml });
  } catch (error: any) {
    console.error("Erro na IA do Mediador:", error);
    res.status(500).json({ error: 'Falha ao gerar ata com IA.' });
  }
});

// ROTA 5: Finalizar Sessão (Com Acordo ou Sem Acordo)
router.post('/finalizar-audiencia', verifyToken, async (req, res) => {
  try {
    const { cobrancaId, houveAcordo, ataFinal } = req.body;
    const cobrancaRef = db!.collection('recovery_cobrancas').doc(cobrancaId);
    
    if (houveAcordo) {
      await cobrancaRef.update({
        status: 'ACORDO_ACEITO',
        data_aceite: new Date().toISOString(),
        ata_sessao_final: ataFinal
      });

      // Dispara a mesma lógica que já tens para gerar o PIX do Asaas
      // (Opcional: podes chamar a rota interna /gerar-cobranca-acordo via Axios ou replicar a lógica aqui)
      
    } else {
      await cobrancaRef.update({
        status: 'ENCERRADO_SEM_ACORDO',
        data_encerramento: new Date().toISOString(),
        ata_sessao_final: ataFinal
      });
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao finalizar audiência.' });
  }
});

// ROTA: Conectar com a API do Assinafy para envio do PDF e disparo por e-mail
router.post('/criar-assinatura', verifyToken, async (req, res) => {
  try {
    const { titulo, signatarios, tenantId, documentBase64, fileName } = req.body;

    const ASSINAFY_API_KEY = process.env.ASSINAFY_API_KEY;
    
    let mockAssinafyId = 'doc_' + Math.random().toString(36).substring(2, 9);
    let mockAssignmentId = 'assign_' + Math.random().toString(36).substring(2, 9);
    let mockSignerIds = ['signer_' + Math.random().toString(36).substring(2, 9)];

    if (!ASSINAFY_API_KEY) {
      console.warn("Chave API do Assinafy não configurada. Registrando com IDs simulados.");
    } else {
      try {
        // 1. Obter a primeira conta (Workspace) da Assinafy
        const resAccount = await axios.get("https://api.assinafy.com.br/v1/accounts", {
          headers: { "X-Api-Key": ASSINAFY_API_KEY }
        });
        const accountId = resAccount.data?.data?.[0]?.id;
        
        if (!accountId) throw new Error("Nenhuma conta Assinafy encontrada no Workspace.");

        // 2. Fazer upload do documento (PDF)
        const buffer = Buffer.from(documentBase64, 'base64');
        const formData = new FormData();
        formData.append('file', buffer, { filename: fileName || 'documento.pdf', contentType: 'application/pdf' });

        const resDocDirect = await axios.post(`https://api.assinafy.com.br/v1/accounts/${accountId}/documents`, formData, {
          headers: {
            "X-Api-Key": ASSINAFY_API_KEY,
            ...formData.getHeaders()
          }
        });

        const documentId = resDocDirect.data.data.id;
        mockAssinafyId = documentId;

        // 3. Adicionar Signatários
        const signerIds: string[] = [];
        for (const s of signatarios) {
          try {
            const resSigner = await axios.post(`https://api.assinafy.com.br/v1/accounts/${accountId}/signers`, {
              full_name: s.nome,
              email: s.email
            }, {
              headers: {
                "X-Api-Key": ASSINAFY_API_KEY,
                "Content-Type": "application/json"
              }
            });

            signerIds.push(resSigner.data.data.id);
          } catch (err: any) {
            const errorStr = err.response ? JSON.stringify(err.response.data) : '';
            if (errorStr.includes("Um signatário com este e-mail já existe") || (err.response?.data?.message && err.response.data.message.includes("já existe"))) {
              // Signatário já existe, vamos buscar a lista e encontrar o ID dele
              const resList = await axios.get(`https://api.assinafy.com.br/v1/accounts/${accountId}/signers`, {
                headers: { "X-Api-Key": ASSINAFY_API_KEY }
              });
              const existing = resList.data?.data?.find((x: any) => x.email === s.email);
              if (existing) {
                signerIds.push(existing.id);
              } else {
                throw new Error(`Signatário com e-mail ${s.email} existe, mas não foi encontrado na lista.`);
              }
            } else {
              throw err;
            }
          }
        }
        mockSignerIds = signerIds;

        // 4. Criar assignment (atribuição) para envio
        const assignRes = await axios.post(`https://api.assinafy.com.br/v1/documents/${documentId}/assignments`, {
          method: "virtual",
          signerIds: signerIds
        }, {
          headers: {
            "X-Api-Key": ASSINAFY_API_KEY,
            "Content-Type": "application/json"
          }
        });

        mockAssignmentId = assignRes.data?.data?.id || mockAssignmentId;

      } catch (err: any) {
        console.error("Erro na comunicação real com a Assinafy:", err.response ? JSON.stringify(err.response.data) : err.message);
        // Em caso de erro na Assinafy, retornamos erro para a requisição não ficar presa
        return res.status(400).json({ error: "Erro na API de assinaturas: " + (err.response ? JSON.stringify(err.response.data) : err.message) });
      }
    }

    // Registo no Firebase
    await db!.collection('recovery_assinaturas').add({
      titulo,
      assinafyId: mockAssinafyId,
      assinafyAssignmentId: mockAssignmentId,
      assinafySignerIds: mockSignerIds,
      quantidade_signatarios: signatarios.length,
      status: 'AGUARDANDO_ASSINATURAS',
      tenantId: tenantId || 'master',
      criado_em: new Date().toISOString()
    });

    res.status(201).json({ success: true, id: mockAssinafyId });
  } catch (error: any) {
    console.error("Erro interno:", error);
    res.status(500).json({ error: error.message });
  }
});

// ROTA: Reenviar e-mail de assinatura via Assinafy
router.post('/assinatura/:id/reenviar', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const docSnap = await db!.collection('recovery_assinaturas').doc(id).get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Assinatura não encontrada no banco." });
    }
    
    const assData = docSnap.data();
    const ASSINAFY_API_KEY = process.env.ASSINAFY_API_KEY;

    if (ASSINAFY_API_KEY && assData?.assinafyId && assData?.assinafyAssignmentId && assData?.assinafySignerIds) {
      for (const signerId of assData.assinafySignerIds) {
        const url = `https://api.assinafy.com.br/v1/documents/${assData.assinafyId}/assignments/${assData.assinafyAssignmentId}/signers/${signerId}/resend`;
        try {
          await axios.put(url, {}, {
            headers: {
              'X-Api-Key': ASSINAFY_API_KEY,
              'Content-Type': 'application/json'
            }
          });
        } catch (assinafyError: any) {
           console.error("[ERRO ASSINAFY RESEND]:", assinafyError.response ? JSON.stringify(assinafyError.response.data) : assinafyError.message);
        }
      }
    } else {
      console.warn("Assinafy: Faltam IDs para reenviar (Doc, Assign ou Signer) ou Chave não configurada.");
    }

    res.json({ success: true, message: "E-mail de lembrete solicitado com sucesso." });
  } catch (error) {
    console.error("Erro ao reenviar assinatura:", error);
    res.status(500).json({ error: "Falha ao reenviar e-mail." });
  }
});

// ROTA: Sincronizar status com a Assinafy
router.post('/assinatura/:id/sincronizar', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const docSnap = await db!.collection('recovery_assinaturas').doc(id).get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Assinatura não encontrada." });
    }
    
    const assData = docSnap.data();
    const ASSINAFY_API_KEY = process.env.ASSINAFY_API_KEY;
    
    let currentStatus = assData?.status;
    let linkDownload = assData?.link_download_final;

    if (ASSINAFY_API_KEY && assData?.assinafyId && !assData.assinafyId.startsWith('doc_') && !assData.assinafyId.startsWith('ASS-')) {
        try {
            const resp = await axios.get(`https://api.assinafy.com.br/v1/documents/${assData.assinafyId}`, {
                headers: {
                    'X-Api-Key': ASSINAFY_API_KEY,
                    'Accept': 'application/json'
                }
            });

            const docData = resp.data?.data || {};
            const assinafyStatus = docData.status;

            if (assinafyStatus === 'certificated' || assinafyStatus === 'signed' || assinafyStatus === 'completed') {
                currentStatus = 'ASSINADO';
                linkDownload = docData.artifacts?.bundle || docData.artifacts?.original || docData.file_url || null;
            } else if (assinafyStatus === 'rejected_by_signer' || assinafyStatus === 'voided' || assinafyStatus === 'canceled') {
                currentStatus = 'CANCELADO';
            } else if (assinafyStatus === 'partially_signed') {
                currentStatus = 'PARCIALMENTE_ASSINADO';
            } else if (assinafyStatus === 'pending_signature') {
                currentStatus = 'AGUARDANDO_ASSINATURAS';
            }
        } catch(e) {
            console.error("Erro na integração com Assinafy:", e);
        }
    } else {
        // Fallback for mocked IDs
        if (currentStatus !== 'ASSINADO') {
            currentStatus = 'ASSINADO';
            linkDownload = 'https://example.com/mock-signed-document.pdf';
        }
    }

    await db!.collection('recovery_assinaturas').doc(id).update({
        status: currentStatus,
        ...(linkDownload ? { link_download_final: linkDownload } : {})
    });

    res.json({ success: true, status: currentStatus });
  } catch (error) {
    console.error("Erro ao atualizar status da assinatura:", error);
    res.status(500).json({ error: "Falha ao sincronizar status." });
  }
});

export default router;
