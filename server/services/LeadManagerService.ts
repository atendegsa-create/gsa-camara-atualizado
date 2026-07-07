import admin from 'firebase-admin';
import { db } from '../lib/firebase';

export class LeadManagerService {
  
  /**
   * Registra uma interação (nota, ligação, dúvida) no histórico do Lead
   */
  static async adicionarNotaAtendimento(leadId: string, adminId: string, adminNome: string, mensagem: string, novoStatus?: string) {
    const leadRef = db.collection('leads_vitrine').doc(leadId);
    
    const updateData: any = {
      ultima_interacao: admin.firestore.FieldValue.serverTimestamp(),
      historico_atendimento: admin.firestore.FieldValue.arrayUnion({
        data: new Date(),
        autor_id: adminId,
        autor_nome: adminNome,
        mensagem: mensagem
      })
    };

    if (novoStatus) {
      updateData.status = novoStatus; // Ex: mudando de 'LEAD_NOVO' para 'EM_ATENDIMENTO'
    }

    await leadRef.update(updateData);
    return { success: true };
  }

  /**
   * Converte o Lead em um Usuário do App, enviando link de criação de senha
   */
  static async convidarLeadParaApp(leadId: string) {
    const leadDoc = await db.collection('leads_vitrine').doc(leadId).get();
    if (!leadDoc.exists) throw new Error('Lead não encontrado');
    
    const leadData = leadDoc.data() as any;

    if (!leadData.email) {
      throw new Error('O Lead precisa de um e-mail cadastrado para acessar o App.');
    }

    const authInstance = admin.auth();

    // 1. Cria o usuário no Firebase Auth
    let userRecord;
    try {
      userRecord = await authInstance.getUserByEmail(leadData.email);
    } catch (error) {
      // Usuário não existe, vamos criar
      userRecord = await authInstance.createUser({
        email: leadData.email,
        displayName: leadData.nome,
        phoneNumber: leadData.telefone ? (leadData.telefone.startsWith('+') ? leadData.telefone : `+55${leadData.telefone.replace(/\D/g, '')}`) : undefined
      });
    }

    // 2. Salva o perfil na coleção de Usuários
    await db.collection('usuarios').doc(userRecord.uid).set({
      nome_completo: leadData.nome,
      email: leadData.email,
      whatsapp: leadData.telefone,
      tipo_usuario: 'CLIENTE',
      tenantId: leadData.tenant_responsavel || 'MASTER', // Vincula ao tenant que capturou
      status: 'ATIVO',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 3. Gera o Link Mágico de redefinição de senha para enviar ao cliente
    const actionCodeSettings = {
      url: `${process.env.APP_URL || 'https://gsa-mediacao.com.br'}/acesso-cliente?leadId=${leadId}`,
      handleCodeInApp: true,
    };
    const linkAcesso = await authInstance.generatePasswordResetLink(leadData.email, actionCodeSettings);

    // 4. Transforma o Lead em Processo oficial e vincula o cliente
    const processRef = db.collection('processos').doc();
    await processRef.set({
      cliente_id: userRecord.uid,
      cliente_nome: leadData.nome,
      tenantId: leadData.tenant_responsavel || 'MASTER',
      status: 'ANALISE_DOCUMENTAL',
      tipoJustica: leadData.categoria_servico === 'JUDICIAL' ? 'judicial' : 'extrajudicial',
      data_abertura: admin.firestore.FieldValue.serverTimestamp(),
      resumo_fato: `Solicitação via Vitrine: ${leadData.servico_solicitado}`,
    });

    // Atualiza o Lead como convertido
    await leadDoc.ref.update({ 
      status: 'CONVERTIDO_EM_CLIENTE',
      processo_id: processRef.id 
    });

    return { success: true, linkAcesso, processoId: processRef.id };
  }
}
