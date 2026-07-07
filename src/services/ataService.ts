import { generateDocumentWithTenantContext } from './geminiService';
import { Process, Tenant } from '../types';

export async function gerarAtaAudiencia(
  notas: string,
  processo: Process,
  tenant: Tenant | null
): Promise<string> {
  const prompt = `Atue como um mediador judicial sénior. Redija uma Ata de Audiência Extrajudicial formal baseada nestes tópicos debatidos:
---
${notas}
---
A audiência foi conduzida por um Mediador da Câmara. 
Formate a Ata em linguagem jurídica adequada, utilizando formatação Markdown impecável, incluindo as informações das partes, NUP, e um campo para a assinatura das partes ao final.`;

  return generateDocumentWithTenantContext('ATA', processo, tenant, prompt);
}
