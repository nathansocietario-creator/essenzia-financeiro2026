
export const impactsResult = (category: string): boolean => {
  const nonImpactingCategories = [
    'Retirada de lucro',
    'Aporte de Capital'
  ];
  return !nonImpactingCategories.includes(category);
};

export const formatBRL = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(val);
};
