import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ActiveProfileBar from "@/components/ActiveProfileBar";
import ProfileWizard, { FarmerDetails } from "@/components/profile/ProfileWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { User, MapPin, Ruler, Layers, Globe, Save, Loader2 } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { useTranslation } from "react-i18next";

const languages = ["English", "हिंदी", "বাংলা", "தமிழ்", "తెలుగు", "ಕನ್ನಡ", "मराठी", "ગુજરાતી", "ਪੰਜਾਬੀ", "മലയാളം", "ଓଡ଼ିଆ", "অসমীয়া", "اردو"];
const soilTypes = ["Red Laterite", "Alluvial", "Black Cotton", "Sandy", "Clay", "Loamy", "Red Sandy", "Saline", "Peaty", "Forest", "Desert", "Mountain"];

export default function ProfilePage() {
  const { active, updateProfile, loading: pLoading } = useActiveProfile();
  const [basic, setBasic] = useState({ full_name: "", farm_location: "", farm_size: "", soil_type: "", preferred_language: "English" });
  const [details, setDetails] = useState<FarmerDetails>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!active) return;
    setBasic({
      full_name: active.full_name || "",
      farm_location: active.farm_location || "",
      farm_size: active.farm_size || "",
      soil_type: active.soil_type || "",
      preferred_language: active.preferred_language || "English",
    });
    setDetails((active.farmer_details || {}) as FarmerDetails);
  }, [active?.id]);

  const handleSave = async () => {
    if (!active) return;
    setSaving(true);
    await updateProfile(active.id, { ...basic, farmer_details: details } as any);
    setSaving(false);
    toast.success("🌾 Profile saved! Dashboard, AI advisor & all pages will now use this data.");
  };

  if (pLoading) return <AgriPageBackground variant="profile"><Navbar /><div className="pt-32 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div></AgriPageBackground>;

  return (
    <AgriPageBackground variant="profile">
      <Navbar />
      <ActiveProfileBar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">👨‍🌾 Editing: {active?.full_name}</h1>
            <p className="text-muted-foreground mt-1">Switch profile from the bar above. The more you fill in, the smarter your AI gets.</p>
          </motion.div>

          <div className="glass-card p-6 space-y-5 mb-5">
            <h3 className="font-display font-semibold text-foreground">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><Label className="flex items-center gap-2 mb-2"><User className="h-4 w-4" /> Full Name</Label><Input value={basic.full_name} onChange={e => setBasic({ ...basic, full_name: e.target.value })} placeholder="Your name" /></div>
              <div><Label className="flex items-center gap-2 mb-2"><MapPin className="h-4 w-4" /> Farm Location</Label><Input value={basic.farm_location} onChange={e => setBasic({ ...basic, farm_location: e.target.value })} placeholder="City, State" /></div>
              <div><Label className="flex items-center gap-2 mb-2"><Ruler className="h-4 w-4" /> Farm Size</Label><Input value={basic.farm_size} onChange={e => setBasic({ ...basic, farm_size: e.target.value })} placeholder="5 Acres" /></div>
              <div><Label className="flex items-center gap-2 mb-2"><Layers className="h-4 w-4" /> Soil Type</Label>
                <Select value={basic.soil_type} onValueChange={v => setBasic({ ...basic, soil_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">{soilTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="flex items-center gap-2 mb-2"><Globe className="h-4 w-4" /> Preferred Language</Label>
                <Select value={basic.preferred_language} onValueChange={v => setBasic({ ...basic, preferred_language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">{languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
          </div>

          <div className="glass-card p-6 mb-5">
            <h3 className="font-display font-semibold text-foreground mb-1">Detailed Farm Profile</h3>
            <p className="text-xs text-muted-foreground mb-4">70+ fields for hyper-personalization (with some humor!) — the AI uses every detail</p>
            <ProfileWizard farmerDetails={details} onChange={setDetails} onSave={handleSave} saving={saving} />
          </div>

          <Button className="w-full gradient-primary border-0 text-primary-foreground" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save Everything
          </Button>
        </div>
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
