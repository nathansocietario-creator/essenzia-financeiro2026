
export const generateHash = async (text: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Gera um hash único baseado nos dados ORIGINAIS e IMUTÁVEIS do extrato.
 * Isso garante que mesmo que o usuário edite a descrição ou valor na UI, 
 * o sistema ainda reconheça a transação em futuras importações e evite duplicatas.
 */
export const createTransactionHash = async (
  source: string,
  date: string,
  amount: number,
  type: string,
  description: string
): Promise<string> => {
  const normalizedDesc = description.trim().toLowerCase().replace(/\s+/g, ' ');
  const rawString = `${source.toUpperCase()}|${date}|${amount.toFixed(2)}|${type.toUpperCase()}|${normalizedDesc}`;
  return await generateHash(rawString);
};

export const createManualKey = (date: string, amount: number, type: string, description: string, category: string): string => {
  const normalizedDesc = description.trim().toLowerCase();
  return `MANUAL_${date}_${amount}_${type}_${normalizedDesc}_${category}`;
};
