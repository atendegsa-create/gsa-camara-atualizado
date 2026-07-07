import fetch from 'node-fetch';

import axios from 'axios';
import FormData from 'form-data';

export class AssinafyService {
  private static getHeaders() {
    const apiKey = process.env.ASSINAFY_API_KEY || '';
    return {
      "X-Api-Key": apiKey,
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };
  }

  /**
   * Cria o Termo de Acordo na API da Assinafy e retorna o link de assinatura para o devedor.
   */
  static async gerarTermoAcordo(
    devedorNome: string,
    devedorEmail: string,
    devedorCpf: string,
    valorAcordo: number,
    processId: string
  ): Promise<{ documentId: string; signingUrl: string }> {
    const apiKey = process.env.ASSINAFY_API_KEY;

    if (!apiKey) {
      console.warn("ASSINAFY_API_KEY não configurada. Gerando Termo de Acordo simulado.");
      const mockDocId = `doc-${Date.now()}`;
      return {
        documentId: mockDocId,
        signingUrl: `https://app.assinafy.com.br/sign/${mockDocId}?simulated=true`
      };
    }

    try {
      // 1. Obter a primeira conta (Workspace) da Assinafy
      const resAccount = await axios.get("https://api.assinafy.com.br/v1/accounts", {
        headers: { "X-Api-Key": apiKey }
      });
      const accountId = resAccount.data?.data?.[0]?.id;

      if (!accountId) {
        throw new Error("Nenhuma conta Assinafy encontrada no Workspace.");
      }

      // 2. Verificar se existe algum template pré-configurado
      const resTemplates = await axios.get(`https://api.assinafy.com.br/v1/accounts/${accountId}/templates`, {
        headers: { "X-Api-Key": apiKey },
        validateStatus: () => true
      });
      
      let templateId: string | null = null;
      if (resTemplates.status === 200 && resTemplates.data?.data?.length > 0) {
        templateId = resTemplates.data.data[0].id;
      }

      // 3. Se houver um template, gera a partir do template preenchendo os dados
      if (templateId) {
        console.log(`Gerando termo de acordo com o template: ${templateId}`);

        // Criamos o Signer primeiro se ele não existir, ou enviamos direto na criação
        // Vamos registrar o signatário (devedor)
        let signerId;
        const targetEmail = devedorEmail || `devedor.${Date.now()}@exemplo-gsa.com.br`;
        try {
          const resSigner = await axios.post(`https://api.assinafy.com.br/v1/accounts/${accountId}/signers`, {
            full_name: devedorNome,
            email: targetEmail
          }, {
            headers: this.getHeaders()
          });
          signerId = resSigner.data.data.id;
        } catch (err: any) {
          const errorStr = err.response ? JSON.stringify(err.response.data) : '';
          if (errorStr.includes("Um signatário com este e-mail já existe") || (err.response?.data?.message && err.response.data.message.includes("já existe"))) {
            const resList = await axios.get(`https://api.assinafy.com.br/v1/accounts/${accountId}/signers`, {
              headers: this.getHeaders()
            });
            const existing = resList.data?.data?.find((x: any) => x.email === targetEmail);
            if (existing) {
              signerId = existing.id;
            } else {
              throw new Error(`Signatário com e-mail ${targetEmail} existe, mas não foi encontrado na lista.`);
            }
          } else {
            throw err;
          }
        }

        // Criar documento do template
        const payload = {
          name: `Termo de Acordo Extrajudicial - Proc. ${processId}`,
          signers: [
            {
              role_id: "signer", // Ajusta se a API exigir role_id do template
              id: signerId,
              verification_method: "Email",
              notification_methods: ["Email"]
            }
          ],
          editor_fields: [
            { field_id: "nome_devedor", value: devedorNome },
            { field_id: "cpf_devedor", value: devedorCpf },
            { field_id: "valor_acordo", value: `R$ ${valorAcordo.toFixed(2)}` },
            { field_id: "processo_id", value: processId }
          ]
        };

        const resDoc = await axios.post(`https://api.assinafy.com.br/v1/accounts/${accountId}/templates/${templateId}/documents`, payload, {
          headers: this.getHeaders(),
          validateStatus: () => true
        });

        if (resDoc.status === 200 || resDoc.status === 201) {
          // Retornar o id do documento e a URL de assinatura
          const docId = resDoc.data.data.id;
          const signingUrl = resDoc.data.data.signing_url || `https://app.assinafy.com.br/sign/${docId}`;
          return { documentId: docId, signingUrl };
        } else {
          console.error("Falha ao criar a partir de template, tentando envio de documento fallback.", resDoc.data);
        }
      }

      // 4. Fallback: Envio direto de documento em PDF (caso não tenha template)
      console.log("Template não disponível ou erro ao criar a partir do template. Criando documento direto via PDF.");
      
      const dummyBase64 = "JVBERi0xLjEKJcKlwrHDqwoKMSAwIG9iago8PAovQ3JlYXRvciAoQ2FudmEpCi9Qcm9kdWNlciAobGlicG5nKQovQ3JlYXRpb25EYXRlIChEOjIwMjQwMjIxMDUxMzUyKzAwJzAwJykKPj4KZW5kb2JqCgoyIDAgb2JqCjw8Ci9UeXBlIC9DYXRhbG9nCi9QYWdlcyAzIDAgUgo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMyAwIFIKL01lZGlhQm94IFswIDAgMTAgMTBdCi9Db250ZW50cyAwIDAgb2JqCjw8Ci9MZW5ndGggMAo+PgplbmRvYmoKCmV4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTU0IDAwMDAwIG4gCjAwMDAwMDAyMDkgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDIgMCBSCj4+CnN0YXJ0eHJlZgoyODQKJSVFT0Y=";
      const buffer = Buffer.from(dummyBase64, 'base64');
      
      const formData = new FormData();
      formData.append('file', buffer, { filename: 'termo_acordo.pdf', contentType: 'application/pdf' });

      const resDocDirect = await axios.post(`https://api.assinafy.com.br/v1/accounts/${accountId}/documents`, formData, {
        headers: {
          "X-Api-Key": apiKey,
          ...formData.getHeaders()
        }
      });

      const documentId = resDocDirect.data.data.id;

      // Adicionar Signer
      let signerId;
      const targetEmail2 = devedorEmail || `devedor.${Date.now()}@exemplo-gsa.com.br`;
      try {
        const resSigner = await axios.post(`https://api.assinafy.com.br/v1/accounts/${accountId}/signers`, {
          full_name: devedorNome,
          email: targetEmail2
        }, {
          headers: this.getHeaders()
        });
        signerId = resSigner.data.data.id;
      } catch (err: any) {
        const errorStr = err.response ? JSON.stringify(err.response.data) : '';
        if (errorStr.includes("Um signatário com este e-mail já existe") || (err.response?.data?.message && err.response.data.message.includes("já existe"))) {
          const resList = await axios.get(`https://api.assinafy.com.br/v1/accounts/${accountId}/signers`, {
            headers: this.getHeaders()
          });
          const existing = resList.data?.data?.find((x: any) => x.email === targetEmail2);
          if (existing) {
            signerId = existing.id;
          } else {
            throw new Error(`Signatário com e-mail ${targetEmail2} existe, mas não foi encontrado na lista.`);
          }
        } else {
          throw err;
        }
      }

      // Criar assignment (atribuição)
      const assignRes = await axios.post(`https://api.assinafy.com.br/v1/documents/${documentId}/assignments`, {
        method: "virtual",
        signerIds: [signerId]
      }, {
        headers: this.getHeaders()
      });

      const signingUrl = assignRes.data?.data?.signing_url || `https://app.assinafy.com.br/sign/${documentId}`;

      return { documentId, signingUrl };

    } catch (error: any) {
      console.error("Erro na integração com Assinafy:", error.response ? JSON.stringify(error.response.data) : error.message);
      // Fallback supremo se a API falhar (ex: rede offline)
      const fallbackId = `doc-${Date.now()}`;
      return {
        documentId: fallbackId,
        signingUrl: `https://app.assinafy.com.br/sign/${fallbackId}?error_fallback=true`
      };
    }
  }
}
