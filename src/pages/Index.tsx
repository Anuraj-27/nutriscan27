import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ScanLine, User, LogOut, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HealthChatbot } from "@/components/HealthChatbot";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <CardTitle className="text-3xl mb-2">NutriScan</CardTitle>
              <CardDescription className="text-base">
                Personalized ingredient analysis powered by your health profile
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <ScanLine className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">Smart Scanning</h3>
                  <p className="text-sm text-muted-foreground">
                    Instant OCR analysis of product ingredients
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">Personalized Scoring</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on your allergies, diabetes, and blood pressure
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <History className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">Scan History</h3>
                  <p className="text-sm text-muted-foreground">
                    Track your scans and make informed choices
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => navigate("/auth")}
              className="w-full"
              size="lg"
            >
              Get Started
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              This tool is for informational purposes only and is not a substitute for professional medical advice.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">NutriScan</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Scan a Product</CardTitle>
              <CardDescription>
                Take or upload a photo of the ingredient list to get personalized analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/scanner")}
                className="w-full"
                size="lg"
              >
                <ScanLine className="h-5 w-5 mr-2" />
                Start Scanning
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>Your scan history will appear here</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No scans yet. Start by scanning your first product!</p>
              </div>
            </CardContent>
          </Card>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">⚠️ Medical Disclaimer</p>
            <p>
              NutriScan provides informational analysis only and is not a substitute for professional medical advice, 
              diagnosis, or treatment. Always consult your healthcare provider regarding your medical conditions.
            </p>
          </div>
        </div>
      </main>

      <HealthChatbot />
    </div>
  );
};

export default Index;
