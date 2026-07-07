export type Faixa = "ate50" | "50a100" | "100a150" | "acima150" | "diagnostico" | "atendimento";

export const PROPOSTAS: Record<Faixa, { vista: number, de: number, entrada: number, status: string }> = {
  ate50: { vista: 697, de: 997, entrada: 197, status: "3x de 197" },
  "50a100": { vista: 997, de: 1297, entrada: 247, status: "4x de 247" },
  "100a150": { vista: 1497, de: 1997, entrada: 397, status: "4x de 397" },
  acima150: { vista: 1997, de: 2497, entrada: 497, status: "5x de 497" },
  diagnostico: { vista: 47, de: 47, entrada: 47, status: "Pix / Cartão" },
  atendimento: { vista: 24.90, de: 47, entrada: 24.90, status: "Pix / Cartão" }
};

export function classificar(valorStr: string): Faixa {
  const cleanVal = valorStr.toLowerCase();
  if (cleanVal.includes('até r$ 5.000') || cleanVal.includes('5.000 a r$ 20.000')) return "ate50";
  if (cleanVal.includes('20.000 a r$ 50.000')) return "50a100";
  if (cleanVal.includes('mais de r$ 50.000')) return "100a150";
  return "acima150";
}
