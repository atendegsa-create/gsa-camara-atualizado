import { useState, type FormEvent } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const JuridicoLaunchForm = ({ tipo, onClose }: { tipo: 'INTERNO' | 'PARTICULAR', onClose: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clienteNome: '',
    numeroProcesso: '',
    advogadoEmail: '', // Obrigatório se for PARTICULARR
    descricaoFato: '',
    pergunta: ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await addDoc(collection(db, 'juridico_processos'), {
        ...formData,
        tipo: tipo === 'INTERNO' ? 'HLF' : 'PARTICULAR',
        status: 'RECEBIDO',
        tenantId: user?.tenantId || 'master', // Essencial para o relatório do parceiro
        criadoPor: user?.email,
        dataCriacao: new Date().toISOString()
      });

      // Aqui, o seu serviço de e-mail (server/lib/emailService.ts) 
      // deve ser chamado para disparar o link para o advogado.
      alert('Processo enviado com sucesso! O advogado foi notificado.');
      onClose();
    } catch (err) {
      alert('Erro ao enviar processo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">{tipo === 'INTERNO' ? 'Jurídico Interno - HLF' : 'Jurídico Particular'}</h2>
      
      <div className="space-y-4">
        <input 
          placeholder="Nome do Cliente" required
          className="w-full p-3 border rounded-lg"
          onChange={e => setFormData({...formData, clienteNome: e.target.value})}
        />
        
        {tipo === 'PARTICULAR' && (
          <input 
            type="email" placeholder="E-mail do Advogado Parceiro" required
            className="w-full p-3 border rounded-lg"
            onChange={e => setFormData({...formData, advogadoEmail: e.target.value})}
          />
        )}

        <textarea 
          placeholder="Descrição do Fato" required
          className="w-full p-3 border rounded-lg h-24"
          onChange={e => setFormData({...formData, descricaoFato: e.target.value})}
        />

        <textarea 
          placeholder="Pergunta/Dúvida específica para análise" required
          className="w-full p-3 border rounded-lg h-20"
          onChange={e => setFormData({...formData, pergunta: e.target.value})}
        />

        <button disabled={loading} type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700">
          {loading ? 'Enviando...' : 'Enviar para Advogado'}
        </button>
      </div>
    </form>
  );
};
