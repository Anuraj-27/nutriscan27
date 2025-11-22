// REQUIRE_CLINICAL_REVIEW: All baseline risk categorizations require clinical validation
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface IngredientInfo {
  name: string;
  canonicalForm: string;
  category: string;
  baselineRisk: RiskLevel;
  baseScore: number;
  concerns: string[];
  affectedBy?: {
    allergies?: boolean;
    diabetes?: boolean;
    bloodPressure?: boolean;
    age?: boolean;
  };
}

// REQUIRE_CLINICAL_REVIEW: This is a simplified database for demonstration
// Real implementation needs comprehensive ingredient database with clinical validation
export const INGREDIENT_DATABASE: Record<string, IngredientInfo> = {
  // Sugars and Sweeteners
  'sugar': {
    name: 'Sugar',
    canonicalForm: 'sugar',
    category: 'sweetener',
    baselineRisk: 'MODERATE',
    baseScore: 5,
    concerns: ['High glycemic index', 'Blood sugar spikes'],
    affectedBy: { diabetes: true }
  },
  'high fructose corn syrup': {
    name: 'High Fructose Corn Syrup',
    canonicalForm: 'high_fructose_corn_syrup',
    category: 'sweetener',
    baselineRisk: 'HIGH',
    baseScore: 10,
    concerns: ['Metabolic issues', 'High glycemic'],
    affectedBy: { diabetes: true }
  },
  'corn syrup': {
    name: 'Corn Syrup',
    canonicalForm: 'corn_syrup',
    category: 'sweetener',
    baselineRisk: 'HIGH',
    baseScore: 10,
    concerns: ['High glycemic index'],
    affectedBy: { diabetes: true }
  },
  
  // Sodium and Preservatives
  'sodium': {
    name: 'Sodium',
    canonicalForm: 'sodium',
    category: 'mineral',
    baselineRisk: 'MODERATE',
    baseScore: 5,
    concerns: ['Blood pressure elevation'],
    affectedBy: { bloodPressure: true }
  },
  'salt': {
    name: 'Salt',
    canonicalForm: 'salt',
    category: 'mineral',
    baselineRisk: 'MODERATE',
    baseScore: 5,
    concerns: ['Blood pressure elevation', 'Fluid retention'],
    affectedBy: { bloodPressure: true }
  },
  'monosodium glutamate': {
    name: 'Monosodium Glutamate (MSG)',
    canonicalForm: 'msg',
    category: 'flavor_enhancer',
    baselineRisk: 'MODERATE',
    baseScore: 5,
    concerns: ['Sodium content', 'Headaches in sensitive individuals'],
    affectedBy: { bloodPressure: true }
  },
  'sodium benzoate': {
    name: 'Sodium Benzoate',
    canonicalForm: 'sodium_benzoate',
    category: 'preservative',
    baselineRisk: 'MODERATE',
    baseScore: 5,
    concerns: ['Preservative', 'Sodium content'],
    affectedBy: { bloodPressure: true, age: true }
  },
  
  // Fats
  'saturated fat': {
    name: 'Saturated Fat',
    canonicalForm: 'saturated_fat',
    category: 'fat',
    baselineRisk: 'MODERATE',
    baseScore: 5,
    concerns: ['Cardiovascular health'],
    affectedBy: { age: true }
  },
  'trans fat': {
    name: 'Trans Fat',
    canonicalForm: 'trans_fat',
    category: 'fat',
    baselineRisk: 'HIGH',
    baseScore: 10,
    concerns: ['Cardiovascular disease', 'Banned in many countries'],
    affectedBy: { age: true }
  },
  'palm oil': {
    name: 'Palm Oil',
    canonicalForm: 'palm_oil',
    category: 'fat',
    baselineRisk: 'MODERATE',
    baseScore: 5,
    concerns: ['High in saturated fat'],
    affectedBy: { age: true }
  },
  
  // Artificial ingredients
  'artificial flavors': {
    name: 'Artificial Flavors',
    canonicalForm: 'artificial_flavors',
    category: 'additive',
    baselineRisk: 'MODERATE',
    baseScore: 5,
    concerns: ['Synthetic additives', 'Unclear composition'],
    affectedBy: { allergies: true }
  },
  'artificial colors': {
    name: 'Artificial Colors',
    canonicalForm: 'artificial_colors',
    category: 'additive',
    baselineRisk: 'MODERATE',
    baseScore: 5,
    concerns: ['Hyperactivity in children', 'Allergic reactions'],
    affectedBy: { allergies: true }
  },
  
  // Common allergens
  'milk': {
    name: 'Milk',
    canonicalForm: 'milk',
    category: 'dairy',
    baselineRisk: 'LOW',
    baseScore: 0,
    concerns: ['Common allergen'],
    affectedBy: { allergies: true }
  },
  'wheat': {
    name: 'Wheat',
    canonicalForm: 'wheat',
    category: 'grain',
    baselineRisk: 'LOW',
    baseScore: 0,
    concerns: ['Common allergen', 'Gluten content'],
    affectedBy: { allergies: true }
  },
  'soy': {
    name: 'Soy',
    canonicalForm: 'soy',
    category: 'legume',
    baselineRisk: 'LOW',
    baseScore: 0,
    concerns: ['Common allergen'],
    affectedBy: { allergies: true }
  },
  'peanuts': {
    name: 'Peanuts',
    canonicalForm: 'peanuts',
    category: 'nut',
    baselineRisk: 'LOW',
    baseScore: 0,
    concerns: ['Severe allergen'],
    affectedBy: { allergies: true }
  },
  
  // Healthy ingredients
  'whole wheat': {
    name: 'Whole Wheat',
    canonicalForm: 'whole_wheat',
    category: 'grain',
    baselineRisk: 'LOW',
    baseScore: 0,
    concerns: [],
    affectedBy: { allergies: true }
  },
  'oats': {
    name: 'Oats',
    canonicalForm: 'oats',
    category: 'grain',
    baselineRisk: 'LOW',
    baseScore: 0,
    concerns: [],
    affectedBy: {}
  },
  'water': {
    name: 'Water',
    canonicalForm: 'water',
    category: 'liquid',
    baselineRisk: 'LOW',
    baseScore: 0,
    concerns: [],
    affectedBy: {}
  },
};

export const findIngredient = (ingredientName: string): IngredientInfo | null => {
  const normalized = ingredientName.toLowerCase().trim();
  
  // Direct match
  if (INGREDIENT_DATABASE[normalized]) {
    return INGREDIENT_DATABASE[normalized];
  }
  
  // Partial match
  for (const [key, value] of Object.entries(INGREDIENT_DATABASE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Unknown ingredient - return default
  return {
    name: ingredientName,
    canonicalForm: normalized.replace(/\s+/g, '_'),
    category: 'unknown',
    baselineRisk: 'LOW',
    baseScore: 0,
    concerns: ['Ingredient not in database'],
    affectedBy: {}
  };
};
