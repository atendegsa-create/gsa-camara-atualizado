import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { ShieldAlert, Clock, CalendarDays, Zap, Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { WhatsAppAntiSpamConfig } from '../types';

export const AntiSpamConfigView: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<WhatsAppAntiSpamConfig>({
    active: true,
    minDelaySeconds: 5,
    maxDelaySeconds: 15,
    pauseAfterQuantity: 50,
    pauseDurationMinutes: 10,
    startHour: 8,
    endHour: 20,
    allowedDays: [1, 2, 3, 4, 5]
  });

  const diasSemana = [
    { id: 0, label: 'Domingo' },
    { id: 1, label: 'Segunda' },
    { id: 2, label: 'Terça' },
    { id: 3, label: 'Quarta' },
    { id: 4, label: 'Quinta' },
    { id: 5, label: 'Sexta' },
    { id: 6, label: 'Sábado' }
  ];

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user?.tenantId) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'tenants', user.tenantId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.antiSpamConfig) {
            setConfig({
              ...config,
              ...data.antiSpamConfig
            });
          }
        }
      } catch (err: any) {
        console.error("Erro ao carregar configurações de anti-spam:", err);
        setError("Não foi possível carregar as configurações do banco de dados.");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user?.tenantId]);

  const handleDayToggle = (diaId: number) => {
    setConfig(prev => {
      const dias = prev.allowedDays.includes(diaId)
        ? prev.allowedDays.filter(d => d !== diaId)
        : [...prev.allowedDays, diaId];
      return { ...prev, allowedDays: dias };
    });
  };

  const handleSave = async () => {
    if (!user?.tenantId) {
      setError("Nenhum Tenant ID associado ao usuário atual.");
      return;
    }

    // Validation
    if (config.minDelaySeconds < 1) {
      setError("O tempo mínimo de delay deve ser de pelo menos 1 segundo.");
      return;
    }
    if (config.maxDelaySeconds < config.minDelaySeconds) {
      setError("O tempo máximo de delay deve ser maior ou igual ao tempo mínimo.");
      return;
    }
    if (config.pauseAfterQuantity < 1) {
      setError("A quantidade para pausa programada deve ser maior que zero.");
      return;
    }
    if (config.pauseDurationMinutes < 1) {
      setError("A duração da pausa deve ser de pelo menos 1 minuto.");
      return;
    }
    if (config.startHour < 0 || config.startHour > 23 || config.endHour < 0 || config.endHour > 23) {
      setError("O horário deve estar entre 0 e 23 horas.");
      return;
    }
    if (config.allowedDays.length === 0 && config.active) {
      setError("Selecione pelo menos um dia permitido para disparos.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const tenantRef = doc(db, 'tenants', user.tenantId);
      await updateDoc(tenantRef, {
        antiSpamConfig: config
      });

      setSuccess(true);
      if (refreshProfile) {
        await refreshProfile();
      }
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error("Erro ao salvar regras anti-spam:", err);
      setError("Ocorreu um erro ao gravar as regras no Firebase.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Carregando configurações de anti-spam...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-100 mt-8 mb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-500" />
            Motor Anti-Spam & Agendamento Inteligente
          </h2>
          <p className="text-slate-500 mt-1">
            Configure o comportamento do robô negociador para mitigar riscos de bloqueio e banimento de números no WhatsApp.
          </p>
        </div>
        <div className="flex items-center shrink-0">
          <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={config.active}
                onChange={(e) => setConfig({ ...config, active: e.target.checked })}
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${config.active ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ${config.active ? 'transform translate-x-6' : ''}`}></div>
            </div>
            <span className="ml-3 font-semibold text-slate-700">{config.active ? 'Motor Ativo' : 'Motor Inativo'}</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-3 border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-sm font-bold">Regras Anti-Spam e Janela de Operação salvas com sucesso!</div>
        </div>
      )}

      <div className={`space-y-8 transition-opacity duration-200 ${!config.active ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Bloco de Delay Randômico */}
        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Cadência de Disparo</h3>
              <p className="text-xs text-slate-500">Flutuação randômica do tempo de espera entre cada envio.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tempo Mínimo (segundos)</label>
              <input
                type="number"
                min="1"
                value={config.minDelaySeconds}
                onChange={(e) => setConfig({ ...config, minDelaySeconds: Math.max(1, Number(e.target.value)) })}
                className="w-full p-3.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tempo Máximo (segundos)</label>
              <input
                type="number"
                min="1"
                value={config.maxDelaySeconds}
                onChange={(e) => setConfig({ ...config, maxDelaySeconds: Math.max(1, Number(e.target.value)) })}
                className="w-full p-3.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 italic">
            O algoritmo escolherá um intervalo de tempo único e aleatório entre esses dois limites após cada mensagem enviada, emulando comportamento humano.
          </p>
        </div>

        {/* Bloco de Pausa Programada */}
        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Resfriamento e Pausa Programada</h3>
              <p className="text-xs text-slate-500">Pausas periódicas de segurança para arrefecer o canal de comunicação.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pausar a cada (Qtd. de Mensagens)</label>
              <input
                type="number"
                min="1"
                value={config.pauseAfterQuantity}
                onChange={(e) => setConfig({ ...config, pauseAfterQuantity: Math.max(1, Number(e.target.value)) })}
                className="w-full p-3.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duração da Pausa (Minutos)</label>
              <input
                type="number"
                min="1"
                value={config.pauseDurationMinutes}
                onChange={(e) => setConfig({ ...config, pauseDurationMinutes: Math.max(1, Number(e.target.value)) })}
                className="w-full p-3.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 italic">
            Evita picos altos de atividade em curto espaço de tempo. O robô irá hibernar durante os minutos definidos para reduzir a detecção do bot pelo WhatsApp.
          </p>
        </div>

        {/* Bloco de Janela de Operação */}
        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Janela de Operação Padrão</h3>
              <p className="text-xs text-slate-500">Restrinja os disparos a dias específicos e horários comerciais permitidos.</p>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dias Permitidos de Envio</label>
            <div className="flex flex-wrap gap-2.5">
              {diasSemana.map(dia => {
                const isSelected = config.allowedDays.includes(dia.id);
                return (
                  <button
                    key={dia.id}
                    type="button"
                    onClick={() => handleDayToggle(dia.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {dia.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Horário de Início (00-23h)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={config.startHour}
                onChange={(e) => setConfig({ ...config, startHour: Math.max(0, Math.min(23, Number(e.target.value))) })}
                className="w-full p-3.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Horário de Término (00-23h)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={config.endHour}
                onChange={(e) => setConfig({ ...config, endHour: Math.max(0, Math.min(23, Number(e.target.value))) })}
                className="w-full p-3.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 italic">
            Caso a fila de envio contenha disparos agendados e atinja um horário ou dia não permitido, o robô entrará automaticamente em hibernação até a próxima janela válida sem interromper ou descartar o lote.
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-4 border-t border-slate-100 pt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Gravando Regras...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salvar Regras
            </>
          )}
        </button>
      </div>
    </div>
  );
};
