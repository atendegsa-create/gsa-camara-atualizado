import express from 'express';
import { Type } from "@google/genai";
import { ai, executeAI } from '../lib/ai';
import { verifyToken } from '../middleware/auth';
import { db } from '../lib/firebase';

const router = express.Router();

router.post('/analyze', verifyToken, async (req, res) => {
  const { quizScore, descricao, situacao_atual, objetivo, categoria } = req.body;
  
  try {
    const fallbackAnalysis = {
      score: 50,
      level: "Médio",
      strategy: "Tentar contato amigável inicialmente."
    };

    const analysis = await executeAI(async () => {
      const prompt = `Analise este caso jurídico:
      - Categoria Pré-classificada: ${categoria || 'Não selecionada'}
      - Score do Quiz: ${quizScore}
      - Descrição: ${descricao}
      - Situação Atual: ${situacao_atual}
      - Objetivo: ${objetivo}
      
      Determine:
      1. Viabilidade da mediação (0-100)
      2. Nível de urgência
      3. Estratégia recomendada
      
      Retorne um JSON com:
      { "score": number, "level": "Baixo" | "Médio" | "Alto", "strategy": string }`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      return JSON.parse(result.text || "{}");
    }, fallbackAnalysis);

    res.json({ success: true, analysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/gerar-minuta', verifyToken, async (req, res) => {
  let { processo, tenant, tipoDocumento, processoId } = req.body;
  
  try {
    if (processoId && (!processo || !tenant)) {
      const processDoc = await db!.collection('processos').doc(processoId).get();
      if (processDoc.exists) {
        processo = { id: processDoc.id, ...processDoc.data() };
        if (processo.tenantId) {
          const tenantDoc = await db!.collection('tenants').doc(processo.tenantId).get();
          if (tenantDoc.exists) {
            tenant = tenantDoc.data();
          }
        }
      }
    }

    if (!processo || !tenant) {
      return res.status(400).json({ error: 'Dados insuficientes para a geração da inteligência jurídica.' });
    }

    const fallbackMinuta = `<p><b>DOCUMENTO OFICIAL</b></p><p>Devido a limitações de conexão no momento, o documento oficial deve ser preenchido manualmente pelas partes a partir deste modelo base.</p><br><p>Requerente: ${processo.cliente_nome}</p><p>Requerido: ${processo.parte_contraria_nome}</p>`;

    const conteudo = await executeAI(async () => {
      const prompt = `
      Atue como um redator jurídico sênior especializado em mediação e conciliação extrajudicial no Brasil (Lei nº 13.140/2015).
      O seu objetivo é redigir um documento oficial do tipo: "${tipoDocumento}".
      
      Regras de Negócio e Engenharia Jurídica da Câmara:
      1. O profissional que intermedia e assina a peça atua estritamente como "PROCURADOR" ou "MEDIADOR EXTRAJUDICIAL", nunca escreva "Advogado" ou utilize números de OAB para o mediador.
      2. Utilize formatação HTML amigável (tags <p>, <br>, <b>, <ul>, <li>) para que a saída seja legível e elegante no painel de texto.
      3. Seja formal, minucioso e garanta segurança contra nulidades contratuais.

      DADOS FORMATADOS DA UNIDADE CREDENCIADA (TENANT):
      - Razão Social: ${tenant.razao_social || tenant.nome_unidade || 'Câmara Privada de Conciliação GSA'}
      - CNPJ: ${tenant.cnpj || 'Não cadastrado'}
      - Endereço Oficial: ${tenant.endereco || 'Não cadastrado'}

      INFORMAÇÕES OPERACIONAIS DO PROCESSO:
      - NUP: ${processo.nup}
      - Requerente: ${processo.cliente_nome} (Documento: ${processo.cliente_documento || 'Não informado'})
      - Requerido: ${processo.parte_contraria_nome}
      - Valor Base do Conflito: R$ ${processo.valor_causa}
      - Termos do Acordo / Contraproposta Digital: ${processo.contraproposta_mensagem || processo.resumo_fato}
      - Valor Final Ajustado: R$ ${processo.contraproposta_valor || processo.valor_causa}

      Gere a minuta do documento completa a partir de agora. Retorne apenas o código do documento em si, sem comentários introdutórios.
    `;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      return result.text;
    }, fallbackMinuta);

    res.status(200).json({ success: true, conteudo });
  } catch (error: any) {
    console.error("Erro no motor do Gemini AI Studio:", error);
    res.status(500).json({ error: 'Falha na conexão com os servidores de inteligência artificial do Google.' });
  }
});

router.post('/inss/analyze', verifyToken, async (req, res) => {
  const { nome, idade, problema, tempo_contribuicao } = req.body;
  
  try {
    const fallbackINSS = {
      parecer_tecnico: "Devido ao alto volume de consultas no momento, o caso será analisado manualmente por um de nossos especialistas INSS. Aguarde o contato.",
      viabilidade: "Média"
    };

    const analysis = await executeAI(async () => {
      const prompt = `
        Analise os dados de triagem do INSS para o cliente ${nome}.
        Idade: ${idade}
        Problema relatado: ${problema}
        Tempo de contribuição: ${tempo_contribuicao}
        
        Gere um parecer técnico curto (máximo 300 caracteres) e defina a viabilidade (Alta, Média ou Baixa).
        Considere as regras atuais da Reforma da Previdência.
        
        Retorne um JSON com:
        - parecer_tecnico (string)
        - viabilidade (string)
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              parecer_tecnico: { type: Type.STRING },
              viabilidade: { type: Type.STRING }
            },
            required: ["parecer_tecnico", "viabilidade"]
          }
        }
      });
      return JSON.parse(result.text || "{}");
    }, fallbackINSS);

    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro na análise INSS" });
  }
});

router.post('/audit-rx', verifyToken, async (req, res) => {
  const { data, clientName, isFile, auditType, extraFields, customPrompt } = req.body;
  
  try {
    const analysis = await executeAI(async () => {
      let deterministicMath = "";
      if (auditType === 'CONTRATOS') {
        const strForm = JSON.stringify(extraFields || {});
        let pvMatch = strForm.match(/"valor_solicitado":"([^"]+)"/);
        let pctMatch = strForm.match(/"valor_parcela":"([^"]+)"/);
        let nMatch = strForm.match(/"parcelas_total":"([^"]+)"/);
        let tipoMatch = strForm.match(/"tipo_contrato":"([^"]+)"/);
        
        // Também tenta extrair direto se for objeto:
        const pvRaw = extraFields?.valor_solicitado || (pvMatch ? pvMatch[1] : null);
        const pmtRaw = extraFields?.valor_parcela || (pctMatch ? pctMatch[1] : null);
        const nRaw = extraFields?.parcelas_total || (nMatch ? nMatch[1] : null);
        const tipo = extraFields?.tipo_contrato || (tipoMatch ? tipoMatch[1] : null);

        if (pvRaw && pmtRaw && nRaw) {
          const pv = parseFloat(String(pvRaw).replace(/[^0-9,.-]/g, '').replace(',', '.'));
          const pmt = parseFloat(String(pmtRaw).replace(/[^0-9,.-]/g, '').replace(',', '.'));
          const n = parseInt(String(nRaw).replace(/[^0-9]/g, ''), 10);
          
          if (!isNaN(pv) && !isNaN(pmt) && !isNaN(n) && pv > 0 && pmt > 0 && n > 0 && (pmt * n > pv)) {
            let r = 0.05;
            for (let i = 0; i < 30; i++) {
                const mathPow = Math.pow(1 + r, -n);
                const f = pmt * (1 - mathPow) / r - pv;
                const df = pmt * (Math.pow(1 + r, -n - 1) * n * r - (1 - mathPow)) / (r * r);
                if (Math.abs(df) < 1e-10) break;
                r = r - f / df;
            }
            if (!isNaN(r) && r > 0) {
              const taxaJurosMensal = (r * 100).toFixed(2);
              const bacenAvg = tipo === 'FINANCIAMENTO_VEICULO' ? 1.8 : tipo === 'FINANCIAMENTO_IMOBILIARIO' ? 0.8 : tipo === 'CONSIGNADO' ? 1.5 : 2.5;
              const abusividade = (r * 100) > bacenAvg ? ((r * 100) - bacenAvg).toFixed(2) : '0';
              const totalPago = pmt * n;
              const totalJusto = pv * (bacenAvg/100) / (1 - Math.pow(1 + (bacenAvg/100), -n)) * n;
              const diferenca = totalPago - totalJusto;
              
              deterministicMath = `
[CÁLCULO MATEMÁTICO REAL INSERIDO PELO SISTEMA]:
- Valor Financiado: R$ ${pv.toFixed(2)}
- Valor da Parcela: R$ ${pmt.toFixed(2)}
- Prazo Total: ${n} meses
- Taxa de Juros Mensal Implícita (Tabela Price calculada via Newton-Raphson): ${taxaJurosMensal}% ao mês
- Média BACEN Estimada para o tipo (${tipo}): ${bacenAvg}% ao mês
- Taxa Abusiva Encontrada: ${abusividade}% acima da média
- Potencial de Restituição/Desconto (diferença projetada vs BACEN): R$ ${(diferenca > 0 ? diferenca : 0).toFixed(2)}
ATENÇÃO IA ESTRITAMENTE OBRIGATÓRIO: Baseie TUDO nos dados matemáticos acima. Mencione esses valores OBRIGATORIAMENTE no seu resumo_persuasivo e no potencial_recuperacao. O cálculo JÁ ESTÁ FEITO, utilize-o.
`;
            }
          }
        }
      }

      const prompt = `Você é o Especialista da Câmara GSA especializado em revisão de contratos.
Analise as informações fornecidas (formulário e/ou documentos anexos) para o caso de ${clientName} referente a ${auditType}. 
Extraia e infira o MÁXIMO possível de informações.
Se o documento anexado for um contrato, seu objetivo MÁXIMO é procurar abusividades reais e recalcular a dívida para encontrar o direito do cliente.

${deterministicMath}

SE O CÁLCULO ACIMA (deterministicMath) NÃO FOI INSERIDO (por falta de dados no formulário), VOCÊ DEVE OBRIGATORIAMENTE realizar as seguintes etapas se o documento for um contrato/extrato:
1. LER COM ATENÇÃO EXTREMA OS NÚMEROS NO DOCUMENTO OU IMAGEM ANEXADA. Extrair o Valor Original Solicitado (Financiado), o Valor exato da Parcela e a Quantidade Total de Parcelas EXATAMENTE como constam no documento. NUNCA invente números (Ex: se diz 3551.81, não escreva 44.14).
2. Se o documento contiver imagens de contratos ou telas do aplicativo bancário, extraia os valores exatos de saldo, parcela, prazos e taxa.
3. Passo de Cálculo 1: Multiplicar (Valor da Parcela x Quantidade de Parcelas) para descobrir o Valor Total que será Pago. 
4. Passo de Cálculo 2: Identificar a Taxa de Juros Mensal Real aplicada (Taxa Implícita).
5. Passo de Cálculo 3: Comparar com a média do BACEN: Veículos (~1.8%), Imobiliário (~0.8%), Consignado (~1.5%), Pessoal (~3.0%).
6. Passo de Cálculo 4: Calcular A DIFERENÇA EXATA entre o total cobrado pelo banco e o total justo segundo o BACEN, para demonstrar o Potencial de Recuperação financeiro (abusividade).
7. Detalhe obrigatoriamente toda essa matemática (as contas em si) no campo 'calculadores_de_juros_cot' antes de chegar na conclusão final.

Dados de formulário (podem estar incompletos ou vazios): ${JSON.stringify(extraFields)}

${customPrompt ? `[DIRETRIZES EXTRAS DO AUDITOR]:\n${customPrompt}\nAtenda estritamente a estas diretrizes em sua análise e resultados.` : ""}

Responda ESTRITAMENTE o JSON abaixo (sem markdown adicional):
{
  "viabilidade": boolean,
  "calculadores_de_juros_cot": string (OBRIGATÓRIO: Descreva aqui todo o seu raciocínio matemático, passo a passo, extraindo os valores reais do documento e fazendo a conta na mão. Ex: 60 parcelas de R$3551 = R$213.060. Mostre o cálculo da abusividade aqui),
  "potencial_recuperacao": number (o valor da diferença abusiva calculada em números),
  "complexidade": "BAIXA" | "MEDIA" | "ALTA" | "ESPECIAL",
  "detalhes": string (análise jurídica e resumo da abusividade),
  "taxa_juros_identificada": number,
  "valor_parcela": number,
  "rmc_detectada": boolean,
  "banco_contrato": string,
  "numero_contrato": string,
  "tarifas_abusivas": string[],
  "resumo_persuasivo": string (laudo detalhado e formatado em markdown, incluindo a demonstração dos fatos identificados, as abusividades matemáticas financeiras baseadas no campo calculadores_de_juros, e orientações táticas)
}`;

      const contents: any[] = [];
      if (isFile && data) {
        if (Array.isArray(data)) {
          contents.push(...data);
        } else {
          contents.push(data);
        }
      } else if (data && typeof data === 'string' && data.trim()) {
        contents.push({ text: data });
      }
      contents.push({ text: prompt });

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(result.text || "{}");
    });
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-document', verifyToken, async (req, res) => {
  const { type, auditData, nup } = req.body;
  try {
    const text = await executeAI(async () => {
      const prompt = `Gere um documento do tipo ${type} para o NUP ${nup} com os seguintes dados de auditoria: ${JSON.stringify(auditData)}. Retorne apenas o texto em Markdown.`;
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      return result.text;
    });
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/technical-report', verifyToken, async (req, res) => {
  const { auditData, nup } = req.body;
  try {
    const text = await executeAI(async () => {
      const prompt = `Gere um Laudo Técnico (Technical Report) detalhado em Markdown para o processo NUP ${nup} baseado na seguinte auditoria: ${JSON.stringify(auditData)}.`;
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      return result.text;
    });
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/settlement-agreement', verifyToken, async (req, res) => {
  const { auditData, nup, parties } = req.body;
  try {
    const text = await executeAI(async () => {
      const prompt = `Gere um Termo de Acordo (Settlement Agreement) em Markdown para o processo NUP ${nup}. Partes envolvidas: Cliente - ${parties.client}, Banco - ${parties.bank}. Dados da auditoria que motivaram o acordo: ${JSON.stringify(auditData)}.`;
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      return result.text;
    });
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/laudo-tecnico', verifyToken, async (req, res) => {
  const { fileBase64, mimeType, nup } = req.body;
  try {
    const text = await executeAI(async () => {
      const prompt = `Gere um laudo técnico baseado neste documento para o NUP ${nup}. Retorne um JSON com: { "markdown": string, "summary": object }`;
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { inlineData: { data: fileBase64, mimeType } },
          { text: prompt }
        ],
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(result.text || "{}");
    });
    res.json(text);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tenant-document', verifyToken, async (req, res) => {
  const { tipoDocumento, processo, tenant, instrucoesAdicionais } = req.body;
  try {
    const text = await executeAI(async () => {
      const outputFormat = instrucoesAdicionais && instrucoesAdicionais.includes('HTML') ? 'HTML (sem marcadores markdown de bloco)' : 'Markdown';
      const prompt = `Gere um documento do tipo ${tipoDocumento} para o processo ${JSON.stringify(processo)} da Câmara GSA. Dados do Tenant: ${JSON.stringify(tenant)}. Instruções adicionais: ${instrucoesAdicionais || 'Nenhuma'}. Formato de saída: ${outputFormat}`;
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      return result.text;
    });
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Zapsign Integration (Automated Workflow)
router.post('/zapsign/create-doc', verifyToken, async (req, res) => {
  const { name, content, signer_email, signer_name } = req.body;
  const token = process.env.ZAPSIGN_API_TOKEN;

  if (!token) {
    return res.json({ sign_url: "https://zapsign.com.br/sample-document", message: "Modo simulado." });
  }

  try {
    const response = await fetch('https://api.zapsign.com.br/api/v1/models/create-doc/', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        base64_pdf: Buffer.from(content).toString('base64'),
        signers: [{ name: signer_name, email: signer_email, lock_email: true, auth_mode: 'whatsapp' }]
      })
    });
    const data: any = await response.json();
    res.json({ sign_url: data.signers?.[0]?.sign_url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/validate-document', verifyToken, async (req, res) => {
  const { documentUrl, expectedData } = req.body;
  
  try {
    const analysis = await executeAI(async () => {
      let base64Image = req.body.documentBase64;
      let imgMimeType = req.body.mimeType || 'image/jpeg';
      
      if (!base64Image && documentUrl) {
        // Usando fetch nativo (Node 18+) para obter a imagem do Firebase Storage
        const imageResponse = await fetch(documentUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        base64Image = Buffer.from(imageBuffer).toString('base64');
        imgMimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
      }

      if (!base64Image) {
         throw new Error("No document provided (must include documentUrl or documentBase64)");
      }

      const prompt = `Você é um Auditor de Risco e Prevenção à Fraude da Câmara GSA. Sua função é analisar imagens de documentos de identificação ou contratos.
Instruções:

Extraia o Nome Completo, CPF/CNPJ e Data de Nascimento do documento anexado.

Compare rigorosamente com os dados cadastrais fornecidos no formato JSON em anexo:
${JSON.stringify(expectedData)}

Verifique se o documento está legível e se aparenta estar dentro da validade.

Você DEVE retornar EXCLUSIVAMENTE um objeto JSON válido no seguinte formato, sem nenhum texto adicional antes ou depois:
{ "scoreConfianca": 95, "divergencias": ["O nome no documento abrevia o último sobrenome"], "documentoLegivel": true, "nome": "Fulano", "cpf": "123", "valor_total": 1000 }`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { inlineData: { data: base64Image, mimeType: imgMimeType } },
          { text: prompt }
        ],
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scoreConfianca: { type: Type.NUMBER },
              divergencias: { type: Type.ARRAY, items: { type: Type.STRING } },
              documentoLegivel: { type: Type.BOOLEAN },
              nome: { type: Type.STRING },
              cpf: { type: Type.STRING },
              valor_total: { type: Type.NUMBER }
            },
            required: ["scoreConfianca", "divergencias", "documentoLegivel"]
          }
        }
      });

      return JSON.parse(result.text || "{}");
    });

    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error("Erro na validação de documento IA:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/process-chat', verifyToken, async (req, res) => {
  const { message, processContext, history = [] } = req.body;
  
  try {
    const response = await executeAI(async () => {
      const systemInstruction = `Você é o "Assistente de Processo GSA", um especialista jurídico de IA integrado à Câmara GSA.
Sua função é auxiliar procuradores e mediadores a analisar casos em tempo real.

CONTEXTO DO PROCESSO ATUAL:
${JSON.stringify(processContext, null, 2)}

DIRETRIZES:
1. Use o contexto acima para fundamentar suas respostas. Se algo não estiver no contexto, deixe claro que você não tem essa informação nos autos.
2. Seja objetivo, profissional e técnico juridicamente.
3. Ajude a identificar pontos críticos, prazos, cálculos de TAP e propostas de acordo.
4. Responda em Markdown.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...history.map((h: any) => ({
            role: h.role,
            parts: [{ text: h.content }]
          })),
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction,
        }
      });

      return result.text;
    });

    res.json({ success: true, response });
  } catch (error: any) {
    console.error("Erro no chat do processo:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
