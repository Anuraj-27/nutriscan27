import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Check } from "lucide-react";

interface IngredientEditorProps {
  ingredients: string[];
  productName: string;
  onConfirm: (ingredients: string[], productName: string) => Promise<void>;
  onCancel: () => void;
}

export const IngredientEditor = ({ 
  ingredients: initialIngredients, 
  productName: initialProductName,
  onConfirm, 
  onCancel 
}: IngredientEditorProps) => {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [productName, setProductName] = useState(initialProductName);
  const [newIngredient, setNewIngredient] = useState("");

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient("");
    }
  };

  const handleConfirm = () => {
    onConfirm(ingredients.filter(ing => ing.trim().length > 0), productName);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & Edit Ingredients</CardTitle>
        <CardDescription>
          Verify the extracted ingredients and make any necessary corrections
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product-name">Product Name</Label>
          <Input
            id="product-name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Enter product name"
          />
        </div>

        <div className="space-y-2">
          <Label>Ingredients ({ingredients.length})</Label>
          <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3 bg-secondary/20">
            {ingredients.map((ingredient, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 bg-background p-2 rounded border"
              >
                <span className="text-sm flex-1">{ingredient}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                  onClick={() => removeIngredient(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Add Ingredient</Label>
          <div className="flex gap-2">
            <Input
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              placeholder="Type ingredient name"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
            />
            <Button type="button" onClick={addIngredient} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            className="flex-1"
            disabled={ingredients.length === 0 || !productName.trim()}
          >
            <Check className="h-4 w-4 mr-2" />
            Confirm & Analyze
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
