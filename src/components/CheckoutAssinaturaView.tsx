import React, { useState, useEffect } from 'react';
import { PenTool, QrCode, UploadCloud, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

export const CheckoutAssinaturaView: React.FC = () => {
  const [leadId, setLeadId] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<'PAGAMENTO' | 'UPLOAD' | 'SUCESSO'>('PAGAMENTO');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);

  // Valor fixo cobrado pelo serviço de assinatura avulsa
  const VALOR_ASSINATURA = 47.00;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('leadId');
    if (id) {
      setLeadId(id);
      gerarCobrancaPix(id);
    }
  }, []);

  const gerarCobrancaPix = async (id: string) => {
    setLoading(true);
    try {
      // Chama o nosso serviço financeiro com Split Automático
      const response = await fetch(`/api/finance/gerar-cobranca-servico/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servico: 'assinatura_avulsa',
          valor: VALOR_ASSINATURA,
          descricao: 'Serviço de Assinatura Oficial com Validade Jurídica'
        })
      });
      const data = await response.json();
      setPixData(data.cobranca); // Deve conter pixCopiaECola e qrCodeBase64
      
      // Simulador: No mundo real, você usaria um WebSocket ou polling (setInterval) 
      // para ouvir o webhook do Asaas e mudar a etapa para 'UPLOAD' quando pago.
      // setTimeout(() => setEtapa('UPLOAD'), 10000); 

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocumento = async () => {
    if (!file) return;
    setLoading(true);
    try {
      // Envia o PDF para o backend disparar via Assinafy (reaproveitando a lógica do seu modal interno)
      const formData = new FormData();
      formData.append('documento', file);
      formData.append('leadId', leadId!);

      await fetch('/api/assinatura/disparar-avulso', {
        method: 'POST',
        body: formData
      });

      setEtapa('SUCESSO');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <PenTool className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-800">Serviço de Assinatura Oficial</h1>
        <p className="text-slate-500 mt-2">Plataforma com validade jurídica vinculada à Câmara GSA.</p>
      </div>

      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Progress Bar */}
        <div className="flex bg-slate-100 border-b border-slate-200">
          <div className={`flex-1 py-3 text-center text-sm font-bold ${etapa === 'PAGAMENTO' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>1. Pagamento</div>
          <div className={`flex-1 py-3 text-center text-sm font-bold ${etapa === 'UPLOAD' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>2. Envio do Arquivo</div>
          <div className={`flex-1 py-3 text-center text-sm font-bold ${etapa === 'SUCESSO' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>3. Concluído</div>
        </div>

        <div className="p-8">
          {etapa === 'PAGAMENTO' && (
            <div className="flex flex-col items-center text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Liberação do Sistema</h2>
              <p className="text-slate-600 mb-6">Realize o pagamento da taxa de R$ {VALOR_ASSINATURA.toFixed(2)} para liberar o disparador oficial de assinaturas.</p>
              
              {loading ? (
                <div className="flex flex-col items-center py-10">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                  <p className="text-slate-500">Gerando cobrança segura via Asaas...</p>
                </div>
              ) : pixData ? (
                <div className="w-full bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <QrCode className="w-48 h-48 mx-auto text-slate-800 mb-4 opacity-50" /> {/* Substitua pelo <img src={pixData.qrCodeBase64} /> */}
                  <p className="text-sm font-bold text-slate-700 mb-2">PIX Copia e Cola:</p>
                  <div className="bg-white p-3 rounded-lg border border-slate-300 text-xs break-all text-slate-600 font-mono mb-4 select-all">
                    {pixData.pixCopiaECola || '00020101021126580014br.gov.bcb.pix0136...'}
                  </div>
                  <div className="flex items-center justify-center text-sm text-green-600 font-bold bg-green-50 py-2 rounded-lg">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Pagamento processado automaticamente
                  </div>
                  {/* Botão temporário para simular pagamento no ambiente de desenvolvimento */}
                  <button onClick={() => setEtapa('UPLOAD')} className="mt-4 text-xs underline text-indigo-500">Simular Pagamento Aprovado (Apenas Dev)</button>
                </div>
              ) : (
                <p className="text-red-500">Erro ao carregar cobrança.</p>
              )}
            </div>
          )}

          {etapa === 'UPLOAD' && (
            <div className="flex flex-col items-center text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Pagamento Confirmado!</h2>
              <p className="text-slate-600 mb-6">Anexe o arquivo em PDF que deseja enviar para assinatura.</p>
              
              <div className="w-full border-2 border-dashed border-indigo-300 rounded-2xl p-10 flex flex-col items-center justify-center bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
                <UploadCloud className="w-12 h-12 text-indigo-500 mb-4" />
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm">
                  Selecionar PDF
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                </label>
                {file && <p className="mt-4 text-sm font-bold text-indigo-900">{file.name}</p>}
              </div>

              <button 
                onClick={handleUploadDocumento}
                disabled={!file || loading}
                className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Disparar via Assinafy'}
              </button>
            </div>
          )}

          {etapa === 'SUCESSO' && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Documento Disparado!</h2>
              <p className="text-slate-600">O documento foi enviado com sucesso pela plataforma Assinafy com a chancela da Câmara GSA. Os signatários receberão o link por e-mail/WhatsApp.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
