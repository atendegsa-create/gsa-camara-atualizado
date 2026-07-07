import { db } from './firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Process, Tenant } from '../types';

/**
 * Motor de Abatimento e Split Inteligente
 * Calcula o split do honorário e abate a dívida da adesão (se houver), 
 * aplicando a Regra dos 50%.
 * 
 * @param processoId ID do processo
 * @param valorHonorarios O valor total recebido como honorários
 */
export async function calcularSplitEAbatimento(processoId: string, valorHonorarios: number) {
  // Passo A. Busca processo
  const processoRef = doc(db, 'processos', processoId);
  const processoSnap = await getDoc(processoRef);
  
  if (!processoSnap.exists()) {
    throw new Error(`Processo ${processoId} não encontrado.`);
  }

  const processo = processoSnap.data() as Process;
  const tenantId = processo.tenantId;

  if (!tenantId) {
    throw new Error(`Processo ${processoId} não está vinculado a uma Unidade (Tenant).`);
  }

  // Busca Tenant (Credenciada)
  const tenantRef = doc(db, 'tenants', tenantId);
  const tenantSnap = await getDoc(tenantRef);

  if (!tenantSnap.exists()) {
    throw new Error(`Unidade ${tenantId} não encontrada.`);
  }

  const tenant = tenantSnap.data() as Tenant;

  const tipoJustica = processo.tipoJustica || 'extrajudicial'; // Default se não informado
  const origemLead = processo.origemLead || 'direto';

  const regras = tenant.regrasComissao || {
    extrajudicialDiretoRoyalties: 0,
    extrajudicialBaseGsa: 50,
    judicialTaxa: 15
  };
  
  let splitGsa = 0;
  let splitCredenciado = 0;

  // Calcula quanto vai pra quem antes do abatimento de adesão
  if (tipoJustica === 'extrajudicial' && origemLead === 'direto') {
    // Passo B: Extrajudicial Direto -> apenas retenção de royalties (percentual)
    const taxaGsa = regras.extrajudicialDiretoRoyalties / 100;
    splitGsa = valorHonorarios * taxaGsa;
    splitCredenciado = valorHonorarios - splitGsa;
  } else if (tipoJustica === 'extrajudicial' && origemLead === 'base_gsa') {
    const taxaGsa = regras.extrajudicialBaseGsa / 100;
    splitGsa = valorHonorarios * taxaGsa;
    splitCredenciado = valorHonorarios - splitGsa;
  } else if (tipoJustica === 'judicial') {
    const taxaGsa = regras.judicialTaxa / 100;
    splitGsa = valorHonorarios * taxaGsa;
    splitCredenciado = valorHonorarios - splitGsa;
  } else {
    // Fallback pra taxa Administrativa Geral se n tiver
    const comissaoGeral = (tenant.financeiro?.comissaoExtrajudicial || 30) / 100;
    splitCredenciado = valorHonorarios * comissaoGeral;
    splitGsa = valorHonorarios - splitCredenciado;
  }

  // Garantindo no mínimo 0
  splitCredenciado = Math.max(0, splitCredenciado);
  splitGsa = Math.max(0, splitGsa);

  // Passo C & D: Verifica saldo da Adesão e aplica "Regra dos 50%" se aplicável
  let saldoAdesao = tenant.configContrato?.saldoAdesaoAberto || 0;
  let valorAbatido = 0;

  if (saldoAdesao > 0) {
    // Metade da comissão do credenciado é usada para abater a dívida
    const limiteAbatimento = splitCredenciado * 0.5;
    
    if (saldoAdesao <= limiteAbatimento) {
      valorAbatido = saldoAdesao;
    } else {
      valorAbatido = limiteAbatimento;
    }

    // Redireciona o fluxo
    splitCredenciado -= valorAbatido;
    splitGsa += valorAbatido;
    saldoAdesao -= valorAbatido;

    // Arredondamentos para centavos
    splitCredenciado = parseFloat(splitCredenciado.toFixed(2));
    splitGsa = parseFloat(splitGsa.toFixed(2));
    saldoAdesao = parseFloat(saldoAdesao.toFixed(2));
    valorAbatido = parseFloat(valorAbatido.toFixed(2));

    // Atualiza saldo na Unidade
    await updateDoc(tenantRef, {
      'configContrato.saldoAdesaoAberto': saldoAdesao,
      updatedAt: serverTimestamp()
    });

    // Passo 4: Registra histórico do extrato
    await addDoc(collection(tenantRef, 'extrato_credenciado'), {
      data: serverTimestamp(),
      processoId: processoId,
      valorHonorariosOriginal: valorHonorarios,
      valorAbatido: valorAbatido,
      saldoRestante: saldoAdesao,
      descricao: `Abatimento automático de 50% ref. Processo ${processo.nup || processoId}`
    });
  }

  return {
    splitGsa: parseFloat(splitGsa.toFixed(2)),
    splitCredenciado: parseFloat(splitCredenciado.toFixed(2)),
    saldoAdesaoRestante: parseFloat(saldoAdesao.toFixed(2)),
    valorAbatido: parseFloat(valorAbatido.toFixed(2))
  };
}
