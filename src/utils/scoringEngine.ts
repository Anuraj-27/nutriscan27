// REQUIRE_CLINICAL_REVIEW: All scoring logic requires clinical validation before production use
import { findIngredient, IngredientInfo, RiskLevel } from './ingredientDatabase';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  age?: number;
  allergies: string[];
  has_diabetes: boolean;
  diabetes_measure?: string;
  diabetes_value?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
}

interface AIAnalyzedIngredient {
  name: string;
  category: string;
  riskLevel: RiskLevel;
  baseScore: number;
  concerns: string[];
  isAllergen: boolean;
  diabetesRisk: boolean;
  bpRisk: boolean;
}

export interface MultiplierInfo {
  reason: string;
  value: number;
}

export interface IngredientScore {
  name: string;
  canonicalForm: string;
  category: string;
  baselineRisk: string;
  baseScore: number;
  multipliers: MultiplierInfo[];
  finalScore: number;
  comment: string;
  isAllergen: boolean;
}

export interface ProductScore {
  productName: string;
  scanDate: string;
  userProfile: Partial<UserProfile>;
  ingredientScores: IngredientScore[];
  productScore: number;
  verdict: 'Good' | 'Moderate' | 'Bad';
  topReasons: string[];
  disclaimer: string;
}

// REQUIRE_CLINICAL_REVIEW: All multiplier values need clinical validation
const MULTIPLIERS = {
  ALLERGY_PENALTY: 10,
  DIABETES_MULTIPLIER: 1.5,
  BLOOD_PRESSURE_MULTIPLIER: 1.3,
  AGE_MULTIPLIER: 1.1, // For age > 65
};

const AGE_THRESHOLD = 65;
const HIGH_BP_SYSTOLIC = 130;
const HIGH_BP_DIASTOLIC = 80;

export const scoreIngredient = (
  ingredientName: string,
  userProfile: UserProfile
): IngredientScore => {
  const ingredientInfo = findIngredient(ingredientName);
  if (!ingredientInfo) {
    return createDefaultScore(ingredientName);
  }

  let finalScore = ingredientInfo.baseScore;
  const multipliers: MultiplierInfo[] = [];
  let isAllergen = false;

  // Check for allergies
  if (ingredientInfo.affectedBy?.allergies) {
    const hasAllergy = userProfile.allergies.some(allergy =>
      ingredientName.toLowerCase().includes(allergy.toLowerCase()) ||
      allergy.toLowerCase().includes(ingredientName.toLowerCase())
    );

    if (hasAllergy) {
      multipliers.push({
        reason: 'Matches your allergen list',
        value: MULTIPLIERS.ALLERGY_PENALTY,
      });
      finalScore += MULTIPLIERS.ALLERGY_PENALTY;
      isAllergen = true;
    }
  }

  // Diabetes multiplier
  if (ingredientInfo.affectedBy?.diabetes && userProfile.has_diabetes) {
    multipliers.push({
      reason: 'High glycemic concern for diabetes',
      value: MULTIPLIERS.DIABETES_MULTIPLIER,
    });
    finalScore *= MULTIPLIERS.DIABETES_MULTIPLIER;
  }

  // Blood pressure multiplier
  if (ingredientInfo.affectedBy?.bloodPressure) {
    const hasHighBP =
      (userProfile.blood_pressure_systolic && userProfile.blood_pressure_systolic >= HIGH_BP_SYSTOLIC) ||
      (userProfile.blood_pressure_diastolic && userProfile.blood_pressure_diastolic >= HIGH_BP_DIASTOLIC);

    if (hasHighBP) {
      multipliers.push({
        reason: 'Sodium concern for blood pressure',
        value: MULTIPLIERS.BLOOD_PRESSURE_MULTIPLIER,
      });
      finalScore *= MULTIPLIERS.BLOOD_PRESSURE_MULTIPLIER;
    }
  }

  // Age multiplier
  if (ingredientInfo.affectedBy?.age && userProfile.age && userProfile.age > AGE_THRESHOLD) {
    multipliers.push({
      reason: 'Increased concern for age > 65',
      value: MULTIPLIERS.AGE_MULTIPLIER,
    });
    finalScore *= MULTIPLIERS.AGE_MULTIPLIER;
  }

  finalScore = Math.round(finalScore);

  const comment = generateComment(ingredientInfo, multipliers, isAllergen);

  return {
    name: ingredientInfo.name,
    canonicalForm: ingredientInfo.canonicalForm,
    category: ingredientInfo.category,
    baselineRisk: ingredientInfo.baselineRisk,
    baseScore: ingredientInfo.baseScore,
    multipliers,
    finalScore,
    comment,
    isAllergen,
  };
};

