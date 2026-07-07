import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, where } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
// ✅ Importação limpa e segura
import { CreditCard, Calendar, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';

export function FinanceiroView() {
  const { user, isAdmin, isMaster, profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) return;
    try {
      let q;
      if (isMaster) {
        q = query(collection(db, "financeiro_transacoes"), orderBy("criado_em", "desc"));
      } else if (isAdmin) {
        // Admin of a unit
        q = query(
          collection(db, "financeiro_transacoes"), 
          where("tenantId", "==", profile?.tenantId || ''),
          orderBy("criado_em", "desc")
        );
      } else {
        q = query(
          collection(db, "financeiro_transacoes"), 
          where("cliente_id", "==", user.uid),
          orderBy("criado_em", "desc")
        );
      }
      return onSnapshot(q, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'financeiro_transacoes');
        setLoading(false);
      });
    } catch (e) {
      setLoading(false);
    }
  }, [user, isAdmin]);

  const formatCurrency = (val: any) => Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Gestão Financeira GSA</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl"><TrendingUp /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Status do Sistema</p>
            <p className="text-lg font-bold text-green-600">Conectado e Ativo</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><CreditCard /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Transações</p>
            <p className="text-lg font-bold text-gray-800">{transactions.length} Registros</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-[10px] font-bold text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Processo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic">Sincronizando faturamento...</td></tr>
            ) : transactions.map(t => (
              <tr key={t.id} className="text-sm">
                <td className="px-6 py-4 font-bold text-gray-700">{formatCurrency(t.valor)}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-[10px] font-bold">PAGO</span>
                </td>
                <td className="px-6 py-4 text-xs text-blue-500 font-mono">{t.processo_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}