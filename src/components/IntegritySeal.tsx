import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Lock, Download, FileCheck, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { gerarHashDocumento, formatHash } from '../lib/hashUtils';
import { auth } from '../lib/firebase';

interface IntegritySealProps {
  processId: string;
  storedHash: string;
  fileUrl: string;
  fileName: string;
  processData: any;
}

export const IntegritySeal: React.FC<IntegritySealProps> = ({ 
  processId, 
  storedHash, 
  fileUrl, 
  fileName,
  processData 
}) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentHash, setCurrentHash] = useState('');

  useEffect(() => {
    verifyIntegrity();
  }, [fileUrl, storedHash]);

  const verifyIntegrity = async () => {
    if (!fileUrl || !storedHash) return;
    
    setIsVerifying(true);
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const hash = await gerarHashDocumento(blob);
      setCurrentHash(hash);
      setIsValid(hash === storedHash);
    } catch (error) {
      console.error('Erro ao verificar integridade:', error);
      setIsValid(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const downloadCertificate = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleString('pt-BR');
    const user = auth.currentUser?.email || 'Sistema';

    // Header
    doc.setFillColor(0, 31, 63); // Navy Blue
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Certificado de Autenticidade Digital', 105, 25, { align: 'center' });

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Data de Emissão: ${now}`, 20, 50);
    doc.text(`Emitido por: ${user}`, 20, 60);
    doc.text(`NUP: ${processData?.nup || 'N/A'}`, 20, 70);

    doc.setFontSize(14);
    doc.text('Dados do Documento:', 20, 85);
    doc.setFontSize(10);
    doc.text(`Nome do Arquivo: ${fileName}`, 20, 95);
    doc.text(`Hash SHA-256 Original (Cofre): ${storedHash}`, 20, 105);
    doc.text(`Hash SHA-256 Calculado: ${currentHash}`, 20, 115);

    // Integrity Status
    doc.setDrawColor(isValid ? 40 : 200, isValid ? 167 : 0, isValid ? 69 : 0);
    doc.setLineWidth(1);
    doc.rect(20, 125, 170, 20);
    doc.setTextColor(isValid ? 40 : 200, isValid ? 167 : 0, isValid ? 69 : 0);
    doc.setFontSize(14);
    doc.text(isValid ? 'DOCUMENTO ÍNTEGRO - Assinatura Validada' : 'ALERTA: Documento Modificado ou Corrompido', 105, 138, { align: 'center' });

    // Parties Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Partes Envolvidas:', 20, 160);
    
    // @ts-ignore
    doc.autoTable({
      startY: 165,
      head: [['Papel', 'Nome', 'Status']],
      body: [
        ['Requerente', processData?.cliente?.nome || 'N/A', 'Assinado'],
        ['Requerido', processData?.empresa || 'N/A', 'Assinado'],
        ['Mediador', 'Câmara GSA / Sistema', 'Validado']
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 31, 63] }
    });

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Este certificado comprova a imutabilidade do documento através de algoritmos criptográficos SHA-256.', 105, 280, { align: 'center' });
    doc.text('Verificação realizada via Câmara GSA - Cofre de Evidências.', 105, 285, { align: 'center' });

    doc.save(`Certificado_Autenticidade_${processData?.nup || 'GSA'}.pdf`);
  };

  if (isVerifying) {
    return (
      <div className="flex items-center gap-2 text-blue-500 animate-pulse text-sm font-medium">
        <Lock size={16} /> Verificando integridade no Cofre...
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden p-4 rounded-2xl border backdrop-blur-md transition-all ${
        isValid 
          ? 'bg-emerald-500/10 border-emerald-500/30' 
          : 'bg-rose-500/10 border-rose-500/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isValid ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'}`}>
            {isValid ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
          </div>
          <div>
            <h4 className={`text-sm font-bold ${isValid ? 'text-emerald-800' : 'text-rose-800'}`}>
              {isValid ? 'Documento Íntegro' : 'Erro de Integridade'}
            </h4>
            <p className="text-xs text-black/60 font-mono tracking-tight mt-1">
              SHA-256: {formatHash(storedHash || '')}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isValid && (
            <button
              onClick={downloadCertificate}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/50 hover:bg-white/80 border border-emerald-500/20 rounded-lg text-xs font-bold text-emerald-700 transition-colors shadow-sm"
            >
              <Download size={14} /> Certificado
            </button>
          )}
          <div className="group relative">
            <Info size={16} className="text-black/40 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black/90 p-3 rounded-xl text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              O Cofre de Evidências cruza o hash gerado no momento da aprovação com o arquivo atual para garantir que não houve alteração.
            </div>
          </div>
        </div>
      </div>
      
      {/* Background visual element */}
      <div className={`absolute -right-4 -bottom-4 opacity-5 pointer-events-none ${isValid ? 'text-emerald-500' : 'text-rose-500'}`}>
        <FileCheck size={80} />
      </div>
    </motion.div>
  );
};
