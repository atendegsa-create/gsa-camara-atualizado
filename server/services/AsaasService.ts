import axios from 'axios';

export class AsaasService {
  private static getApiInstance() {
    const apiKey = process.env.ASAAS_API_KEY;
    const isProd = process.env.NODE_ENV === 'production';
    const isSandbox = !isProd && process.env.ASAAS_SANDBOX !== 'false';
    const baseURL = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    return axios.create({
      baseURL,
      headers: { 'access_token': apiKey || '' }
    });
  }

  static async gerarCobrancaPix(clienteNome: string, clienteCpf: string, valor: number, vencimento: string) {
    const apiKey = process.env.ASAAS_API_KEY;

    if (!apiKey) {
      throw new Error("ASAAS_API_KEY não configurada. Não é possível gerar cobrança real.");
    }

    const api = this.getApiInstance();

    try {
      // 1. Verifica ou cria o cliente no Asaas
      let customerId = '';
      const cleanCpf = clienteCpf.replace(/\D/g, '');
      const customers = await api.get(`/customers?cpfCnpj=${cleanCpf}`);
      
      if (customers.data && customers.data.data && customers.data.data.length > 0) {
        customerId = customers.data.data[0].id;
      } else {
        const newCustomer = await api.post('/customers', {
          name: clienteNome,
          cpfCnpj: cleanCpf
        });
        customerId = newCustomer.data.id;
      }

      // 2. Cria a cobrança PIX
      const cobranca = await api.post('/payments', {
        customer: customerId,
        billingType: 'PIX',
        value: valor,
        dueDate: vencimento,
        description: 'Acordo Extrajudicial - Câmara GSA'
      });

      // 3. Resgata o QR Code e o PIX Copia e Cola
      const pixData = await api.get(`/payments/${cobranca.data.id}/pixQrCode`);

      return {
        paymentId: cobranca.data.id,
        pixCopiaECola: pixData.data.payload,
        invoiceUrl: cobranca.data.invoiceUrl
      };
    } catch (error: any) {
      console.error("Erro ao gerar cobrança no Asaas:", error.response?.data || error.message);
      throw new Error(`Erro Asaas: ${JSON.stringify(error.response?.data || error.message)}`);
    }
  }
}
