import json

def audit_rx_statement(client_name, bank_name, interest_rate_am, installment_value, total_installments, market_average_rate=1.8):
    """
    Realiza a auditoria de um extrato de RX do Consignado.
    
    Args:
        client_name (str): Nome do cliente.
        bank_name (str): Nome do banco credor.
        interest_rate_am (float): Taxa de juros ao mês identificada (ex: 2.1).
        installment_value (float): Valor da parcela mensal.
        total_installments (int): Número total de parcelas.
    """
    
    # Utiliza a taxa dinâmica passada como parâmetro (com fallback para 1.8)
    MARKET_AVERAGE = market_average_rate
    
    is_abusive = interest_rate_am > MARKET_AVERAGE
    difference = interest_rate_am - MARKET_AVERAGE
    
    # Cálculo simplificado de economia estimada (valor presente/juros compostos não aplicados aqui para fins de script rápido)
    # Focamos na diferença de juros sobre o montante total pago
    total_paid = installment_value * total_installments
    estimated_savings = total_paid * (difference / 100)
    
    result = {
        "client": client_name,
        "bank": bank_name,
        "identified_rate": f"{interest_rate_am}% a.m.",
        "market_average": f"{MARKET_AVERAGE}% a.m.",
        "is_abusive": is_abusive,
        "abusiveness_score": min(100, int((difference / MARKET_AVERAGE) * 100)) if is_abusive else 0
    }
    
    if is_abusive:
        # Gerar abordagem comercial para WhatsApp
        whatsapp_message = (
            f"Olá, *{client_name}*! Tudo bem?\n\n"
            f"Sou da *Câmara GSA* e acabamos de concluir a auditoria do seu extrato do banco *{bank_name}*.\n\n"
            f"🚨 *Identificamos uma irregularidade:* A taxa aplicada no seu consignado é de *{interest_rate_am}% a.m.*, "
            f"sendo que a média permitida para este contrato é de aproximadamente *{MARKET_AVERAGE}% a.m.*\n\n"
            f"Isso significa que você está pagando juros abusivos. Com a nossa mediação, podemos buscar a redução dessa parcela "
            f"e até a restituição de valores pagos a mais.\n\n"
            f"Podemos agendar uma breve chamada para eu te explicar como funciona o protocolo de conciliação?"
        )
        result["whatsapp_approach"] = whatsapp_message
    else:
        result["whatsapp_approach"] = "Taxa dentro da média de mercado. Nenhuma ação necessária no momento."
        
    return result

# Exemplo de uso:
if __name__ == "__main__":
    # Simulação de um extrato com juros abusivos
    audit_data = audit_rx_statement(
        client_name="João Silva",
        bank_name="Banco Itaú",
        interest_rate_am=2.35,
        installment_value=450.00,
        total_installments=84
    )
    
    print(json.dumps(audit_data, indent=4, ensure_ascii=False))
