import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Save, Loader2, User, MapPin, Droplets, Sprout, Wallet, Wrench, Settings, Target, GraduationCap, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface FarmerDetails {
  [key: string]: string;
}

interface ProfileWizardProps {
  farmerDetails: FarmerDetails;
  onChange: (details: FarmerDetails) => void;
  onSave: () => void;
  saving: boolean;
}

const steps = [
  { id: "personal", label: "About You", icon: User, emoji: "👤" },
  { id: "land", label: "Land & Place", icon: MapPin, emoji: "🗺️" },
  { id: "soil", label: "Soil & Water", icon: Droplets, emoji: "💧" },
  { id: "crops", label: "Crops & Cattle", icon: Sprout, emoji: "🌾" },
  { id: "financial", label: "Money Matters", icon: Wallet, emoji: "💰" },
  { id: "resources", label: "Tools & Tech", icon: Wrench, emoji: "🔧" },
  { id: "goals", label: "Goals & Dreams", icon: Target, emoji: "🎯" },
  { id: "training", label: "Knowledge", icon: GraduationCap, emoji: "📚" },
  { id: "preferences", label: "How You Like It", icon: Settings, emoji: "⚙️" },
];

const indianStates = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

function SelectField({ label, value, onChange, options, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; hint?: string }) {
  return (
    <div>
      <Label className="text-xs mb-1 block text-muted-foreground">{label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue placeholder={placeholder || "Select"} /></SelectTrigger>
        <SelectContent className="bg-popover z-50">{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
      {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{hint}</p>}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string }) {
  return (
    <div>
      <Label className="text-xs mb-1 block text-muted-foreground">{label}</Label>
      <Input className="h-9" type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{hint}</p>}
    </div>
  );
}

export default function ProfileWizard({ farmerDetails, onChange, onSave, saving }: ProfileWizardProps) {
  const [step, setStep] = useState(0);
  const d = farmerDetails;
  const set = (key: string, val: string) => onChange({ ...d, [key]: val });

  // Personalization power
  const allFields = ["age","gender","education","family_size","farming_experience","tractor_name","farm_movie",
    "state","district","village","total_land","cultivable_land","irrigated_land","ownership_type","gps_coords",
    "soil_ph","nitrogen","phosphorus","potassium","organic_carbon","water_source","irrigation_type","annual_rainfall","soil_color",
    "current_crops","previous_crops","preferred_season","farming_type","livestock","crop_area_distribution","favorite_crop","crop_failure_story",
    "annual_income","monthly_investment","existing_loans","bank_account","insurance_status","budget_per_acre","money_dream",
    "equipment_owned","storage_facility","nearest_mandi_km","internet_access","smartphone","transport","app_comfort",
    "main_goal","biggest_challenge","five_year_dream","crop_priority","why_farming",
    "training_received","information_source","want_to_learn","whatsapp_groups",
    "risk_tolerance","notification_pref","market_preference","tech_comfort","talk_style"];
  const filled = allFields.filter(f => d[f] && String(d[f]).trim()).length;
  const power = Math.round((filled / allFields.length) * 100);

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Your Age" value={d.age} onChange={v => set("age", v)} placeholder="35" type="number" />
          <SelectField label="Gender" value={d.gender} onChange={v => set("gender", v)} options={["Male", "Female", "Other", "Prefer not to say"]} />
          <SelectField label="Education" value={d.education} onChange={v => set("education", v)} options={["No formal education", "Primary school", "Secondary school", "Higher secondary", "Graduate", "Post-graduate"]} />
          <InputField label="Family Size 👨‍👩‍👧‍👦" value={d.family_size} onChange={v => set("family_size", v)} placeholder="5" type="number" />
          <InputField label="Years Farming" value={d.farming_experience} onChange={v => set("farming_experience", v)} placeholder="10" type="number" />
          <InputField label="Tractor's Name 🚜" value={d.tractor_name} onChange={v => set("tractor_name", v)} placeholder="Bahubali, Sheru, etc." hint="Your AI advisor will use this in chat!" />
          <SelectField label="Farm Bollywood Movie 🎬" value={d.farm_movie} onChange={v => set("farm_movie", v)} options={["Sholay 🔫 (epic)", "3 Idiots 🎓 (innovative)", "Lagaan 🏏 (community)", "Don 🕴️ (high-stakes)", "Gully Boy 🎤 (hustle)"]} hint="Helps us guess your risk tolerance" />
        </div>
      );
      case 1: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField label="State" value={d.state} onChange={v => set("state", v)} options={indianStates} />
          <InputField label="District" value={d.district} onChange={v => set("district", v)} placeholder="Ranchi" />
          <InputField label="Village / Town" value={d.village} onChange={v => set("village", v)} placeholder="Kanke" />
          <InputField label="GPS Coordinates" value={d.gps_coords} onChange={v => set("gps_coords", v)} placeholder="23.34, 85.31" hint="Optional — improves weather accuracy" />
          <InputField label="Total Land (acres)" value={d.total_land} onChange={v => set("total_land", v)} placeholder="5" type="number" />
          <InputField label="Cultivable Land (acres)" value={d.cultivable_land} onChange={v => set("cultivable_land", v)} placeholder="4" type="number" />
          <InputField label="Irrigated Land (acres)" value={d.irrigated_land} onChange={v => set("irrigated_land", v)} placeholder="3" type="number" />
          <SelectField label="Ownership" value={d.ownership_type} onChange={v => set("ownership_type", v)} options={["Owned", "Leased", "Sharecropping", "Community land", "Mixed"]} />
        </div>
      );
      case 2: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Soil pH" value={d.soil_ph} onChange={v => set("soil_ph", v)} placeholder="6.5" type="number" hint="Get from Soil Health Card" />
          <InputField label="Nitrogen (kg/ha)" value={d.nitrogen} onChange={v => set("nitrogen", v)} placeholder="240" type="number" />
          <InputField label="Phosphorus (kg/ha)" value={d.phosphorus} onChange={v => set("phosphorus", v)} placeholder="42" type="number" />
          <InputField label="Potassium (kg/ha)" value={d.potassium} onChange={v => set("potassium", v)} placeholder="200" type="number" />
          <InputField label="Organic Carbon (%)" value={d.organic_carbon} onChange={v => set("organic_carbon", v)} placeholder="0.65" />
          <SelectField label="Soil Color (eyeball test 👀)" value={d.soil_color} onChange={v => set("soil_color", v)} options={["Black", "Red", "Brown", "Yellow", "Sandy white", "Mixed"]} hint="No card? No problem!" />
          <SelectField label="Water Source" value={d.water_source} onChange={v => set("water_source", v)} options={["Canal", "Bore well", "Open well", "River/Stream", "Rainwater only", "Pond/Tank", "Multiple sources"]} />
          <SelectField label="Irrigation Type" value={d.irrigation_type} onChange={v => set("irrigation_type", v)} options={["Drip", "Sprinkler", "Flood/Surface", "Furrow", "Rain-fed only", "Mixed"]} />
          <InputField label="Annual Rainfall (mm)" value={d.annual_rainfall} onChange={v => set("annual_rainfall", v)} placeholder="1200" type="number" />
        </div>
      );
      case 3: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Current Crops" value={d.current_crops} onChange={v => set("current_crops", v)} placeholder="Rice, Maize, Tomato" hint="Comma-separated" />
          <InputField label="Last Season Crops" value={d.previous_crops} onChange={v => set("previous_crops", v)} placeholder="Wheat, Mustard" />
          <SelectField label="Preferred Season" value={d.preferred_season} onChange={v => set("preferred_season", v)} options={["Kharif", "Rabi", "Zaid", "All seasons"]} />
          <SelectField label="Farming Style" value={d.farming_type} onChange={v => set("farming_type", v)} options={["100% Organic 🌿", "Mostly organic", "Mixed (smart!)", "Mostly chemical", "Whatever works 🤷"]} />
          <InputField label="Livestock 🐄🐐🐔" value={d.livestock} onChange={v => set("livestock", v)} placeholder="2 cows, 5 goats, 20 chickens" />
          <InputField label="Crop Area Split" value={d.crop_area_distribution} onChange={v => set("crop_area_distribution", v)} placeholder="Rice: 2 acres, Maize: 1.5 acres" />
          <InputField label="Favorite Crop ❤️" value={d.favorite_crop} onChange={v => set("favorite_crop", v)} placeholder="Tomato (हम तो टमाटर के दीवाने हैं)" />
          <InputField label="Worst Crop Failure Story" value={d.crop_failure_story} onChange={v => set("crop_failure_story", v)} placeholder="Last monsoon, lost 50% of paddy..." hint="So we don't repeat it 😅" />
        </div>
      );
      case 4: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField label="Annual Income" value={d.annual_income} onChange={v => set("annual_income", v)} options={["Below ₹1 lakh", "₹1-3 lakh", "₹3-5 lakh", "₹5-10 lakh", "Above ₹10 lakh"]} />
          <SelectField label="Monthly Investment Budget" value={d.monthly_investment} onChange={v => set("monthly_investment", v)} options={["Below ₹5,000", "₹5,000-10,000", "₹10,000-25,000", "₹25,000-50,000", "Above ₹50,000"]} />
          <SelectField label="Loans" value={d.existing_loans} onChange={v => set("existing_loans", v)} options={["No loans (lucky!)", "KCC loan", "Bank loan", "Microfinance", "Multiple loans"]} />
          <SelectField label="Bank Account" value={d.bank_account} onChange={v => set("bank_account", v)} options={["Savings", "Jan Dhan", "KCC", "Multiple accounts", "No bank account"]} />
          <SelectField label="Crop Insurance" value={d.insurance_status} onChange={v => set("insurance_status", v)} options={["PMFBY enrolled", "Private insurance", "No insurance", "Planning to enroll"]} />
          <InputField label="Budget per Acre (₹)" value={d.budget_per_acre} onChange={v => set("budget_per_acre", v)} placeholder="15000" type="number" />
          <InputField label="Your Money Dream 💸" value={d.money_dream} onChange={v => set("money_dream", v)} placeholder="Buy a tractor in 2 years" />
        </div>
      );
      case 5: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label="Equipment Owned" value={d.equipment_owned} onChange={v => set("equipment_owned", v)} placeholder="Tractor, Pump, Sprayer" />
          <SelectField label="Storage Facility" value={d.storage_facility} onChange={v => set("storage_facility", v)} options={["Own warehouse", "Rented storage", "Community storage", "No storage", "Cold storage access"]} />
          <InputField label="Distance to Mandi (km)" value={d.nearest_mandi_km} onChange={v => set("nearest_mandi_km", v)} placeholder="12" type="number" />
          <SelectField label="Internet Speed" value={d.internet_access} onChange={v => set("internet_access", v)} options={["4G/5G Mobile", "3G Mobile", "2G Mobile (slow!)", "WiFi", "No internet"]} />
          <SelectField label="Phone" value={d.smartphone} onChange={v => set("smartphone", v)} options={["Yes - Android", "Yes - iPhone", "Basic phone only", "No phone"]} />
          <SelectField label="Transport" value={d.transport} onChange={v => set("transport", v)} options={["Own vehicle", "Tractor", "Bullock cart 🐂", "Public transport", "Bicycle", "On foot"]} />
          <SelectField label="App Comfort 📱" value={d.app_comfort} onChange={v => set("app_comfort", v)} options={["Pro user (TikTok-level) 🤳", "Comfortable", "Need help sometimes", "Beginner", "Allergic to apps 😅"]} />
        </div>
      );
      case 6: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField label="Main Farming Goal" value={d.main_goal} onChange={v => set("main_goal", v)} options={["Maximum profit 💰", "Family food security", "Sustainability 🌍", "Quality over quantity", "Just survive this season"]} />
          <SelectField label="Biggest Challenge" value={d.biggest_challenge} onChange={v => set("biggest_challenge", v)} options={["Water scarcity", "Pest attacks", "Low market prices", "Labour shortage", "Climate change", "Money / capital", "Lack of info"]} />
          <InputField label="5-Year Dream 🌟" value={d.five_year_dream} onChange={v => set("five_year_dream", v)} placeholder="Double income, set up dairy unit" />
          <SelectField label="Crop Priority" value={d.crop_priority} onChange={v => set("crop_priority", v)} options={["Maximum profit", "Food security first", "Sustainability focused", "Balanced approach"]} />
          <InputField label="Why You Farm 🌱" value={d.why_farming} onChange={v => set("why_farming", v)} placeholder="Family tradition / passion / livelihood" />
        </div>
      );
      case 7: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField label="Training Received" value={d.training_received} onChange={v => set("training_received", v)} options={["KVK training", "Govt programs", "Online courses", "Self-taught", "Family learning", "None yet"]} />
          <SelectField label="Where You Get Info" value={d.information_source} onChange={v => set("information_source", v)} options={["WhatsApp groups", "YouTube", "TV (DD Kisan)", "Newspaper", "Other farmers", "Govt extension officer", "This app! 🙌"]} />
          <InputField label="What You Want to Learn" value={d.want_to_learn} onChange={v => set("want_to_learn", v)} placeholder="Drip irrigation, organic pesticides..." />
          <SelectField label="In WhatsApp Farmer Groups?" value={d.whatsapp_groups} onChange={v => set("whatsapp_groups", v)} options={["Yes, multiple", "Yes, one or two", "Not yet", "What's that? 🤔"]} />
        </div>
      );
      case 8: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField label="Risk Tolerance" value={d.risk_tolerance} onChange={v => set("risk_tolerance", v)} options={["Low — Safe crops only", "Medium — Some experiments", "High — Bring on the new stuff!"]} />
          <SelectField label="Notifications" value={d.notification_pref} onChange={v => set("notification_pref", v)} options={["SMS", "WhatsApp", "App push", "Email", "All — flood me!"]} />
          <SelectField label="Market Preference" value={d.market_preference} onChange={v => set("market_preference", v)} options={["Local mandi", "APMC market", "Direct to consumer", "FPO/Cooperative", "Online platforms"]} />
          <SelectField label="Tech Comfort" value={d.tech_comfort} onChange={v => set("tech_comfort", v)} options={["Very comfortable", "Somewhat comfortable", "Need help", "Not comfortable"]} />
          <SelectField label="AI Talking Style 🗣️" value={d.talk_style} onChange={v => set("talk_style", v)} options={["Friendly elder uncle", "Strict scientist", "Funny dost", "Quick & to-the-point", "Detailed explanations"]} hint="How should KrishiMitra AI talk to you?" />
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Personalization Power Meter */}
      <div className="rounded-lg p-3 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Personalization Power: <span className="text-primary font-bold">{power}%</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{power < 30 ? "Just starting 🌱" : power < 60 ? "Getting there 🌿" : power < 90 ? "Almost there 🌾" : "Maxed out! 🚀"}</span>
        </div>
        <Progress value={power} className="h-1.5" />
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            i === step ? "bg-primary/10 text-primary border border-primary/20" : i < step ? "bg-primary/5 text-primary/70" : "text-muted-foreground hover:bg-muted"
          }`}>
            <span>{s.emoji}</span>
            <span className="hidden md:inline">{s.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          <div className="mb-3">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              {steps[step].emoji} {steps[step].label}
              <span className="text-xs text-muted-foreground font-normal">— Step {step + 1} of {steps.length}</span>
            </h3>
            <p className="text-xs text-muted-foreground">Fill what you can, skip what you don't know — every field powers up your AI advisor</p>
          </div>
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between pt-2 sticky bottom-0 bg-card pt-3">
        <Button variant="outline" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        {step < steps.length - 1 ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save progress
            </Button>
            <Button size="sm" className="gradient-primary border-0 text-primary-foreground" onClick={() => setStep(step + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : (
          <Button size="sm" className="gradient-primary border-0 text-primary-foreground" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Everything 🌾
          </Button>
        )}
      </div>
    </div>
  );
}
