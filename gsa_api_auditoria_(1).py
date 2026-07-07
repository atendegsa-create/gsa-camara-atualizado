import os
import google.generativeai as genai
import json

# Configuração da API Key (Deve ser definida no ambiente)
# export GEMINI_API_KEY='sua_chave_aqui'
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def auditar_rx_gsa(texto_rx, nome_cliente="Cliente"):
    \"\"\"
    Conecta ao Gemini para realizar a auditoria de extrato RX.
    Simula o motor de prospecção da Câmara GSA.
    \"\"\"
    
    # Configuração do Modelo
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash", # Modelo estável para produção
        system_instruction=(
            "Você é o Auditor Chefe da Câmara GSA. Sua missão é analisar extratos RX de consignado "
            "e identificar abusividades bancárias. Compare taxas com a média de mercado (~1.8% a.m.). "
            "Retorne um JSON com: viabilidade (bool), motivo (string), taxa_juros_identificada (float), "
            "potencial_recuperacao (float), banco_contrato (string) e uma mensagem_whatsapp personalizada."
        )
    )

    prompt = f\"\"\"
    Analise o seguinte extrato para o cliente {nome_cliente}:
    
    {texto_rx}
    
    Retorne APENAS o JSON.
    \"\"\"

    try:
        response = model.generate_content(prompt)
        # Limpeza básica para garantir que pegamos apenas o JSON se houver markdown
        json_text = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(json_text)
    except Exception as e:
        return {"error": str(e)}

# Exemplo de Uso
if __name__ == "__main__":
    exemplo_rx = \"\"\"
    BANCO ITAU CONSIGNADO
    CONTRATO: 123456789
    VALOR EMPRESTIMO: 10.000,00
    TAXA JUROS: 2.45% a.m.
    PARCELA: 350,00
    \"\"\"
    
    print("Iniciando Auditoria GSA...")
    resultado = auditar_rx_gsa(exemplo_rx, "João da Silva")
    
    if "error" not in resultado:
        print(f"Banco: {resultado['banco_contrato']}")
        print(f"Taxa: {resultado['taxa_juros_identificada']}%")
        print(f"Viabilidade: {'SIM' if resultado['viabilidade'] else 'NÃO'}")
        print(f"Potencial: R$ {resultado['potencial_recuperacao']}")
        print(\"\\nMensagem para WhatsApp:\")
        print(resultado['mensagem_whatsapp'])
    else:
        print(f"Erro na auditoria: {resultado['error']}")
