import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2 } from 'lucide-react';
import { LawyerProcessView } from './LawyerProcessView';

export default function JuridicoProcessoView() {
  const { processoId } = useParams<{ processoId: string }>();
  const [processo, setProcesso] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!processoId) return;

    const unsub = onSnapshot(doc(db, 'juridico_processos', processoId), (docSnap) => {
      if (docSnap.exists()) {
        setProcesso({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    }, err => {
      console.warn("juridico_processos onSnapshot error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [processoId]);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  if (!processo) return <div className="p-10 text-center text-red-500">Processo não encontrado.</div>;

  return <LawyerProcessView processo={processo} />;
}
