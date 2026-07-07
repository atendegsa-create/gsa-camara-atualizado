import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LawyerProcessView } from './LawyerProcessView';
import { Loader2 } from 'lucide-react';

export default function LawyerProcessPage() {
  const { id } = useParams(); // Pega o ID da URL
  const [processo, setProcesso] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregarProcesso = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'juridico_processos', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProcesso({ id: docSnap.id, ...docSnap.data() });
      } else {
        setErro('Processo não encontrado ou o link expirou.');
      }
    } catch (error) {
      setErro('Erro ao carregar o processo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarProcesso();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-2 font-bold text-slate-500">A carregar os autos...</span>
      </div>
    );
  }

  if (erro || !processo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow border border-red-100 text-center max-w-md">
          <h2 className="text-xl font-black text-red-600 mb-2">Acesso Inválido</h2>
          <p className="text-slate-500 text-sm">{erro}</p>
        </div>
      </div>
    );
  }

  // Se tudo estiver certo, renderiza a View do Advogado que criámos anteriormente!
  // Passamos o onUpdate para ele recarregar a tela automaticamente quando o advogado adicionar pendências
  return <LawyerProcessView processo={processo} onUpdate={carregarProcesso} />;
}
