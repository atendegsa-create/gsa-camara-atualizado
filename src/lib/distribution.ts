import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Lógica de Distribuição Algorítmica (Roleta de Processos)
 * Atribui o processo ao mediador com menor carga de trabalho.
 */
export async function atribuirMediador(processoId: string) {
  try {
    console.log(`🎯 Iniciando distribuição para o processo: ${processoId}`);

    // 1. Buscar todos os mediadores
    const mediadoresQuery = query(
      collection(db, 'usuarios'), 
      where('tipo_usuario', '==', 'Mediador')
    );
    const mediadoresSnap = await getDocs(mediadoresQuery);
    
    if (mediadoresSnap.empty) {
      console.warn("⚠️ Nenhum mediador encontrado no sistema para distribuição.");
      return null;
    }

    const mediadores = mediadoresSnap.docs.map(d => ({
      id: d.id,
      nome_completo: (d.data() as any).nome_completo || 'Mediador Sem Nome',
      carga: 0
    }));

    // 2. Analisar carga de trabalho (processos ativos 'Ativo - Em Mediação')
    // Nota: Em uma escala maior, poderíamos ter um contador na ficha do mediador, 
    // mas aqui faremos a query em tempo real para precisão total.
    for (const mediador of mediadores) {
      const cargaQuery = query(
        collection(db, 'processos'),
        where('mediadorId', '==', mediador.id),
        where('status', '==', 'Ativo - Em Mediação')
      );
      const cargaSnap = await getDocs(cargaQuery);
      mediador.carga = cargaSnap.size;
    }

    // 3. Ordenar por menor carga
    mediadores.sort((a, b) => a.carga - b.carga);
    const escolhido = mediadores[0];

    console.log(`✅ Mediador escolhido: ${escolhido.id} com carga ${escolhido.carga}`);

    // 4. Atualizar processo
    const processoRef = doc(db, 'processos', processoId);
    await updateDoc(processoRef, {
      mediadorId: escolhido.id,
      mediadorNome: escolhido.nome_completo || 'Mediador Designado',
      status: 'Ativo - Em Mediação',
      distribuidoEm: serverTimestamp(),
      ultima_atualizacao: serverTimestamp()
    });

    // 5. Registrar Log de Auditoria
    const logsRef = collection(db, 'processos', processoId, 'logs');
    await addDoc(logsRef, {
      tipo: 'SISTEMA',
      mensagem: `Distribuição Automática: Processo atribuído ao mediador ${escolhido.nome_completo}.`,
      autor_id: 'SISTEMA_DISTRIBUICAO',
      autor_nome: 'Algoritmo de Roleta GSA',
      is_ia: false,
      createdAt: serverTimestamp()
    });

    return escolhido;

  } catch (error) {
    console.error("❌ Erro na distribuição de mediador:", error);
    throw error;
  }
}

// Helper para addDoc que faltou no import acima
import { addDoc } from 'firebase/firestore';
