import admin from 'firebase-admin';
import { db } from '../lib/firebase';

export class BlindBiddingEngine {
  /**
   * Submete um lance e calcula o match ou a temperatura térmica da negociação.
   */
  static async submitBid(processId: string, party: 'requerente' | 'requerido', amount: number) {
    if (!db) {
      throw new Error('Banco de dados não inicializado');
    }
    const processRef = db.collection('processos').doc(processId);
    
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(processRef);
      if (!doc.exists) throw new Error("Processo não encontrado");
      
      const data = doc.data() as any;
      const blindBidding = data.blind_bidding || {};
      
      // Atualiza o lance da parte
      if (party === 'requerente') {
        blindBidding.proposta_requerente = amount;
        blindBidding.data_proposta_requerente = new Date();
      } else {
        blindBidding.proposta_requerido = amount;
        blindBidding.data_proposta_requerido = new Date();
      }
      
      let status = data.status || 'EM_NEGOCIACAO';
      let resultado_bidding: any = { status: 'AGUARDANDO_OUTRA_PARTE' };

      // Se ambos já deram o lance, calcula o Match
      if (blindBidding.proposta_requerente && blindBidding.proposta_requerido) {
        const credorQuer = Number(blindBidding.proposta_requerente);
        const devedorOferece = Number(blindBidding.proposta_requerido);
        const margem = Number(blindBidding.margem_viabilidade || 0.10); // Padrão: 10% de flexibilidade
        
        // Ponto de Match: Devedor oferece um valor que está dentro da margem aceitável pelo credor
        const valorAceitavel = credorQuer * (1 - margem);

        if (devedorOferece >= valorAceitavel) {
          // MATCH!
          status = 'ACORDO_HOMOLOGADO';
          const valorFechado = devedorOferece >= credorQuer ? credorQuer : devedorOferece;
          
          blindBidding.resultado = 'MATCH';
          blindBidding.valor_fechado = valorFechado;
          
          resultado_bidding = { 
            match: true, 
            valor_final: valorFechado,
            mensagem: "🎉 Parabéns! Acordo fechado com sucesso."
          };
          
          // Registra o log do acordo fechado por IA e atualiza o status do processo
          transaction.update(processRef, {
            status: 'ACORDO_HOMOLOGADO',
            'fase_data.valor_acordo': valorFechado,
            'fase_data.data_acordo': new Date(),
            blind_bidding: blindBidding,
            logs: admin.firestore.FieldValue.arrayUnion({
              status: 'ACORDO_HOMOLOGADO',
              mensagem: `Acordo fechado via Blind Bidding. Valor final acordado: R$ ${valorFechado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              data: new Date(),
              usuario: 'Motor IA de Lances'
            })
          });

          return resultado_bidding;

        } else {
          // NO MATCH YET - Calcula a Temperatura da Negociação (0 a 99 graus)
          const temperature = Math.min(Math.max((devedorOferece / valorAceitavel) * 100, 0), 99);
          const roundedTemp = Math.round(temperature);
          const msgTemp = temperature > 80 
            ? "🔥 Está a ferver! A sua proposta está muito próxima da margem de viabilidade. Suba só mais um pouco!" 
            : "❄️ Muito frio. A sua proposta ainda está distante da viabilidade aceitável.";

          blindBidding.resultado = 'PENDENTE';
          blindBidding.temperature = roundedTemp;
          blindBidding.mensagem_temperatura = msgTemp;

          resultado_bidding = { 
            match: false, 
            temperature: roundedTemp,
            mensagem: msgTemp
          };
        }
      }

      transaction.update(processRef, { 
        blind_bidding: blindBidding,
        status: status 
      });

      return resultado_bidding;
    });
  }
}
