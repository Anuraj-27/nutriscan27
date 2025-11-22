import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, ingredients, productScore, userProfile } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are a nutritional assistant helping users find healthier alternatives to products. 
Based on the user's health profile and the scanned product, suggest 3-5 healthier alternatives.

Consider:
- User's allergies: ${userProfile.allergies?.join(", ") || "None"}
- Diabetes status: ${userProfile.has_diabetes ? `Yes (${userProfile.diabetes_measure}: ${userProfile.diabetes_value})` : "No"}
- Blood pressure: ${userProfile.blood_pressure_systolic}/${userProfile.blood_pressure_diastolic}
- Age: ${userProfile.age}

For each alternative, provide:
1. Product name (or category if specific product)
2. Why it's healthier
3. Key benefits for this user's profile`;

    const userPrompt = `Product analyzed: ${productName}
Score: ${productScore}/100
Ingredients: ${ingredients.join(", ")}

Suggest healthier alternatives.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const alternatives = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ alternatives }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in suggest-alternatives:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});