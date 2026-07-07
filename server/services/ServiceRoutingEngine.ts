import admin from 'firebase-admin';
import { db } from '../lib/firebase';
import { VitrineLeadRequest, AfiliadoInfo } from '../../src/types/vitrine';

export class ServiceRoutingEngine {
  
  /**
   * Processa a entrada de um novo lead vindo do link de afiliado da Vitrine
   */
  static async processNewLead(leadData: VitrineLeadRequest) {
    // 1. Identifica quem indicou (Tracking)
    let afiliado: AfiliadoInfo | null = null;
    
    if (leadData.afiliado_ref) {
      // 1. Tenta buscar pelo ID exato (retrocompatibilidade)
      let userDoc = await db.collection('usuarios').doc(leadData.afiliado_ref).get();
      let data = userDoc.exists ? userDoc.data() : null;

      // 2. Se não encontrou, tenta buscar por codigo_afiliado
      if (!data) {
        const codeUpper = leadData.afiliado_ref.toUpperCase();
        const querySnapshot = await db.collection('usuarios')
          .where('codigo_afiliado', '==', codeUpper)
          .limit(1)
          .get();
          
        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0];
          data = userDoc.data();
        }
      }

      // 3. Se ainda não encontrou, tenta buscar por prefixo do UID (ex: GSNNQE8P)
      if (!data && leadData.afiliado_ref.length >= 6) {
        const querySnapshot = await db.collection('usuarios')
          .where('__name__', '>=', leadData.afiliado_ref)
          .where('__name__', '<=', leadData.afiliado_ref + '\uf8ff')
          .limit(1)
          .get();

        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0];
          data = userDoc.data();
        }
      }

      if (data) {
        afiliado = {
          uid: userDoc.id,
          nome: data?.nome_completo || data?.nome || 'Usuário Sem Nome',
          tenantId: data?.tenantId || 'MASTER',
          tipo_usuario: data?.tipo_usuario || 'AFILIADO'
        };
      }
    }

    // Se não tiver afiliado válido, cai para a Master por padrão
    const origemTenantId = afiliado ? afiliado.tenantId : 'MASTER';

    // 2. Aplica as Regras de Roteamento
    let responsavel_roteamento = '';
    let status_inicial = 'LEAD_NOVO';

    if (leadData.categoria_servico === 'ADMINISTRATIVO') {
      // Regra 1: Administrativo SEMPRE vai para a GSA Câmara atuar como procuradora
      responsavel_roteamento = 'GSA_CAMARA_MASTER';
      status_inicial = 'TRIAGEM_ADMINISTRATIVA';
      
    } else if (leadData.categoria_servico === 'JUDICIAL') {
      // Regra 2: Judicial vindo da Master -> Admin da Master decide
      if (origemTenantId === 'MASTER') {
        responsavel_roteamento = 'ADMIN_MASTER';
        status_inicial = 'AGUARDANDO_ATRIBUICAO_JURIDICA';
      } 
      // Regra 3: Judicial vindo da Unidade -> Admin da Unidade decide
      else {
        responsavel_roteamento = `ADMIN_UNIDADE_${origemTenantId}`;
        status_inicial = 'AGUARDANDO_ATRIBUICAO_JURIDICA_UNIDADE';
      }
    }

    // 3. Salva o Lead no Firestore com a rastreabilidade completa
    const leadRef = db.collection('leads_vitrine').doc();
    
    const novoLead = {
      ...leadData,
      id: leadRef.id,
      data_captura: admin.firestore.FieldValue.serverTimestamp(),
      tenant_responsavel: origemTenantId,
      fila_atendimento: responsavel_roteamento,
      status: status_inicial,
      rastreamento_comissao: afiliado ? {
        indicado_por_uid: afiliado.uid,
        indicado_por_nome: afiliado.nome,
        comissao_status: 'PENDENTE_CONVERSAO'
      } : null
    };

    await leadRef.set(novoLead);

    return { 
      success: true, 
      leadId: leadRef.id, 
      roteamento: responsavel_roteamento 
    };
  }
}
