import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Simulating API credentials (should be in env vars)
const WHATSAPP_API_URL = process.env.VITE_WHATSAPP_API_URL || 'https://api.whatsapp-mock.com/v1';
const WHATSAPP_API_TOKEN = process.env.VITE_WHATSAPP_API_TOKEN || 'mock-token';

export interface WhatsAppLog {
  id?: string;
  telefone: string;
  texto: string;
  status: 'ENVIADO' | 'ENTREGUE' | 'LIDO' | 'ERRO';
  error?: string;
  data_envio: any;
  tipo: 'TEXTO' | 'LINK';
}

function formatPhoneToE164(phone: string): string {
  // Remove non-numeric characters
  let digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10 || digits.length === 11) {
    // Assuming it's a Brazilian number missing country code
    digits = '55' + digits;
  }
  
  if (!digits.startsWith('+')) {
    digits = '+' + digits;
  }
  
  return digits;
}

async function registrarLogWhatsApp(processoId: string, logData: Omit<WhatsAppLog, 'id' | 'data_envio'>) {
  if (!processoId) return;
  
  try {
    const logsRef = collection(db, 'processos', processoId, 'whatsapp_logs');
    await addDoc(logsRef, {
      ...logData,
      data_envio: serverTimestamp(),
    });
  } catch (err) {
    console.error("Erro ao registrar log de WhatsApp:", err);
  }
}

export async function enviarMensagemTexto(telefone: string, texto: string, processoId?: string): Promise<boolean> {
  const formattedPhone = formatPhoneToE164(telefone);
  
  try {
    // In a real scenario, use fetch or axios to call the WhatsApp API
    /*
    const response = await fetch(`${WHATSAPP_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: texto }
      })
    });
    
    if (!response.ok) throw new Error("Erro na API de WhatsApp");
    */
    
    console.log(`[WHATSAPP MOCK] Mensagem para ${formattedPhone}: ${texto}`);
    
    if (processoId) {
      await registrarLogWhatsApp(processoId, {
        telefone: formattedPhone,
        texto,
        tipo: 'TEXTO',
        status: 'ENVIADO'
      });
    }
    
    return true;
  } catch (error: any) {
    console.error("Erro ao enviar WhatsApp:", error);
    if (processoId) {
      await registrarLogWhatsApp(processoId, {
        telefone: formattedPhone,
        texto,
        tipo: 'TEXTO',
        status: 'ERRO',
        error: error.message || 'Falha no envio'
      });
    }
    return false;
  }
}

export async function enviarMensagemComBotaoLink(telefone: string, texto: string, url: string, textoBotao: string, processoId?: string): Promise<boolean> {
  const formattedPhone = formatPhoneToE164(telefone);
  
  try {
    // In a real scenario, use Interactive Template or interactive message with a link button
    // This is a simplified mock text that includes the link
    const mensagemCompleta = `${texto}\n\n🔗 *${textoBotao}*: ${url}`;
    
    console.log(`[WHATSAPP MOCK LINK] Mensagem para ${formattedPhone}: ${mensagemCompleta}`);
    
    if (processoId) {
      await registrarLogWhatsApp(processoId, {
        telefone: formattedPhone,
        texto: mensagemCompleta,
        tipo: 'LINK',
        status: 'ENVIADO'
      });
    }
    
    return true;
  } catch (error: any) {
    console.error("Erro ao enviar WhatsApp com Link:", error);
    if (processoId) {
      await registrarLogWhatsApp(processoId, {
        telefone: formattedPhone,
        texto: `${texto} (${url})`,
        tipo: 'LINK',
        status: 'ERRO',
        error: error.message || 'Falha no envio'
      });
    }
    return false;
  }
}
