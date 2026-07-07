import React from 'react';
import { motion } from 'motion/react';
import { Scale, X, ShieldCheck, FileText, Lock, CreditCard, CheckCircle } from 'lucide-react';

interface TermsOfUseProps {
  onClose: () => void;
}

export function TermsOfUse({ onClose }: TermsOfUseProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f5f2ed]">
          <div className="flex items-center gap-3">
            <Scale className="text-[#5A5A40]" size={24} />
            <h3 className="font-serif font-bold text-xl text-gray-900">Termos de Uso e Política de Privacidade</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 text-gray-700 leading-relaxed">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#5A5A40]">
              <FileText size={20} />
              <h4 className="font-bold uppercase tracking-wider text-sm">1. Objeto e Vinculação Jurídica</h4>
            </div>
            <p className="text-sm">
              A <strong>Câmara GSA</strong> atua como uma instituição de métodos adequados de solução de conflitos (MASCs), operando sob a égide da <strong>Lei nº 13.140/2015 (Lei de Mediação)</strong>. Ao utilizar esta plataforma, o USUÁRIO declara estar ciente de que os acordos aqui firmados e assinados digitalmente constituem <strong>TÍTULO EXECUTIVO EXTRAJUDICIAL</strong>, conforme o Art. 784, IV do Código de Processo Civil.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#5A5A40]">
              <ShieldCheck size={20} />
              <h4 className="font-bold uppercase tracking-wider text-sm">2. Tratamento de Dados (LGPD)</h4>
            </div>
            <p className="text-sm">
              Para realizar a auditoria de abusividade bancária (RX), coletamos: Nome, CPF, Telefone e Extratos Bancários.
            </p>
            <ul className="list-disc pl-5 text-sm space-y-2">
              <li><strong>Finalidade:</strong> Os dados são utilizados exclusivamente para o cálculo de viabilidade de acordo e notificação da parte contrária.</li>
              <li><strong>Segurança:</strong> Utilizamos inteligência artificial para processamento de dados e criptografia em nuvem para armazenamento.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#5A5A40]">
              <CreditCard size={20} />
              <h4 className="font-bold uppercase tracking-wider text-sm">3. Taxa Administrativa (TAP) e Success Fee</h4>
            </div>
            <ul className="list-disc pl-5 text-sm space-y-2">
              <li><strong>TAP:</strong> O início da fase de notificação está condicionado ao pagamento da Taxa Administrativa, que cobre os custos operacionais de citação.</li>
              <li><strong>Success Fee:</strong> Em caso de êxito no acordo, será devida a taxa de sucesso sobre o valor recuperado, conforme detalhado no Termo de Abertura de cada processo.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#5A5A40]">
              <Lock size={20} />
              <h4 className="font-bold uppercase tracking-wider text-sm">4. Confidencialidade</h4>
            </div>
            <p className="text-sm">
              Todo o procedimento de mediação é confidencial, não podendo as informações aqui trocadas serem utilizadas em processos judiciais posteriores, salvo as exceções previstas em lei.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#5A5A40]">
              <CheckCircle size={20} />
              <h4 className="font-bold uppercase tracking-wider text-sm">5. Consentimento</h4>
            </div>
            <p className="text-sm">
              Ao clicar em "Iniciar Auditoria", o USUÁRIO autoriza expressamente a Câmara GSA a processar seus dados financeiros para fins de identificação de abusividades bancárias.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-[#1a1a1a] text-white rounded-xl font-bold hover:bg-[#333] transition-all"
          >
            Entendi e Concordo
          </button>
        </div>
      </motion.div>
    </div>
  );
}