const generateComment = (
  ingredient: IngredientInfo,
  multipliers: MultiplierInfo[],
  isAllergen: boolean
): string => {
  if (isAllergen) {
    return `⚠️ ALLERGEN ALERT: This ingredient matches your allergy profile and should be avoided.`;
  }

  if (multipliers.length === 0) {
    if (ingredient.baselineRisk === 'LOW') {
      return `✓ Generally considered safe with no specific concerns for your profile.`;
    }
    return `Moderate concern ingredient, but no personalized risk factors apply.`;
  }

  const concerns = ingredient.concerns.join(', ');
  return `Elevated concern due to: ${concerns}. ${multipliers[0].reason}.`;
};

const createDefaultScore = (ingredientName: string): IngredientScore => {
  return {
    name: ingredientName,
    canonicalForm: ingredientName.toLowerCase().replace(/\s+/g, '_'),
    category: 'unknown',
    baselineRisk: 'LOW',
    baseScore: 0,
    multipliers: [],
    finalScore: 0,
    comment: 'Ingredient not in database - unable to assess risk.',
    isAllergen: false,
  };
};

// Analyze ingredients using AI
const analyzeIngredientsWithAI = async (
  ingredients: string[],
  userProfile: UserProfile
): Promise<AIAnalyzedIngredient[]> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        ingredients,
        userProfile
      })
    });

    if (!response.ok) {
      throw new Error('Failed to analyze ingredients');
    }

    const data = await response.json();
    return data.ingredients;
  } catch (error) {
    console.error('AI analysis failed, falling back to local database:', error);
    return [];
  }
};

// Score ingredient using AI analysis
const scoreIngredientWithAI = (
  aiData: AIAnalyzedIngredient,
  userProfile: UserProfile
): IngredientScore => {
  let score = aiData.baseScore;
  const multipliers: MultiplierInfo[] = [];

  // Allergen check
  if (aiData.isAllergen) {
    score += MULTIPLIERS.ALLERGY_PENALTY;
    multipliers.push({ reason: 'Matches your allergen list', value: MULTIPLIERS.ALLERGY_PENALTY });
  }

  // Diabetes multiplier
  if (userProfile.has_diabetes && aiData.diabetesRisk) {
    multipliers.push({ reason: 'High glycemic concern for diabetes', value: MULTIPLIERS.DIABETES_MULTIPLIER });
    score *= MULTIPLIERS.DIABETES_MULTIPLIER;
  }

  // Blood pressure multiplier
  if (aiData.bpRisk && userProfile.blood_pressure_systolic && userProfile.blood_pressure_systolic >= HIGH_BP_SYSTOLIC) {
    multipliers.push({ reason: 'Sodium concern for blood pressure', value: MULTIPLIERS.BLOOD_PRESSURE_MULTIPLIER });
    score *= MULTIPLIERS.BLOOD_PRESSURE_MULTIPLIER;
  }

  // Age multiplier for certain categories
  if (userProfile.age && userProfile.age > AGE_THRESHOLD && 
      ['preservative', 'fat', 'additive'].includes(aiData.category)) {
    multipliers.push({ reason: 'Increased concern for age > 65', value: MULTIPLIERS.AGE_MULTIPLIER });
    score *= MULTIPLIERS.AGE_MULTIPLIER;
  }

  const finalScore = Math.min(Math.round(score), 10);

  return {
    name: aiData.name,
    canonicalForm: aiData.name.toLowerCase().replace(/\s+/g, '_'),
    category: aiData.category,
    baselineRisk: aiData.riskLevel,
    baseScore: aiData.baseScore,
    multipliers,
    finalScore,
    isAllergen: aiData.isAllergen,
    comment: generateCommentFromAI(aiData, multipliers, aiData.isAllergen)
  };
};

