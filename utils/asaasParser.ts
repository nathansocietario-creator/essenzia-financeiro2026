
import { Transaction, TransactionType } from '../types';
import { createAsaasKey } from './crypto';

const parseSafeFloat = (val: string): number => {
  if (!val || typeof val !== 'string') return 0;
  const clean = val.trim();
  if (clean.includes(',')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return parseFloat(clean) || 0;
};

export const parseAsaasCSV = async (csvContent: string): Promise<Transaction[]> => {
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  const sample = lines.slice(0, 10).join('\n');
  const separator = (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length ? ';' : ',';

  let headerIndex = -1;
  const keywords = ['data', 'valor', 'descrição', 'descricao', 'identificador', 'saldo'];
  
  for (let i = 0; i < Math.min(50, lines.length); i++) {
    const cols = lines[i].toLowerCase().split(separator);
    const matches = keywords.filter(k => cols.some(c => c.includes(k)));
    if (matches.length >= 3) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) throw new Error("Não foi possível localizar o cabeçalho das transações no arquivo.");

  const rawHeaders = lines[headerIndex].split(separator).map(h => h.trim().replace(/"/g, ''));
  const getIdx = (names: string[]) => rawHeaders.findIndex(h => names.some(n => h.toLowerCase() === n.toLowerCase() || h.toLowerCase().includes(n.toLowerCase())));

  const idxDate = getIdx(['data', 'vencimento', 'lançamento']);
  const idxId = getIdx(['id', 'identificador', 'transação', 'id da transação']);
  const idxDesc = getIdx(['descrição', 'descricao', 'observação']);
  const idxValue = getIdx(['valor', 'quantia', 'valor bruto', 'total']);
  const idxBalance = getIdx(['saldo']);
  const idxType = getIdx(['tipo', 'evento', 'natureza']);

  const transactions: Transaction[] = [];
  const dataLines = lines.slice(headerIndex + 1);

  for (const line of dataLines) {
    const cols = line.split(separator).map(c => c.trim().replace(/"/g, ''));
    if (cols.length < 3) continue;

    const dateStr = cols[idxDate];
    const valueStr = cols[idxValue];
    const description = cols[idxDesc] || 'Sem descrição';
    
    if (!dateStr || !valueStr || description.toLowerCase().includes('saldo anterior')) continue;

    const rawAmount = parseSafeFloat(valueStr);
    const amount = Math.abs(rawAmount);
    
    if (amount === 0) continue;

    let type: TransactionType = 'SAIDA';
    const typeVal = idxType !== -1 ? cols[idxType].toLowerCase() : '';
    if (typeVal.includes('entrada') || typeVal.includes('recebimento') || typeVal.includes('crédito')) {
      type = 'ENTRADA';
    } else if (typeVal.includes('saída') || typeVal.includes('débito') || typeVal.includes('pagamento')) {
      type = 'SAIDA';
    } else {
      type = rawAmount > 0 ? 'ENTRADA' : 'SAIDA';
    }

    let category = 'Outros';
    const descL = description.toLowerCase();
    
    // REGRA: Categorização automática de Taxas e Tarifas
    if (descL.includes('taxa') || descL.includes('tarifa')) {
      category = 'Taxas e Tarifas';
    } else if (descL.includes('repasse')) {
      category = 'Repasses';
    } else if (type === 'ENTRADA') {
      category = 'Recebimento Cliente';
    }

    const dateParts = dateStr.split(/[/|-]/);
    if (dateParts.length !== 3) continue;
    
    let day, month, year;
    if (dateParts[0].length === 4) {
      year = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      day = parseInt(dateParts[2]);
    } else {
      day = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]);
      year = parseInt(dateParts[2]);
    }

    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const id = (idxId !== -1 && cols[idxId]) ? cols[idxId] : `GEN_${isoDate}_${amount}_${description.slice(0, 10)}`;

    transactions.push({
      originalId: id,
      date: isoDate,
      description,
      amount,
      type,
      category,
      paymentMethod: 'Asaas',
      source: 'ASAAS',
      account: 'Conta Asaas',
      status: 'CONFIRMADA',
      balance: idxBalance !== -1 ? parseSafeFloat(cols[idxBalance]) : 0,
      transactionKey: createAsaasKey(id, isoDate, amount, type),
      confidenceScore: 100,
      month,
      year
    });
  }

  return transactions;
};
