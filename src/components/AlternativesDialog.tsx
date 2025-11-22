import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

interface AlternativesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  ingredients: string[];
  productScore: number;
  userProfile: any;
}

export const AlternativesDialog = ({ 
  open, 
  onOpenChange, 
  productName, 
  ingredients, 
  productScore,
  userProfile 
}: AlternativesDialogProps) => {
  const [alternatives, setAlternatives] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAlternatives = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-alternatives", {
        body: {
          productName,
          ingredients,
          productScore,
          userProfile,
        },
      });

      if (error) throw error;

      setAlternatives(data.alternatives);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch alternatives. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !alternatives && !loading) {
      fetchAlternatives();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Healthier Alternatives
          </DialogTitle>
          <DialogDescription>
            Based on your health profile, here are better options for you
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : alternatives ? (
          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm text-foreground">
                  {alternatives}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Click to load alternatives
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};