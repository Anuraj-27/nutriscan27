import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userProfile } = await req.json();

    let profileContext = '';
    if (userProfile) {
      profileContext = `\n\nUser's Health Profile:
- Age: ${userProfile.age || 'Not provided'}
- Allergies: ${userProfile.allergies?.length > 0 ? userProfile.allergies.join(', ') : 'None'}
- Diabetes: ${userProfile.has_diabetes ? `Yes (${userProfile.diabetes_measure}: ${userProfile.diabetes_value})` : 'No'}
- Blood Pressure: ${userProfile.blood_pressure_systolic && userProfile.blood_pressure_diastolic ? `${userProfile.blood_pressure_systolic}/${userProfile.blood_pressure_diastolic} mmHg` : 'Not provided'}

IMPORTANT: Use this profile information to provide personalized advice. Reference their specific conditions when relevant.`;
    }

    const systemPrompt = `You are a knowledgeable and friendly health and nutrition assistant. Your role is to:

1. Answer questions about ingredients, nutrition, and health
2. Provide evidence-based information about food safety and dietary concerns
3. Help users understand their food choices and nutritional needs
4. Explain health conditions like diabetes, allergies, and blood pressure
5. Offer practical advice for healthier eating habits

Important guidelines:
- Always remind users that you're providing educational information, not medical advice
- Encourage users to consult healthcare professionals for personalized medical guidance
- Be empathetic and supportive when discussing health concerns
- Provide clear, easy-to-understand explanations
- If unsure, acknowledge limitations and recommend professional consultation
${profileContext}

Keep responses concise and actionable.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits exhausted. Please add credits to continue.' }),
          { 
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`AI API error: ${response.statusText}`);
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('Error in health chatbot:', error);
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
