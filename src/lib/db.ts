import { collection, query, where, getDocs, addDoc, serverTimestamp, QueryConstraint, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, Process, Lead } from '../types';

/**
 * CAMADA DE ABSTRAÇÃO MULTI-TENANT
 * Garante que qualquer consulta feita por unidades credenciadas seja restrita ao seu próprio tenantId.
 * O Master pode ver tudo ou passar um tenantId específico nos filtros adicionais.
 */
export function buildTenantQuery(
  collectionName: string, 
  userProfile: UserProfile, 
  additionalConstraints: QueryConstraint[] = []
) {
  const baseCollection = collection(db, collectionName);
  const isMaster = userProfile && ['MASTER', 'ADMIN', 'MasterAdmin', 'AdminGeral', 'Administrador'].includes(userProfile.tipo_usuario || '');

  if (isMaster) {
    // MASTER vê tudo (a menos que additionalConstraints já tenha um filtro de tenantId)
    return query(baseCollection, ...additionalConstraints);
  }

  // Se não for MASTER, trava a consulta no tenantId do usuário
  if (!userProfile.tenantId) {
    console.warn(`Usuário ${userProfile.id} não possui tenantId. Retornando query que resultará em vazio.`);
    return query(
      baseCollection, 
      where('tenantId', '==', 'NONE_GSA_ID'), // Filtrar por um ID inexistente garante resultado vazio sem quebrar
      ...additionalConstraints
    );
  }

  return query(
    baseCollection, 
    where('tenantId', '==', userProfile.tenantId), 
    ...additionalConstraints
  );
}

// ------------------------------------------------------------------
// EXEMPLOS PRÁTICOS DE REFATORAÇÃO
// ------------------------------------------------------------------

/**
 * BUSCAR PROCESSOS
 */
export async function getProcesses(userProfile: UserProfile, statusFilter?: string): Promise<Process[]> {
  try {
    const constraints: QueryConstraint[] = [];
    
    // Filtros adicionais normais do sistema
    if (statusFilter) {
      constraints.push(where('status', '==', statusFilter));
    }
    
    // Ordenação (exige index no Firestore)
    constraints.push(orderBy('data_abertura', 'desc'));

    // Constrói a query com segurança Multi-Tenant
    const q = buildTenantQuery('processos', userProfile, constraints);
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Process));
  } catch (error) {
    console.error("Erro ao buscar processos:", error);
    throw error;
  }
}

/**
 * BUSCAR LEADS (CRM Comercial)
 */
export async function getLeads(userProfile: UserProfile): Promise<Lead[]> {
  try {
    // Para leads, podemos apenas listar os mais recentes, o buildTenantQuery isola a unidade
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    
    const q = buildTenantQuery('leads', userProfile, constraints);
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
  } catch (error) {
    console.error("Erro ao buscar leads:", error);
    throw error;
  }
}

/**
 * CRIAR PROCESSO COM INJEÇÃO AUTOMÁTICA DE TENANT
 */
export async function createProcess(
  data: Partial<Process>, 
  userProfile: UserProfile
): Promise<string> {
  try {
    const isMaster = userProfile && ['MASTER', 'ADMIN', 'MasterAdmin', 'AdminGeral', 'Administrador'].includes(userProfile.tipo_usuario || '');
    
    // Se for MASTER, ele pode estar criando o processo para uma unidade específica e enviando o tenantId no "data".
    // Se for Unidade (não-Master), o tenantId é obrigatoriamente o do perfil logado, ignorando tentativas de fraude.
    const assignedTenantId = isMaster ? (data.tenantId || null) : userProfile.tenantId;

    if (!isMaster && !assignedTenantId) {
      throw new Error("Não é possível criar um processo sem vínculo a uma unidade.");
    }

    const processData = {
      ...data,
      tenantId: assignedTenantId,
      data_abertura: serverTimestamp(),
      ultima_atualizacao: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'processos'), processData);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar processo:", error);
    throw error;
  }
}
