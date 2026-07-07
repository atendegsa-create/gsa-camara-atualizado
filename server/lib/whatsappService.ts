export async function enviarWhatsApp(telefone: string, textoMensagem: string) {
  try {
    const formattedPhone = telefone.replace(/\D/g, '');
    console.log(`[WHATSAPP BACKEND MOCK] Para ${formattedPhone}: ${textoMensagem}`);
    return true;
  } catch (error) {
    console.error("Erro ao enviar WhatsApp pelo backend:", error);
    return false;
  }
}

export async function enviarMensagemComBotaoLink(telefone: string, texto: string, url: string, textoBotao: string) {
  try {
    const formattedPhone = telefone.replace(/\D/g, '');
    const mensagemCompleta = `${texto}\n\n🔗 *${textoBotao}*: ${url}`;
    
    // Here we would normally use the Z-API or Evolution API
    // const WHATSAPP_API_URL = process.env.VITE_WHATSAPP_API_URL;
    console.log(`[WHATSAPP BACKEND MOCK] Para ${formattedPhone}: ${mensagemCompleta}`);
    
    return true;
  } catch (error) {
    console.error("Erro ao enviar WhatsApp pelo backend:", error);
    return false;
  }
}
