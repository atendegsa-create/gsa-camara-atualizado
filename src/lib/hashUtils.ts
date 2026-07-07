/**
 * Gera um Hash SHA-256 de um arquivo ou blob localmente usando Web Crypto API
 */
export async function gerarHashDocumento(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function generateFileHash(file: File): Promise<string> {
  return gerarHashDocumento(file);
}

/**
 * Formata um hash para exibição (ex: first 8 e last 8)
 */
export function formatHash(hash: string): string {
  if (!hash) return '';
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
}
