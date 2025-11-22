import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, userProfile } = await req.json();

    const prompt = `You are a nutrition expert. Analyze these ingredients and provide a detailed assessment for each one.

Ingredients: ${ingredients.join(', ')}

User Profile:
- Allergies: ${userProfile.allergies?.join(', ') || 'None'}
- Has Diabetes: ${userProfile.has_diabetes ? 'Yes' : 'No'}
- Blood Pressure: ${userProfile.blood_pressure_systolic && userProfile.blood_pressure_diastolic ? `${userProfile.blood_pressure_systolic}/${userProfile.blood_pressure_diastolic}` : 'Normal'}
- Age: ${userProfile.age || 'Not specified'}

For each ingredient, provide a JSON object with:
- name: ingredient name
- category: one of (sweetener, preservative, fat, additive, protein, fiber, vitamin, mineral, grain, dairy, nut, legume, fruit, vegetable, unknown)
- riskLevel: one of (LOW, MODERATE, HIGH)
- baseScore: number 0-10 (0=healthy, 10=unhealthy)
- concerns: array of health concerns (empty if none)
- isAllergen: boolean (true if matches user allergies)
- diabetesRisk: boolean (true if problematic for diabetes)
- bpRisk: boolean (true if affects blood pressure)

Return ONLY a valid JSON array, no additional text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const analyzedIngredients = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ ingredients: analyzedIngredients }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing ingredients:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
