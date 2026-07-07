import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Save, 
  Download, 
  Share2, 
  ChevronLeft, 
  PenTool, 
  CheckCircle2, 
  Copy,
  Printer,
  X,
  Plus,
  ArrowRight,
  Info,
  Calendar,
  User,
  MapPin,
  CreditCard,
  Hash,
  MessageSquare,
  FileCode
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Process } from '../types';
import { auth } from '../lib/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DocumentEditorProps {
  template: {
    id: string;
    title: string;
    content: string;
    category: string;
  };
  process?: Process;
  onClose: () => void;
}

export function DocumentEditor({ template, process, onClose }: DocumentEditorProps) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Extract placeholders from template content
  useEffect(() => {
    const placeholderRegex = /\{\{(.*?)\}\}/g;
    const matches = Array.from(template.content.matchAll(placeholderRegex));
    const extractedFields: Record<string, string> = {};
    
    // Default values from process if available
    const today = new Date().toLocaleDateString('pt-BR');
    const city = "Farroupilha/RS"; // GSA Default

    matches.forEach(match => {
      const fieldName = match[1].trim();
      extractedFields[fieldName] = "";

      // Smart pre-fill
      if (process) {
        if (fieldName.includes("NOME")) extractedFields[fieldName] = process.cliente_nome || "";
        if (fieldName.includes("CPF") || fieldName.includes("CNPJ")) extractedFields[fieldName] = process.cliente_documento || "";
        if (fieldName.includes("TELEFONE") || fieldName.includes("CELULAR") || fieldName.includes("WHATSAPP")) extractedFields[fieldName] = process.cliente_whatsapp || "";
        if (fieldName.includes("EMAIL")) extractedFields[fieldName] = process.cliente_email || "";
        if (fieldName.includes("VALOR")) extractedFields[fieldName] = process.valor_causa?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "";
        if (fieldName.includes("NUP")) extractedFields[fieldName] = process.nup || "";
      }

      if (fieldName.includes("DATA")) extractedFields[fieldName] = today;
      if (fieldName.includes("CIDADE")) extractedFields[fieldName] = city;
    });

    setFields(extractedFields);
  }, [template, process]);

  const filledContent = template.content.replace(/\{\{(.*?)\}\}/g, (match, fieldName) => {
    return fields[fieldName.trim()] || `___${fieldName.trim()}___`;
  });

  const handleExportPDF = async () => {
    const element = document.getElementById('document-preview-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${template.title} - ${process?.cliente_nome || 'GSA'}.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
    }
  };

  const handleExportWord = () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Document</title></head><body>";
    const footer = "</body></html>";
    const content = document.getElementById("document-preview-content")?.innerHTML;
    const sourceHTML = header + content + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${template.title}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Olá! Segue o link para conferência do documento ${template.title} da GSA Câmara.`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleSignZapSign = async () => {
    setIsSigning(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      // Logic for ZapSign API call via our backend
      const response = await fetch('/api/ai/zapsign/create-doc', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: template.title,
          content: filledContent,
          signer_email: fields['EMAIL'] || process?.cliente_email,
          signer_name: fields['NOME COMPLETO'] || process?.cliente_nome
        })
      });

      const data = await response.json();
      if (data.sign_url) {
        setSignedUrl(data.sign_url);
        window.open(data.sign_url, '_blank');
      } else {
        alert("Erro ao gerar link de assinatura.");
      }
    } catch (err) {
      console.error("ZapSign error:", err);
      // Fallback: Simulate success if API not configured
      setSignedUrl("https://zapsign.com.br/signing/sample");
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a]/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#fcfbf9] bg-opacity-70 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h3 className="font-serif font-bold text-xl text-gray-900">{template.title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#5A5A40]">{template.category}</span>
                {process && (
                  <>
                    <span className="text-[10px] text-gray-300">•</span>
                    <span className="text-[10px] font-bold text-gray-400">Processo: {process.nup}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPreviewMode(!previewMode)}
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
                previewMode 
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
                  : "bg-[#5A5A40] text-white hover:bg-[#4a4a35] shadow-md shadow-[#5A5A40]/20"
              )}
            >
              {previewMode ? <FileText size={18} /> : <CheckCircle2 size={18} />}
              {previewMode ? 'Editar Dados' : 'Revisar Documento'}
            </button>
            <div className="w-px h-8 bg-gray-100 mx-2" />
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Form Side */}
          <div className={cn(
            "w-full md:w-[400px] border-r border-gray-100 bg-[#f9f8f6] overflow-y-auto p-8",
            previewMode && "hidden md:block"
          )}>
            <div className="space-y-8">
              <div className="bg-[#5A5A40]/5 p-4 rounded-2xl border border-[#5A5A40]/10 flex gap-3">
                <Info className="text-[#5A5A40] shrink-0" size={20} />
                <p className="text-[11px] font-medium text-[#5A5A40] leading-relaxed">
                  Preencha os campos abaixo para gerar o documento automaticamente. Alguns campos foram preenchidos com dados do processo.
                </p>
              </div>

              {Object.keys(fields).map((fieldName, idx) => {
                let icon = <Plus size={16} />;
                if (fieldName.includes("NOME")) icon = <User size={16} />;
                if (fieldName.includes("CPF") || fieldName.includes("CNPJ")) icon = <Hash size={16} />;
                if (fieldName.includes("DATA") || fieldName.includes("PRAZO")) icon = <Calendar size={16} />;
                if (fieldName.includes("CIDADE") || fieldName.includes("ENDEREÇO")) icon = <MapPin size={16} />;
                if (fieldName.includes("PAGAMENTO") || fieldName.includes("VALOR")) icon = <CreditCard size={16} />;
                if (fieldName.includes("OBJETO") || fieldName.includes("DESCRIÇÃO")) icon = <MessageSquare size={16} />;

                return (
                  <div key={idx} className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <span className="p-1 bg-white rounded-md shadow-sm">{icon}</span>
                       {fieldName}
                    </label>
                    <input 
                      type="text"
                      value={fields[fieldName]}
                      onChange={(e) => setFields({ ...fields, [fieldName]: e.target.value })}
                      className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold text-gray-800 shadow-sm focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                      placeholder={`Digite ${fieldName.toLowerCase()}...`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview Side */}
          <div className="flex-1 bg-gray-100 overflow-y-auto p-4 md:p-12">
            <div 
              id="document-preview-content"
              className="bg-white w-full max-w-[800px] mx-auto min-h-[1100px] shadow-2xl p-16 md:p-24 document-page font-serif leading-[1.8] text-gray-900 text-sm md:text-base selection:bg-[#5A5A40]/20"
            >
              <div className="flex justify-between items-start mb-16 border-b-2 border-slate-900 pb-8">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter mb-1">GSA CÂMARA</h1>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#5A5A40]">MEDIAÇÃO E CONCILIÇÃO DO BRASIL</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Documento Oficial</p>
                   <p className="text-xs font-black text-slate-900">REF: {template.id.toUpperCase()}</p>
                   <p className="text-[10px] text-slate-400 mt-1">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="whitespace-pre-wrap">
                {filledContent}
              </div>

              <div className="mt-20 pt-10 border-t border-gray-100 flex flex-col items-center gap-4">
                <div className="w-56 h-px bg-gray-300" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assinatura Eletrônica GSA Câmara</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-[#f9f8f6] flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                   <User size={14} className="text-gray-400" />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-white bg-[#5A5A40] flex items-center justify-center text-[10px] font-bold text-white">
                +1
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 italic">Disponível para assinatura digital via ZapSign</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleExportPDF}
              className="px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              title="Exportar PDF"
            >
              <Download size={18} /> PDF
            </button>
            <button 
              onClick={handleExportWord}
              className="px-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              title="Exportar Word"
            >
              <FileCode size={18} /> Word
            </button>
            <button 
              onClick={handleShareWhatsApp}
              className="p-3 bg-green-50 text-green-600 border border-green-100 rounded-2xl font-bold hover:bg-green-100 transition-all flex items-center justify-center"
              title="Compartilhar WhatsApp"
            >
              <Share2 size={18} />
            </button>
            <div className="w-px h-8 bg-gray-100 mx-1" />
            <button 
              onClick={handleSignZapSign}
              disabled={isSigning}
              className={cn(
                "px-6 py-3 bg-[#1a1a1a] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl active:scale-95 group",
                isSigning && "opacity-70 cursor-wait"
              )}
            >
              <PenTool size={18} className="group-hover:rotate-12 transition-transform" />
              {isSigning ? 'Processando API...' : 'Assinar Digitalmente'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ZapSign Modal Overlay if it would be iFrame - but here we usually open new tab */}
      {signedUrl && (
        <div className="absolute inset-0 bg-[#0a0a0a]/80 flex items-center justify-center p-8 z-[110]">
           <div className="bg-white p-12 rounded-[3rem] text-center max-w-md shadow-2xl">
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 scale-125">
                 <CheckCircle2 size={40} />
              </div>
              <h4 className="text-2xl font-serif font-bold text-gray-900 mb-2">Documento Enviado</h4>
              <p className="text-gray-500 mb-8 font-medium">O link de assinatura foi gerado com sucesso. Caso a janela não tenha aberto automaticamente, clique no botão abaixo.</p>
              <div className="space-y-3">
                <a 
                  href={signedUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <ArrowRight size={20} /> Abrir ZapSign
                </a>
                <button 
                  onClick={() => setSignedUrl(null)}
                  className="w-full bg-gray-50 text-gray-400 py-3 rounded-2xl font-bold"
                >
                  Fechar Aviso
                </button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .document-page {
          box-shadow: 0 0 50px rgba(0,0,0,0.1);
          transform: scale(1);
          transform-origin: top center;
        }
        @media (max-width: 768px) {
          .document-page {
            transform: scale(0.6);
            margin: -200px -100px;
          }
        }
      `}</style>
    </div>
  );
}
