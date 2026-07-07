import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { startOfMonth, subMonths, endOfMonth, format, differenceInDays } from 'date-fns';

export interface AnalyticsData {
  stats: {
    taxaAcordo: number;
    tempoMedioResolucao: number;
    volumeNegociado: number;
    faturacaoTAP: number;
    totalProcessos: number;
    taxaConversaoLead: number;
  };
  evolutionChart: any[];
  rankingUnidades: any[];
  closureReasons: any[];
}

export const fetchAnalyticsData = async (tenantId?: string): Promise<AnalyticsData> => {
  try {
    // 1. Fetch Processos
    let processoQuery = query(collection(db, 'processos'));
    if (tenantId) {
      processoQuery = query(collection(db, 'processos'), where('tenantId', '==', tenantId));
    }
    const processoSnap = await getDocs(processoQuery);
    const processos = processoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Fetch Financeiro (TAP)
    let financeiroQuery = query(collection(db, 'financeiro_transacoes'));
    if (tenantId) {
      financeiroQuery = query(collection(db, 'financeiro_transacoes'), where('tenantId', '==', tenantId));
    }
    const financeiroSnap = await getDocs(financeiroQuery);
    const transacoes = financeiroSnap.docs.map(doc => doc.data());

    // 3. Fetch Tenants (for ranking)
    const tenantsSnap = await getDocs(collection(db, 'tenants'));
    const tenantsMap = new Map();
    tenantsSnap.docs.forEach(doc => tenantsMap.set(doc.id, doc.data().nome_unidade));

    // Cálculos - Stats
    const totalProcessos = processos.length;
    const acordosFechados = processos.filter((p: any) => p.status === 'ACORDO_FECHADO' || p.status === 'ASSINADO' || p.status === 'FINALIZADO');
    const taxaAcordo = totalProcessos > 0 ? (acordosFechados.length / totalProcessos) * 100 : 0;

    let totalDiasResolucao = 0;
    let processosResolvidosCount = 0;
    let volOriginal = 0;
    let volAcordo = 0;

    acordosFechados.forEach((p: any) => {
      if (p.createdAt && p.dataAssinatura && p.dataAssinatura instanceof Timestamp) {
        const start = p.createdAt.toDate();
        const end = p.dataAssinatura.toDate();
        totalDiasResolucao += differenceInDays(end, start);
        processosResolvidosCount++;
      }
      
      volOriginal += p.valor_causa || 0;
      volAcordo += p.valor_acordo || 0;
    });

    const tempoMedioResolucao = processosResolvidosCount > 0 ? totalDiasResolucao / processosResolvidosCount : 0;
    const faturacaoTAP = transacoes.reduce((sum, t: any) => sum + (t.valor || 0), 0);

    // Evolution Chart (6 meses)
    const evolutionChart = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(monthStart);
      const label = format(monthStart, 'MMM/yy');

      const iniciados = processos.filter((p: any) => {
        if (!p.createdAt) return false;
        const d = p.createdAt.toDate();
        return d >= monthStart && d <= monthEnd;
      }).length;

      const fechados = processos.filter((p: any) => {
        if (!p.dataAssinatura) return false;
        const d = p.dataAssinatura.toDate();
        return d >= monthStart && d <= monthEnd;
      }).length;

      evolutionChart.push({ name: label, iniciados, fechados });
    }

    // Ranking Unidades
    const rankingMap = new Map();
    processos.forEach((p: any) => {
      const tid = p.tenantId || 'SISTEMA';
      const current = rankingMap.get(tid) || { count: 0, agreements: 0 };
      current.count++;
      if (p.status === 'ACORDO_FECHADO' || p.status === 'ASSINADO') current.agreements++;
      rankingMap.set(tid, current);
    });

    const rankingUnidades = Array.from(rankingMap.entries())
      .map(([tid, stats]) => ({
        id: tid,
        nome: tenantsMap.get(tid) || 'Unidade Padrão',
        count: stats.count,
        agreements: stats.agreements,
        rate: (stats.agreements / stats.count) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Closure Reasons
    const reasonsMap = new Map();
    processos.filter((p: any) => p.status === 'ENCERRADO_SEM_ACORDO' || p.status === 'CANCELADO' || p.status === 'REJEITADO')
      .forEach((p: any) => {
        const reason = p.motivo_encerramento || 'Outros';
        reasonsMap.set(reason, (reasonsMap.get(reason) || 0) + 1);
      });
    
    const closureReasons = Array.from(reasonsMap.entries()).map(([name, value]) => ({ name, value }));

    return {
      stats: {
        taxaAcordo,
        tempoMedioResolucao,
        volumeNegociado: volAcordo,
        faturacaoTAP,
        totalProcessos,
        taxaConversaoLead: 0 // Mock por enquanto
      },
      evolutionChart,
      rankingUnidades,
      closureReasons
    };
  } catch (error) {
    console.error('Erro no Analytics:', error);
    throw error;
  }
};
