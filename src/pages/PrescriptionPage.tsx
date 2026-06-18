import PageGuide from "@/components/PageGuide";
import { motion } from "framer-motion";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PrescriptionWizard from "@/components/prescription/PrescriptionWizard";

export default function PrescriptionPage() {
  return (
    <AgriPageBackground variant="crops">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        <PageGuide
          pageId="prescription"
          title="Kisaan Nuska — Farm Prescription"
          subtitle="ICAR-standard AI prescription for your crop"
          description="Answer 4 simple questions about your crop, soil, and farm — AI generates a complete doctor-style prescription with exact fertilizer doses, irrigation schedule, pest control timing, and financial projection. Download as PDF or share with your input dealer."
          gradient="from-green-900 to-emerald-700"
          aiContext="Kisaan Nuska generates a complete ICAR-standard farm prescription: fertilizer schedule, irrigation plan, pest control, harvest timing, and financial projection."
          features={[
            { icon: "💊", title: "Fertilizer Plan", desc: "Exact N-P-K products, doses per acre, and timing with weekly chart" },
            { icon: "💧", title: "Irrigation Schedule", desc: "Week-by-week water requirements and critical stages" },
            { icon: "🛡️", title: "Pest Control", desc: "Products, doses, and timing for your specific pest risks" },
            { icon: "🌾", title: "Harvest Plan", desc: "Estimated harvest date, yield range, and post-harvest care" },
            { icon: "💹", title: "Economics", desc: "ROI, break-even yield, and expected profit per acre" },
            { icon: "🛒", title: "Dealer List", desc: "Ready-made shopping list to show at Kisan Sewa Kendra" },
          ]}
        />
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-3">
            <span>💊</span> ICAR-standard AI Agronomy
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl text-foreground leading-tight">
            Kisaan Nuska
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-lg mx-auto">
            Get a complete, doctor-style prescription for your farm — fertilizer schedule, irrigation plan, pest control and harvest timing in one click.
          </p>
        </motion.div>
        <PrescriptionWizard />
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
