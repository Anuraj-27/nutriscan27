import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";

interface ProfileData {
  age: number | null;
  allergies: string[];
  has_diabetes: boolean;
  diabetes_measure: string;
  diabetes_value: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  consent_image_storage: boolean;
  consent_medical_data: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [allergyInput, setAllergyInput] = useState("");
  
  const [profile, setProfile] = useState<ProfileData>({
    age: null,
    allergies: [],
    has_diabetes: false,
    diabetes_measure: "",
    diabetes_value: null,
    blood_pressure_systolic: null,
    blood_pressure_diastolic: null,
    consent_image_storage: false,
    consent_medical_data: false,
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
      } else if (data) {
        setProfile({
          age: data.age,
          allergies: data.allergies || [],
          has_diabetes: data.has_diabetes,
          diabetes_measure: data.diabetes_measure || "",
          diabetes_value: data.diabetes_value,
          blood_pressure_systolic: data.blood_pressure_systolic,
          blood_pressure_diastolic: data.blood_pressure_diastolic,
          consent_image_storage: data.consent_image_storage,
          consent_medical_data: data.consent_medical_data,
        });
      }

      setLoading(false);
    };

    loadProfile();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(profile)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your medical profile has been saved successfully.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !profile.allergies.includes(allergyInput.trim())) {
      setProfile({ ...profile, allergies: [...profile.allergies, allergyInput.trim()] });
      setAllergyInput("");
    }
  };

  const removeAllergy = (allergy: string) => {
    setProfile({ ...profile, allergies: profile.allergies.filter(a => a !== allergy) });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

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

        <Card>
          <CardHeader>
            <CardTitle>Medical Profile</CardTitle>
            <CardDescription>
              Help us personalize your ingredient analysis. All information is optional and kept private.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={profile.age || ""}
                onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || null })}
                placeholder="Your age"
              />
            </div>

            <div className="space-y-2">
              <Label>Allergies</Label>
              <div className="flex gap-2">
                <Input
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  placeholder="Add an allergy"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
                />
                <Button type="button" onClick={addAllergy}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.allergies.map((allergy) => (
                  <div
                    key={allergy}
                    className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {allergy}
                    <button
                      onClick={() => removeAllergy(allergy)}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="diabetes"
                  checked={profile.has_diabetes}
                  onCheckedChange={(checked) => 
                    setProfile({ ...profile, has_diabetes: checked as boolean })
                  }
                />
                <Label htmlFor="diabetes">I have diabetes</Label>
              </div>

              {profile.has_diabetes && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div className="space-y-2">
                    <Label htmlFor="diabetes-measure">Measure</Label>
                    <Input
                      id="diabetes-measure"
                      value={profile.diabetes_measure}
                      onChange={(e) => setProfile({ ...profile, diabetes_measure: e.target.value })}
                      placeholder="e.g., HbA1c"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diabetes-value">Value</Label>
                    <Input
                      id="diabetes-value"
                      type="number"
                      step="0.1"
                      value={profile.diabetes_value || ""}
                      onChange={(e) => setProfile({ ...profile, diabetes_value: parseFloat(e.target.value) || null })}
                      placeholder="Value"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Blood Pressure</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="systolic">Systolic</Label>
                  <Input
                    id="systolic"
                    type="number"
                    value={profile.blood_pressure_systolic || ""}
                    onChange={(e) => setProfile({ ...profile, blood_pressure_systolic: parseInt(e.target.value) || null })}
                    placeholder="e.g., 120"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diastolic">Diastolic</Label>
                  <Input
                    id="diastolic"
                    type="number"
                    value={profile.blood_pressure_diastolic || ""}
                    onChange={(e) => setProfile({ ...profile, blood_pressure_diastolic: parseInt(e.target.value) || null })}
                    placeholder="e.g., 80"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="font-medium">Privacy & Consent</h3>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consent-medical"
                  checked={profile.consent_medical_data}
                  onCheckedChange={(checked) => 
                    setProfile({ ...profile, consent_medical_data: checked as boolean })
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="consent-medical" className="font-normal">
                    I consent to storing my medical data for personalized analysis
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consent-images"
                  checked={profile.consent_image_storage}
                  onCheckedChange={(checked) => 
                    setProfile({ ...profile, consent_image_storage: checked as boolean })
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="consent-images" className="font-normal">
                    I consent to storing product images (by default, images are deleted after scanning)
                  </Label>
                </div>
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;