
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from '../types';

export const categorizeTransaction = async (description: string): Promise<{category: string, confidence: number}> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Você é um assistente financeiro de um escritório de CONTABILIDADE. 
      Classifique a seguinte transação em UMA das categorias abaixo, baseando-se no texto:
      
      ENTRADAS (RECEITAS):
      - Honorários contábeis mensais
      - Honorários de abertura de empresa
      - Honorários de alteração contratual
      - Honorários de encerramento de empresa
      - Honorários de regularizações
      - Aporte de Capital
      
      SAÍDAS (DESPESAS):
      - Aluguel / Condomínio
      - Energia elétrica
      - Água
      - Internet / Telefonia
      - Sistemas contábeis
      - Certificado digital
      - Honorários contábeis terceirizados
      - Material de escritório
      - Marketing e publicidade
      - Tráfego pago / anúncios
      - Serviços de terceiros
      - Manutenção / TI
      - Consultoria externa
      - Impostos e taxas
      - Taxas e Tarifas
      - Despesas bancárias
      - Retirada de lucro
      - Pro-labore
      - Outros
      
      Transação: "${description}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER, description: "Score de 0 a 100" }
          },
          required: ["category", "confidence"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini classification failed", error);
    return { category: 'Outros', confidence: 50 };
  }
};

export const generateStrategicInsights = async (
  monthSummary: any, 
  previousMonthSummary: any, 
  budgets: any[]
): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Você é um CFO Virtual Sênior especializado em Gestão de Escritórios de Contabilidade.
    Analise os dados financeiros abaixo e forneça 3 a 4 insights ESTRATÉGICOS, curtos e acionáveis.
    
    DADOS ATUAIS:
    - Faturamento: R$ ${monthSummary.totalIn}
    - Gastos Operacionais: R$ ${monthSummary.totalOutImpact}
    - Resultado Líquido: R$ ${monthSummary.result}
    
    DADOS MÊS ANTERIOR:
    - Faturamento: R$ ${previousMonthSummary.in}
    - Resultado: R$ ${previousMonthSummary.result}
    
    ORÇAMENTOS (METAS):
    ${budgets.map(b => `- ${b.category}: Meta R$ ${b.amount}`).join('\n')}
    
    Foque em: detecção de anomalias, otimização de taxas bancárias, aumento de margem e cumprimento de orçamento.
    Responda apenas com um array JSON de strings.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Insights failed", error);
    return ["Mantenha o acompanhamento rigoroso das despesas fixas para garantir a saúde do caixa."];
  }
};
