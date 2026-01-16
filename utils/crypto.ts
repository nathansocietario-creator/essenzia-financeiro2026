
export const generateHash = async (text: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const createAsaasKey = (originalId: string, date: string, amount: number, type: string): string => {
  return `ASAAS_${originalId}_${date}_${amount}_${type}`;
};

export const createManualKey = (date: string, amount: number, type: string, description: string, category: string): string => {
  const normalizedDesc = description.trim().toLowerCase();
  return `MANUAL_${date}_${amount}_${type}_${normalizedDesc}_${category}`;
};
