import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Camera, Upload, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOCR } from "@/hooks/useOCR";
import { parseIngredients, extractNutritionFacts } from "@/utils/ingredientParser";
import { IngredientEditor } from "@/components/IngredientEditor";
import { scoreProduct } from "@/utils/scoringEngine";
import { CameraCapture } from "@/components/CameraCapture";

const Scanner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { extractText, isProcessing, progress } = useOCR();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [parsedData, setParsedData] = useState<{
    ingredients: string[];
    productName: string;
  } | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }
    };

    loadUserProfile();
  }, [navigate]);

  const processImage = async (file: File) => {
    setShowCamera(false);

    // Show image preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      toast({
        title: "Processing image",
        description: "Extracting text from the image...",
      });

      const result = await extractText(file);

      if (result.confidence < 60) {
        toast({
          title: "Low confidence",
          description: "The image quality may be low. Please review the extracted ingredients carefully.",
          variant: "destructive",
        });
      }

      const parsed = parseIngredients(result.text);
      
      if (parsed.ingredients.length === 0) {
        toast({
          title: "No ingredients found",
          description: "Could not detect ingredients in the image. Please try a clearer photo.",
          variant: "destructive",
        });
        return;
      }

      setParsedData({
        ingredients: parsed.ingredients,
        productName: parsed.productName,
      });

      toast({
        title: "Text extracted!",
        description: `Found ${parsed.ingredients.length} ingredients. Please review and edit if needed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process image",
        variant: "destructive",
      });
      setImagePreview(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImage(file);
    }
  };

  const handleConfirmIngredients = async (ingredients: string[], productName: string) => {
    if (!userProfile) {
      toast({
        title: "Profile required",
        description: "Please complete your medical profile first.",
        variant: "destructive",
      });
      navigate("/profile");
      return;
    }

    toast({
      title: "Analyzing ingredients...",
      description: "Using AI to get accurate nutritional data",
    });

    try {
      // Score the product with AI analysis
      const productScoreResult = await scoreProduct(productName, ingredients, {
        age: userProfile.age,
        allergies: userProfile.allergies || [],
        has_diabetes: userProfile.has_diabetes,
        diabetes_measure: userProfile.diabetes_measure,
        diabetes_value: userProfile.diabetes_value,
        blood_pressure_systolic: userProfile.blood_pressure_systolic,
        blood_pressure_diastolic: userProfile.blood_pressure_diastolic,
      });

      // Navigate to results
      navigate("/results", { state: { productScore: productScoreResult } });
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: "Failed to analyze ingredients. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setParsedData(null);
    setImagePreview(null);
    setShowCamera(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {parsedData ? (
          <IngredientEditor
            ingredients={parsedData.ingredients}
            productName={parsedData.productName}
            onConfirm={handleConfirmIngredients}
            onCancel={handleCancel}
          />
        ) : showCamera ? (
          <CameraCapture
            onCapture={processImage}
            onClose={() => setShowCamera(false)}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Scan Product</CardTitle>
              <CardDescription>
                Upload or capture an image of the product's ingredient label
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {imagePreview && (
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Product preview" 
                    className="w-full h-auto max-h-64 object-contain bg-muted"
                  />
                </div>
              )}

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Processing image...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  {isProcessing ? (
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-medium mb-2">
                      {isProcessing ? "Processing..." : "Upload Product Image"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isProcessing 
                        ? "Extracting text from your image" 
                        : "Take a clear photo of the ingredient list"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowCamera(true)} 
                      disabled={isProcessing}
                      variant="default"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Open Camera
                    </Button>
                    
                    <label htmlFor="file-upload">
                      <Button asChild disabled={isProcessing} variant="outline">
                        <span className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          {isProcessing ? "Processing..." : "Upload Image"}
                        </span>
                      </Button>
                      <input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isProcessing}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2">
                <p className="font-medium">Tips for best results:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Ensure good lighting</li>
                  <li>Keep the label flat and in focus</li>
                  <li>Include the entire ingredient list</li>
                  <li>Avoid glare and shadows</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Scanner;