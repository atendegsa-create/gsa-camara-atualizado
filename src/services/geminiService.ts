import { auth } from "../lib/firebase";
import { RXAuditResult, Process, Tenant } from "../types";

/**
 * Converte um objeto File em uma string Base64 compatível com a API.
 */
export const fileToGenerativePart = async (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export async function auditRX(
  data: string | File | File[], 
  clientName: string = "Cliente", 
  auditType: 'CONTRATOS' | 'INSS' | 'TRABALHISTA' | 'CONFLITOS' | 'FAMILIA' | 'TRANSITO' | 'SEGURO' = 'CONTRATOS',
  extraFields: any = {},
  customPrompt: string = ""
): Promise<RXAuditResult> {
  const isFile = data instanceof File || Array.isArray(data);
  let processedData;

  if (Array.isArray(data)) {
    processedData = await Promise.all(data.map(f => fileToGenerativePart(f)));
  } else if (data instanceof File) {
    processedData = await fileToGenerativePart(data);
  } else {
    processedData = data;
  }

  const payload = {
    data: processedData,
    clientName,
    isFile,
    auditType,
    extraFields,
    customPrompt
  };

  const response = await fetch("/api/ai/audit-rx", {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro na auditoria AI");
  }
  return response.json();
}

export async function generateDocument(type: 'ABERTURA' | 'CONVITE' | 'LAUDO', auditData: RXAuditResult, nup: string): Promise<string> {
  const response = await fetch("/api/ai/generate-document", {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ type, auditData, nup })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao gerar documento AI");
  }
  const result = await response.json();
  return result.text;
}

export async function generateTechnicalReport(auditData: RXAuditResult, nup: string): Promise<string> {
  const response = await fetch("/api/ai/technical-report", {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ auditData, nup })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao gerar laudo AI");
  }
  const result = await response.json();
  return result.text;
}

export async function generateSettlementAgreement(auditData: RXAuditResult, nup: string, parties: { client: string, bank: string, mediator?: string }): Promise<string> {
  const response = await fetch("/api/ai/settlement-agreement", {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ auditData, nup, parties })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao gerar acordo AI");
  }
  const result = await response.json();
  return result.text;
}

export async function gerarLaudoTecnico(file: File, nup: string): Promise<{ markdown: string, summary: any }> {
  const fileBase64Full = await fileToGenerativePart(file);
  const match = fileBase64Full.match(/^data:(.+);base64,(.+)$/);
  
  const response = await fetch("/api/ai/laudo-tecnico", {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ 
      fileBase64: match ? match[2] : fileBase64Full, 
      mimeType: match ? match[1] : file.type, 
      nup 
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao gerar laudo técnico AI");
  }
  return response.json();
}

export async function generateDocumentWithTenantContext(
  tipoDocumento: 'PROCURACAO' | 'CONTRATO' | 'NOTIFICACAO' | 'ATA' | 'TERMO',
  processo: Process,
  tenant: Tenant | null,
  instrucoesAdicionais?: string
): Promise<string> {
  const response = await fetch("/api/ai/tenant-document", {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ tipoDocumento, processo, tenant, instrucoesAdicionais })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro ao gerar ${tipoDocumento} IA`);
  }
  const result = await response.json();
  return result.text;
}

export async function validateDocumentIa(
  documentUrl: string | null, 
  expectedData: { nome?: string, cpf?: string, morada?: string },
  options?: { documentBase64?: string, mimeType?: string }
): Promise<any> {
  const response = await fetch("/api/ai/validate-document", {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ 
      documentUrl, 
      expectedData, 
      documentBase64: options?.documentBase64,
      mimeType: options?.mimeType
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro na validação IA");
  }
  const result = await response.json();
  return result.analysis;
}

export async function getGeminiResponse(message: string, processContext: any): Promise<string> {
  const response = await fetch("/api/ai/process-chat", {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify({ message, processContext })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro no chat AI");
  }
  const result = await response.json();
  return result.response;
}