const generateCommentFromAI = (
  ingredient: AIAnalyzedIngredient,
  multipliers: MultiplierInfo[],
  isAllergen: boolean
): string => {
  if (isAllergen) {
    return `⚠️ ALLERGEN ALERT: This ingredient matches your allergy profile and should be avoided.`;
  }

  if (multipliers.length === 0) {
    if (ingredient.riskLevel === 'LOW') {
      return `✓ Generally considered safe with no specific concerns for your profile.`;
    }
    return `Moderate concern ingredient, but no personalized risk factors apply.`;
  }

  const concerns = ingredient.concerns.join(', ');
  return `Elevated concern due to: ${concerns}. ${multipliers[0].reason}.`;
};

export const scoreProduct = async (
  productName: string,
  ingredients: string[],
  userProfile: UserProfile
): Promise<ProductScore> => {
  // Try AI analysis first, fallback to local database
  const aiAnalysis = await analyzeIngredientsWithAI(ingredients, userProfile);
  
  const ingredientScores: IngredientScore[] = ingredients.map((ing, index) => {
    const aiData = aiAnalysis[index];
    if (aiData) {
      return scoreIngredientWithAI(aiData, userProfile);
    }
    // Fallback to local database
    return scoreIngredient(ing, userProfile);
  });

  // Calculate product score (0-100)
  const totalScore = ingredientScores.reduce((sum, ing) => sum + ing.finalScore, 0);
  const avgScore = ingredients.length > 0 ? totalScore / ingredients.length : 0;
  
  // Normalize to 0-100 scale (assuming max individual score could be ~30)
  const productScore = Math.min(Math.round((avgScore / 30) * 100), 100);

  // Determine verdict
  let verdict: 'Good' | 'Moderate' | 'Bad';
  if (productScore <= 30) {
    verdict = 'Good';
  } else if (productScore <= 60) {
    verdict = 'Moderate';
  } else {
    verdict = 'Bad';
  }

  // Generate top reasons
  const topReasons = generateTopReasons(ingredientScores, verdict);

  return {
    productName,
    scanDate: new Date().toISOString(),
    userProfile: {
      age: userProfile.age,
      has_diabetes: userProfile.has_diabetes,
      blood_pressure_systolic: userProfile.blood_pressure_systolic,
      blood_pressure_diastolic: userProfile.blood_pressure_diastolic,
    },
    ingredientScores,
    productScore,
    verdict,
    topReasons,
    disclaimer: 'This analysis is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.',
  };
};

const generateTopReasons = (
  ingredientScores: IngredientScore[],
  verdict: 'Good' | 'Moderate' | 'Bad'
): string[] => {
  const reasons: string[] = [];

  // Check for allergens
  const allergens = ingredientScores.filter(ing => ing.isAllergen);
  if (allergens.length > 0) {
    reasons.push(`Contains ${allergens.length} allergen(s) matching your profile`);
  }

  // High risk ingredients
  const highRisk = ingredientScores.filter(ing => ing.baselineRisk === 'HIGH');
  if (highRisk.length > 0) {
    reasons.push(`Contains ${highRisk.length} high-risk ingredient(s): ${highRisk.map(i => i.name).join(', ')}`);
  }

  // Personalized concerns
  const withMultipliers = ingredientScores.filter(ing => ing.multipliers.length > 0);
  if (withMultipliers.length > 0 && reasons.length < 3) {
    const topConcern = withMultipliers[0];
    reasons.push(topConcern.multipliers[0].reason);
  }

  // Positive reasons for good products
  if (verdict === 'Good' && reasons.length === 0) {
    const lowRisk = ingredientScores.filter(ing => ing.baselineRisk === 'LOW').length;
    reasons.push(`${lowRisk} low-risk ingredients with no personalized concerns`);
    reasons.push('No allergens or high-risk additives detected');
  }

  return reasons.slice(0, 3);
};
