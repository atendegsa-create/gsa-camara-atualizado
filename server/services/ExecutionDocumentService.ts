import admin from 'firebase-admin';
import { db } from '../lib/firebase';
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || 'MOCK_KEY',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export class ExecutionDocumentService {
  /**
   * Gera a Petição de Execução baseada no acordo inadimplido.
   */
  static async generateExecutionPetition(processId: string, userId: string, userName: string) {
    const processRef = db.collection('processos').doc(processId);
    const processDoc = await processRef.get();
    
    if (!processDoc.exists) throw new Error('Processo não encontrado.');
    
    const data = processDoc.data() as any;
    
    if (data.status !== 'PAGAMENTO_ATRASO') {
      throw new Error('A execução automática só pode ser gerada para acordos em atraso.');
    }

    // Coleta as variáveis exatas para a peça cíveis com fallbacks seguros
    const valorAcordo = Number(data.fase_data?.valor_acordo || data.valor_causa || 0);
    const dataHomologacao = data.fase_data?.data_pagamento_acordo || 'Data não registrada';
    const linkTermo = data.fase_data?.documento_acordo_url || 'Anexo aos autos';
    
    const clienteNome = data.cliente_nome || 'Credor';
    const parteContrariaNome = data.parte_contraria_nome || 'Devedor';
    const parteContrariaDocumento = data.parte_contraria_documento || 'CPF/CNPJ não registrado';

    // Calcula juros, multa e honorários contratuais (Exemplo padrão de 10% multa + 20% honorários)
    const multa = valorAcordo * 0.10;
    const honorarios = valorAcordo * 0.20;
    const valorAtualizado = valorAcordo + multa + honorarios;

    const promptJuridico = `
Atue como um Advogado Sênior Especialista em Execução Cível.
Redija uma 'Petição Inicial de Execução de Título Executivo Extrajudicial' (Art. 784, IV, do CPC c/c Lei 13.140/2015).

DADOS DO CASO:
- Exequente (Credor): Câmara GSA (representando ${clienteNome})
- Executado (Devedor): ${parteContrariaNome} (Doc: ${parteContrariaDocumento})
- Origem do Título: Termo de Acordo Extrajudicial homologado na câmara GSA, inadimplido.
- Data do Acordo original: ${dataHomologacao}
- Valor do Acordo Não Pago: R$ ${valorAcordo.toFixed(2)}
- Valor Atualizado da Execução (com 10% multa e 20% honorários contratuais previstos): R$ ${valorAtualizado.toFixed(2)}

INSTRUÇÕES DE FORMATAÇÃO:
1. Endereçamento: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE [DEIXAR ESPAÇO]"
2. Qualificação das partes de forma genérica para preenchimento.
3. Dos Fatos: Descreva brevemente que as partes compuseram acordo na Câmara GSA, o executado assinou o termo (que possui força de título executivo), mas tornou-se inadimplente.
4. Do Direito: Fundamente no Art. 784, IV do CPC e na certeza, liquidez e exigibilidade do título.
5. Dos Pedidos: Requeira a citação para pagamento em 3 dias sob pena de penhora online (Sisbajud), inclusão no Serasa (Serasajud), e bloqueio de bens (Renajud/Infojud).
6. Deixe no formato Markdown amigável para renderização web, sem comentários adicionais.`;

    let peticaoDraft = '';
    
    if (process.env.GEMINI_API_KEY) {
      try {
        // Usa gemini-3.1-pro-preview para petição jurídica densa e complexa
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: promptJuridico,
        });
        peticaoDraft = response.text || '';
      } catch (proError: any) {
        console.warn('Falha ao gerar petição usando gemini-3.1-pro-preview, tentando fallback para gemini-3.5-flash:', proError);
        try {
          const responseFallback = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: promptJuridico,
          });
          peticaoDraft = responseFallback.text || '';
        } catch (flashError: any) {
          console.error('Falha no fallback de geração de rascunho de petição:', flashError);
          throw new Error('Não foi possível gerar a petição por IA devido a erros no modelo Gemini.');
        }
      }
    } else {
      // Fallback sem chave para visualização mock
      peticaoDraft = `### EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA COMARCA DE [DEIXAR ESPAÇO]

**EXEQUENTE:** Câmara GSA (representando ${clienteNome})  
**EXECUTADO:** ${parteContrariaNome}, inscrito sob o documento ${parteContrariaDocumento}

#### I. DOS FATOS
As partes compuseram acordo amigável perante a Câmara de Mediação GSA na data de ${dataHomologacao}. O executado assumiu obrigação pecuniária no valor de R$ ${valorAcordo.toFixed(2)}, assinando termo de acordo com eficácia de título executivo extrajudicial (Lei nº 13.140/2015 e CPC, art. 784, IV).
Ocorre que o executado descumpriu integralmente os prazos de adimplemento, incorrendo em mora insolúvel, o que legitima a presente execução cível.

#### II. DO DIREITO
A execução encontra amparo legal no art. 784, inciso IV, do Código de Processo Civil. O título é líquido, certo e exigível.
Conforme termo firmado, em caso de inadimplemento, aplica-se multa penal coercitiva de 10% e honorários contratuais estipulados em 20%.

**Demonstrativo do Débito:**
- Principal Inadimplido: R$ ${valorAcordo.toFixed(2)}
- Multa Contratual (10%): R$ ${(valorAcordo * 0.10).toFixed(2)}
- Honorários (20%): R$ ${(valorAcordo * 0.20).toFixed(2)}
- **Valor Atualizado Total: R$ ${valorAtualizado.toFixed(2)}**

#### III. DOS PEDIDOS
Ante o exposto, requer-se:
1. A citação do Executado para que efetue o pagamento em 3 (três) dias, sob pena de penhora de bens;
2. Caso não adimplido, que se proceda ao bloqueio de ativos via Sisbajud/Renajud/Infojud;
3. Inclusão nos cadastros de proteção ao crédito (Serasajud).

Dá-se à causa o valor de R$ ${valorAtualizado.toFixed(2)}.

Nestes termos, pede deferimento.
[Local], [Data].`;
    }

    // Salva o rascunho no documento para ser revisado no editor
    await processRef.update({
      peticao_inicial_url: null, // Limpa URL antiga se houver
      peticao_draft_markdown: peticaoDraft,
      status: 'JUDICIAL_AGUARDANDO_PETICAO',
      'fase_data.valor_atualizado_execucao': valorAtualizado,
      logs: admin.firestore.FieldValue.arrayUnion({
        status: 'JUDICIAL_AGUARDANDO_PETICAO',
        mensagem: `Petição de Execução gerada automaticamente por IA.`,
        data: new Date(),
        usuario: userName
      })
    });

    return { success: true, draft: peticaoDraft };
  }
}
