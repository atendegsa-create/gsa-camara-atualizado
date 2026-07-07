import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export interface AbandonedLead {
  nome: string;
  telefone: string;
  email?: string;
  documento?: string;
  status_processo?: string;
  source: string;
  etapa_alcancada: string;
  utms: any;
  createdAt: any;
  status: 'PENDENTE' | 'RECUPERADO' | 'PERDIDO';
  tipo_quiz: string;
}

/**
 * Registra um lead que iniciou um processo mas não terminou.
 * Pode ser chamado a cada etapa do formulário.
 */
export const registrarInteresseLead = async (data: Partial<AbandonedLead>) => {
  try {
    if (!data.telefone) {
      console.warn('Telefone é obrigatório para registrar interesse');
      return null;
    }
    const utms = JSON.parse(sessionStorage.getItem('gsa_utms') || '{}');
    
    // Verifica se já existe um registro recente para este telefone hoje
    const q = query(
      collection(db, 'carrinhos_abandonados'), 
      where('telefone', '==', data.telefone),
      where('status', '==', 'PENDENTE')
    );
    
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      // Atualiza o registro existente
      const docId = snap.docs[0].id;
      await updateDoc(doc(db, 'carrinhos_abandonados', docId), {
        ...data,
        utms,
        updatedAt: serverTimestamp()
      });
      return docId;
    } else {
      // Cria novo registro
      const docRef = await addDoc(collection(db, 'carrinhos_abandonados'), {
        ...data,
        utms,
        createdAt: serverTimestamp(),
        status: 'PENDENTE'
      });
      return docRef.id;
    }
  } catch (error) {
    console.error('Erro ao registrar interesse lead:', error);
    return null;
  }
};

/**
 * Marca um lead como recuperado (ex: quando ele finaliza o processo principal)
 */
export const marcarLeadRecuperado = async (telefone: string) => {
  try {
    if (!telefone) return;
    const q = query(
      collection(db, 'carrinhos_abandonados'), 
      where('telefone', '==', telefone),
      where('status', '==', 'PENDENTE')
    );
    
    const snap = await getDocs(q);
    
    const promises = snap.docs.map(d => 
      updateDoc(doc(db, 'carrinhos_abandonados', d.id), { 
        status: 'RECUPERADO',
        recuperadoAt: serverTimestamp()
      })
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Erro ao marcar lead recuperado:', error);
  }
};
