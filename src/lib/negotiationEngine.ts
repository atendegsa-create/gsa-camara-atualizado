import { db } from './firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { enviarMensagemTexto } from '../services/whatsappService';
import { generateDocumentWithTenantContext } from '../services/geminiService';
import { Process, Tenant } from '../types';

export async function gerarMinutaAcordo(processo: Process, tenant: Tenant | null, valorAcordado: number) {
  const prompt = `Atue como um Mediador e Conciliador Sênior de uma Câmara Privada de Mediação e Arbitragem (Câmara GSA). Sua tarefa é redigir um 'Termo de Acordo Extrajudicial' formal, claro e com validade de Título Executivo Extrajudicial, nos termos do art. 784, IV, do CPC brasileiro.
Instruções:

Utilize os dados fornecidos (Requerente, Requerido, Valor Acordado: ${valorAcordado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, Condições de Pagamento).

Inclua cláusulas padrão de penalidade por inadimplência (multa de 10% e juros de 1% ao mês).

Inclua a cláusula de confidencialidade e a cláusula compromissória elegendo a Câmara GSA para dirimir dúvidas futuras.

O tom deve ser estritamente jurídico, imparcial e pacificador.

Formate o texto em HTML sem formatações Markdown adicionais, pronto para ser renderizado em um editor de texto web.`;

  return generateDocumentWithTenantContext('TERMO', processo, tenant, prompt);
}

/**
 * Verifica se os valores de proposta cega do Requerente e Requerido
 * permitem um "Acordo Iminente".
 * Margem padrão: 10% (0.10).
 */
export async function verificarViabilidadeAcordo(processoId: string) {
  try {
    const procRef = doc(db, 'processos', processoId);
    const procDoc = await getDoc(procRef);

    if (!procDoc.exists()) return null;

    const data = procDoc.data();
    const bidding = data.blind_bidding;

    if (!bidding || bidding.proposta_requerente === undefined || bidding.proposta_requerido === undefined) {
      return null;
    }

    const valorRequerente = Number(bidding.proposta_requerente);
    const valorRequerido = Number(bidding.proposta_requerido);
    const margem = bidding.margem_viabilidade || 0.10;

    // Lógica: se o que o requerido quer pagar (oferta) >= 
    // valorRequerente * (1 - margem), há viabilidade.
    // Ou seja, a diferença é menor que a margem de 10%.
    
    const limiteInferiorAceitavel = valorRequerente * (1 - margem);

    if (valorRequerido >= limiteInferiorAceitavel) {
      // Acordo Iminente!
      await updateDoc(procRef, {
        status: 'ACORDO_IMINENTE',
        ultima_atualizacao: serverTimestamp()
      });

      // Tentar avisar os procuradores/mediadores do tenant, ou ao menos o mediador associado
      // Aqui vamos simular o aviso (na prática buscaríamos o telefone do mediador no Firestore)
      // Como não temos o telefone do mediador facilmente aqui, vamos logar apenas ou mandar 
      // para o dono do processo
      if (data.cliente_whatsapp) { // ou numero do mediador
         const msg = `🚨 Processo ${data.nup}: Viabilidade de acordo detetada! As partes chegaram a valores compatíveis. (Blind Bidding)`;
         await enviarMensagemTexto(data.cliente_whatsapp, msg, processoId);
      }

      return { status: 'ACORDO_IMINENTE', valorMedio: (valorRequerente + valorRequerido) / 2 };
    }

    return { status: 'EM_NEGOCIACAO', viabilidade: false };
  } catch (error) {
    console.error("Erro na verificação de acordo:", error);
    throw error;
  }
}
