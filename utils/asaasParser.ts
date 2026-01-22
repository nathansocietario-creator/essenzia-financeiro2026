
import { Transaction, TransactionType } from '../types.ts';
import { createTransactionHash } from './crypto.ts';

const parseSafeFloat = (val: string): number => {
  if (!val) return 0;
  // Remove R$, espaços e normaliza separadores decimais PT-BR -> US
  let clean = val.replace(/R\$/g, '').trim();
  
  if (clean.includes('.') && clean.includes(',')) {
    // 1.234,56
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // 1234,56
    clean = clean.replace(',', '.');
  }
  
  return parseFloat(clean) || 0;
};

export const parseAsaasCSV = async (csvContent: string, sourceId: string): Promise<Transaction[]> => {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length === 0) throw new Error("O arquivo CSV está vazio.");

  // Auto-detectar delimitador baseado nos cabeçalhos
  let separator = ';';
  let headerIndex = -1;
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('data') && (l.includes('valor') || l.includes('quantia'))) {
      headerIndex = i;
      const countSemicolon = (l.match(/;/g) || []).length;
      const countComma = (l.match(/,/g) || []).length;
      separator = countComma > countSemicolon ? ',' : ';';
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("Cabeçalhos obrigatórios não encontrados no CSV. Certifique-se que as colunas 'Data' e 'Valor' existem.");
  }

  const headers = lines[headerIndex].split(separator).map(h => h.trim().replace(/"/g, '').toLowerCase());
  const getIdx = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));

  const idxDate = getIdx(['data', 'lançamento', 'vencimento', 'movimentação']);
  const idxVal = getIdx(['valor', 'quantia', 'total', 'montante']);
  const idxDesc = getIdx(['descrição', 'descricao', 'observação', 'histórico', 'detalhes']);
  const idxType = getIdx(['tipo', 'evento', 'natureza', 'operação']);

  if (idxDate === -1 || idxVal === -1) {
    throw new Error("Mapeamento falhou: Não foi possível identificar as colunas de Data ou Valor.");
  }

  const transactions: Transaction[] = [];
  const dataLines = lines.slice(headerIndex + 1);

  for (const line of dataLines) {
    const cols = line.split(separator).map(c => c.trim().replace(/"/g, ''));
    if (cols.length < 2) continue;

    const rawDate = cols[idxDate];
    const rawAmountVal = parseSafeFloat(cols[idxVal]);
    const rawDesc = idxDesc !== -1 ? cols[idxDesc] : 'Transação sem descrição';
    
    if (!rawDate || isNaN(rawAmountVal) || rawAmountVal === 0) continue;

    const amount = Math.abs(rawAmountVal);
    let type: TransactionType = 'SAIDA';
    const typeVal = idxType !== -1 ? cols[idxType].toLowerCase() : '';
    
    if (typeVal.includes('entrada') || typeVal.includes('recebimento') || typeVal.includes('crédito')) {
      type = 'ENTRADA';
    } else if (typeVal.includes('saída') || typeVal.includes('débito') || typeVal.includes('pagamento')) {
      type = 'SAIDA';
    } else {
      type = rawAmountVal > 0 ? 'ENTRADA' : 'SAIDA';
    }

    // Normalização de Data (DD/MM/YYYY)
    try {
      const dp = rawDate.split(/[/|-]/);
      let y, m, d;
      if (dp[0].length === 4) { // YYYY-MM-DD
        [y, m, d] = dp.map(Number);
      } else { // DD-MM-YYYY
        [d, m, y] = dp.map(Number);
      }
      
      if (isNaN(y) || isNaN(m) || isNaN(d)) continue;
      
      const isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hash = await createTransactionHash(sourceId, isoDate, amount, type, rawDesc);

      transactions.push({
        date: isoDate,
        description: rawDesc,
        amount,
        type,
        category: 'Outros',
        originalDate: isoDate,
        originalDescription: rawDesc,
        originalAmount: amount,
        originalType: type,
        auditStatus: 'PENDENTE', 
        source: sourceId,
        account: sourceId,
        paymentMethod: 'Arquivo CSV',
        status: 'CONFIRMADA',
        transactionKey: hash,
        confidenceScore: 100,
        month: m,
        year: y
      });
    } catch (e) {
      continue;
    }
  }

  return transactions;
};
