
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from '../types';

export const categorizeTransaction = async (description: string): Promise<{category: string, confidence: number}> => {
  try {
    // Always initialize GoogleGenAI inside the function to ensure up-to-date API key usage
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

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("Gemini classification failed", error);
    return { category: 'Outros', confidence: 50 };
  }
};
