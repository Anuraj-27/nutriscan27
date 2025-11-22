export interface ParsedIngredients {
  productName: string;
  ingredients: string[];
  rawText: string;
}

export const parseIngredients = (ocrText: string): ParsedIngredients => {
  // Clean up the OCR text
  const cleanText = ocrText
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Try to find product name (usually at the top, before "Ingredients:")
  const productNameMatch = cleanText.match(/^(.+?)(?:Ingredients|INGREDIENTS)/i);
  const productName = productNameMatch 
    ? productNameMatch[1].trim() 
    : 'Unknown Product';

  // Find ingredients section
  const ingredientsMatch = cleanText.match(/(?:Ingredients|INGREDIENTS)[:\s]+(.+?)(?:Contains|CONTAINS|Nutrition|NUTRITION|$)/i);
  
  if (!ingredientsMatch) {
    // If no clear section, try to extract everything after "Ingredients:"
    const fallbackMatch = cleanText.match(/(?:Ingredients|INGREDIENTS)[:\s]+(.+)/i);
    const ingredientsText = fallbackMatch ? fallbackMatch[1] : cleanText;
    
    return {
      productName,
      ingredients: parseIngredientList(ingredientsText),
      rawText: cleanText,
    };
  }

  const ingredientsText = ingredientsMatch[1];
  
  return {
    productName,
    ingredients: parseIngredientList(ingredientsText),
    rawText: cleanText,
  };
};

const parseIngredientList = (text: string): string[] => {
  // Split by comma or semicolon
  let ingredients = text
    .split(/[,;]/)
    .map(ing => ing.trim())
    .filter(ing => ing.length > 0);

  // Clean up each ingredient
  ingredients = ingredients.map(ing => {
    // Remove parenthetical content but keep the ingredient
    ing = ing.replace(/\([^)]*\)/g, '').trim();
    
    // Remove common OCR artifacts
    ing = ing.replace(/[^\w\s-]/g, ' ').trim();
    
    // Normalize whitespace
    ing = ing.replace(/\s+/g, ' ');
    
    return ing;
  }).filter(ing => {
    // Filter out very short items (likely OCR errors)
    return ing.length > 2 && !ing.match(/^\d+$/);
  });

  return ingredients;
};

export const extractNutritionFacts = (ocrText: string) => {
  const nutritionData: {
    sugar_g_per_100g?: number;
    sodium_mg_per_100g?: number;
    sat_fat_g_per_100g?: number;
  } = {};

  // Try to find sugar content
  const sugarMatch = ocrText.match(/sugar[s]?[:\s]+(\d+\.?\d*)\s*g/i);
  if (sugarMatch) {
    nutritionData.sugar_g_per_100g = parseFloat(sugarMatch[1]);
  }

  // Try to find sodium content
  const sodiumMatch = ocrText.match(/sodium[:\s]+(\d+\.?\d*)\s*mg/i);
  if (sodiumMatch) {
    nutritionData.sodium_mg_per_100g = parseFloat(sodiumMatch[1]);
  }

  // Try to find saturated fat content
  const satFatMatch = ocrText.match(/saturated\s+fat[:\s]+(\d+\.?\d*)\s*g/i);
  if (satFatMatch) {
    nutritionData.sat_fat_g_per_100g = parseFloat(satFatMatch[1]);
  }

  return nutritionData;
};
