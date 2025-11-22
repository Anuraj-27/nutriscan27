import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, CheckCircle, Info, Save, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductScore } from "@/utils/scoringEngine";
import { Progress } from "@/components/ui/progress";
import { IngredientCard } from "@/components/IngredientCard";
import { HealthChatbot } from "@/components/HealthChatbot";
import { AlternativesDialog } from "@/components/AlternativesDialog";

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [productScore, setProductScore] = useState<ProductScore | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const score = location.state?.productScore as ProductScore;
    if (!score) {
      navigate("/scanner");
      return;
    }
    setProductScore(score);
    
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }
    };
    
    loadUserProfile();
  }, [location, navigate]);

  const handleSaveScan = async () => {
    if (!productScore) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("scans").insert([{
        user_id: user.id,
        product_name: productScore.productName,
        ingredients: productScore.ingredientScores as any,
        nutrition_facts: null,
        product_score: productScore.productScore,
        verdict: productScore.verdict,
        top_reasons: productScore.topReasons,
      }]);

      if (error) throw error;

      toast({
        title: "Scan saved!",
        description: "You can view this scan in your history.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error saving scan",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!productScore) {
    return null;
  }

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'Good':
        return 'bg-success text-white';
      case 'Moderate':
        return 'bg-warning text-white';
      case 'Bad':
        return 'bg-danger text-white';
      default:
        return 'bg-muted';
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 30) return 'text-success';
    if (score <= 60) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/scanner")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Scan Another Product
        </Button>

        {/* Overall Score Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{productScore.productName}</CardTitle>
                <CardDescription>
                  Scanned on {new Date(productScore.scanDate).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge className={`${getVerdictColor(productScore.verdict)} text-lg px-4 py-2`}>
                {productScore.verdict}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Product Score</span>
                <span className={`text-3xl font-bold ${getScoreColor(productScore.productScore)}`}>
                  {productScore.productScore}/100
                </span>
              </div>
              <Progress value={productScore.productScore} className="h-3" />
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-sm">Key Findings:</h3>
              <ul className="space-y-2">
                {productScore.topReasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-warning flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveScan} disabled={saving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save to History"}
              </Button>
              <Button 
                onClick={() => setShowAlternatives(true)} 
                variant="outline"
                className="flex-1"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Healthier Options
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients Analysis */}
        <div>
          <h3 className="text-2xl font-semibold mb-2">Ingredient Analysis</h3>
          <p className="text-muted-foreground mb-6">
            Personalized assessment based on your health profile
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {productScore.ingredientScores.map((ingredient, idx) => (
              <IngredientCard
                key={idx}
                name={ingredient.name}
                category={ingredient.category}
                baselineRisk={ingredient.baselineRisk}
                finalScore={ingredient.finalScore}
                comment={ingredient.comment}
                isAllergen={ingredient.isAllergen}
                multipliers={ingredient.multipliers}
              />
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{productScore.disclaimer}</p>
          </div>
        </div>
      </div>

      {userProfile && productScore && (
        <AlternativesDialog
          open={showAlternatives}
          onOpenChange={setShowAlternatives}
          productName={productScore.productName}
          ingredients={productScore.ingredientScores.map(i => i.name)}
          productScore={productScore.productScore}
          userProfile={userProfile}
        />
      )}

      <HealthChatbot />
    </div>
  );
};

export default Results;
