import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface IngredientCardProps {
  name: string;
  category: string;
  baselineRisk: string;
  finalScore: number;
  comment: string;
  isAllergen: boolean;
  multipliers: Array<{ reason: string; value: number }>;
}

export const IngredientCard = ({
  name,
  category,
  baselineRisk,
  finalScore,
  comment,
  isAllergen,
  multipliers,
}: IngredientCardProps) => {
  const getSeverityConfig = () => {
    if (isAllergen) {
      return {
        icon: AlertCircle,
        color: "destructive",
        label: "ALLERGEN",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive",
      };
    }
    
    if (finalScore >= 7) {
      return {
        icon: AlertCircle,
        color: "destructive",
        label: "HIGH RISK",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive",
      };
    }
    
    if (finalScore >= 4) {
      return {
        icon: AlertTriangle,
        color: "default",
        label: "MODERATE",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500",
      };
    }
    
    return {
      icon: CheckCircle,
      color: "default",
      label: "LOW RISK",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500",
    };
  };

  const severity = getSeverityConfig();
  const Icon = severity.icon;

  return (
    <Card className={`p-4 ${severity.bgColor} border-2 ${severity.borderColor} transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{name}</h3>
            <Badge variant="outline" className="text-xs">
              {category}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{comment}</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Badge variant={severity.color as any} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {severity.label}
          </Badge>
          <div className="text-2xl font-bold">
            {finalScore}/10
          </div>
        </div>
      </div>

      {multipliers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Personalized Factors:</p>
          <div className="space-y-1">
            {multipliers.map((mult, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>{mult.reason} ({mult.value > 1 ? `×${mult.value}` : `+${mult.value}`})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
