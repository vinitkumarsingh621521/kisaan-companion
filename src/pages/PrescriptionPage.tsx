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
