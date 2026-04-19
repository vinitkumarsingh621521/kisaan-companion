import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GovtSchemesCard from "@/components/dashboard/GovtSchemesCard";
import { motion } from "framer-motion";
import { FileText, Download, Calculator, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const tools = [
  { icon: FileText, title: "Loan Application Helper", desc: "Generate documents needed for bank agricultural loans" },
  { icon: Shield, title: "Insurance Claim Assistant", desc: "Automated crop damage documentation with photos" },
  { icon: Calculator, title: "Tax Calculator", desc: "Calculate agricultural income with exemptions" },
  { icon: Download, title: "Export Reports", desc: "Download farm data as PDF or Excel" },
];

export default function SchemesPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">⚡ Govt Schemes & Tools</h1>
            <p className="text-muted-foreground mt-1">Find eligible schemes & generate required documentation</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GovtSchemesCard />
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold text-foreground mb-4">Documentation Tools</h3>
              <div className="space-y-3">
                {tools.map((t) => (
                  <div key={t.title} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <t.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-foreground">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toast.info(`Opening ${t.title}...`, { description: t.desc })}>Open</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
