import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export interface InnovationReportData {
  stats: {
    totalProcessos: number;
    taxaAcordo: string;
    tempoMedio: string;
    volumeTotal: string;
    economiaGerada: string;
  };
  infra: {
    hosting: string;
    database: string;
    ai_model: string;
    security: string;
  };
}

export const generateTechnicalInnovationPDF = (data: InnovationReportData) => {
  const doc = new jsPDF();
  const date = format(new Date(), 'dd/MM/yyyy HH:mm');

  // Header Styling
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 50, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ANEXO TÉCNICO DE INOVAÇÃO', 105, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Câmara GSA - Relatório de Escalabilidade e ODR | Emitido em: ${date}`, 105, 35, { align: 'center' });

  // Body
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.text('1. Métricas de Impacto Operacional', 20, 65);

  // @ts-ignore
  doc.autoTable({
    startY: 75,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de Processos Geridos', data.stats.totalProcessos],
      ['Taxa de Resolutividade (Acordos)', data.stats.taxaAcordo],
      ['Tempo Médio de Resolução', data.stats.tempoMedio],
      ['Volume Financeiro Transacionado', data.stats.volumeTotal],
      ['Economia Gerada (Deságio)', data.stats.economiaGerada]
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] }
  });

  doc.setFontSize(16);
  // @ts-ignore
  doc.text('2. Arquitetura de Software e Inovação', 20, (doc as any).lastAutoTable.finalY + 20);
  
  // @ts-ignore
  doc.autoTable({
    startY: (doc as any).lastAutoTable.finalY + 30,
    head: [['Componente', 'Especificação']],
    body: [
      ['Framework Frontend', 'React 18 + TypeScript + Tailwind'],
      ['Backend Core', 'Firebase Serverless (BaaS)'],
      ['Engine de IA', data.infra.ai_model],
      ['Segurança de Dados', data.infra.security],
      ['Motor de Negociação', 'Blind Bidding Algorithms'],
      ['Validação de Provas', 'SHA-256 Client-Side Hashing']
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Este documento é uma prova eletrônica da capacidade técnica e inovação tecnológica da Câmara GSA.', 105, pageHeight - 20, { align: 'center' });
  doc.text('Gerado via GSA Analytics Engine - Módulo de Fomento.', 105, pageHeight - 15, { align: 'center' });

  doc.save(`GSA_Relatorio_Inovacao_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
