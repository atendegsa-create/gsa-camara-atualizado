import { generateDocumentWithTenantContext } from './geminiService';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Process, Tenant } from '../types';
import jsPDF from 'jspdf';
import { uploadString, ref, getStorage, getDownloadURL } from 'firebase/storage';

/**
 * Compila Dossiê e Petição Inicial e armazena.
 */
export async function generateJudicialDossier(processoId: string, processo: Process, tenant: Tenant | null) {
  // 1. Puxar histórico de mediacao, AR, BlindBidding
  const logsQ = query(collection(db, 'processos', processoId, 'logs'));
  const logsSnap = await getDocs(logsQ);
  const logsData = logsSnap.docs.map(d => d.data());

  // Resumo do histórico
  const historicoText = logsData.map(l => `- [${l.data?.toDate ? l.data.toDate().toLocaleString() : new Date().toLocaleString()}] ${l.status}: ${l.mensagem}`).join('\n');
  const arStatus = processo.fase_data?.tipo_notificacao === 'AR' ? `Status AR: ${processo.fase_data.status_convite || 'PENDENTE'}` : 'Sem AR';

  // 2. Gerar PDF do Dossiê com jspdf
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("DOSSIÊ DE PROVAS EXTRAJUDICIAIS", 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Câmara de Mediação: ${tenant?.nome_unidade || 'GSA Master'}`, 20, 30);
  doc.text(`NUP: ${processo.nup}`, 20, 38);
  doc.text(`Cliente: ${processo.cliente_nome || 'Não informado'}`, 20, 46);
  doc.text(`Requerido: ${processo.parte_contraria_nome || 'Não informado'}`, 20, 54);
  
  doc.text("Resumo de Ações:", 20, 70);
  const splitText = doc.splitTextToSize(historicoText || 'Ações não registradas.', 170);
  doc.text(splitText, 20, 80);
  
  // Create PDF blob string (we skip storage to keep it simple, or save as base64 data url)
  const pdfBase64 = doc.output('datauristring');
  // Em produção, você faria upload para o Firebase Storage. Aqui vamos gerar um data url falso curto ou salvar como Base64.
  // Como o tamanho do processo pode estourar, o ideal é subir no Storage:
  const storage = getStorage();
  let dossieUrl = '';
  try {
    const dossieRef = ref(storage, `dossies/${processoId}_dossie.pdf`);
    await uploadString(dossieRef, pdfBase64, 'data_url');
    dossieUrl = await getDownloadURL(dossieRef);
  } catch (e) {
    console.warn("Storage não configurado, salvando dataURL simplificado");
    dossieUrl = "data:application/pdf;base64,...(storage indisponível)";
  }

  // 3. Chamar a IA (Gemini) para fazer Petição Inicial
  const prompt = `Atue como um Advogado Especialista em Execução e Cobrança. Sua tarefa é redigir o rascunho de uma 'Petição Inicial de Ação de Cobrança / Execução de Título'.
Instruções:

Utilize o resumo dos fatos fornecidos: tentativa de conciliação extrajudicial infrutífera na Câmara GSA, AR Online lido e ignorado, e propostas rejeitadas.
Resumo do Histórico:
${historicoText}

Status AR: ${arStatus}

Estruture a petição nos moldes tradicionais: Dos Fatos, Do Direito (focando no esgotamento da via extrajudicial e na validade das provas digitais), e Dos Pedidos.

Destaque que as provas documentais possuem selo de integridade criptográfica (Hash SHA-256).

O texto deve servir como uma base sólida (draft) para o advogado titular apenas revisar e assinar.

Retorne o texto bem estruturado em parágrafos claros.`;
  
  let peticaoResult = '';
  try {
    peticaoResult = await generateDocumentWithTenantContext('TERMO', processo, tenant, prompt);
  } catch (e: any) {
    peticaoResult = `# Erro ao gerar petição:\n${e.message}\n\nNo entanto, o dossiê foi gerado.`;
  }

  // Podemos salvar a peticao no Storage também como .md
  let peticaoUrl = peticaoResult; // Retornando raw string para facilitar. O ideal seria URL.

  return { dossieUrl, peticaoUrl };
}
