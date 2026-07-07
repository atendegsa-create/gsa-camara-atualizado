import axios from 'axios';

export const notifyDeadlineExpired = async (data: { 
  processoId: string, 
  nup: string, 
  cliente: string, 
  procurador_id?: string 
}) => {
  const alertaUrl = process.env.VITE_GSA_ALERTA_URL || "https://seu-webhook-gsa.com/api/alerta-prazos";

  try {
    if (alertaUrl.includes("seu-webhook")) {
      console.warn("⚠️ ALERTA_URL ainda é o placeholder. Alerta não enviado.");
      return true;
    }

    const response = await axios.post(alertaUrl, {
      tipo: 'PRAZO_EXPIRADO',
      mensagem: `⚠️ PRAZO EXPIRADO: O processo ${data.nup} (${data.cliente}) atingiu 15 dias sem resposta.`,
      processoId: data.processoId,
      procurador_id: data.procurador_id || 'Administração',
      prioridade: "Alta",
      timestamp: new Date().toISOString()
    });
    return response.status === 200;
  } catch (error: any) {
    console.error("❌ Erro ao disparar alerta de prazo:", error.message);
    return false;
  }
};
