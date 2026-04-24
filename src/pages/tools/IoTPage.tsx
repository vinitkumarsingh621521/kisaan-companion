import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion";
import { Bot, Wifi, Droplets, Thermometer, Beaker, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import IoTLiveStream from "@/components/iot/IoTLiveStream";

export default function IoTPage() {
  const { active } = useActiveProfile();
  const [connected, setConnected] = useState(false);
  const [readings, setReadings] = useState({ temp: 28, moisture: 62, ph: 6.5, n: 240, p: 42, k: 200 });

  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => {
      setReadings(r => ({
        temp: +(r.temp + (Math.random() - 0.5) * 0.5).toFixed(1),
        moisture: Math.max(20, Math.min(95, +(r.moisture + (Math.random() - 0.5) * 2).toFixed(1))),
        ph: +(r.ph + (Math.random() - 0.5) * 0.05).toFixed(2),
        n: Math.max(50, Math.min(400, +(r.n + (Math.random() - 0.5) * 4).toFixed(0))),
        p: Math.max(10, Math.min(80, +(r.p + (Math.random() - 0.5) * 1.5).toFixed(0))),
        k: Math.max(50, Math.min(350, +(r.k + (Math.random() - 0.5) * 4).toFixed(0))),
      }));
    }, 2000);
    return () => clearInterval(id);
  }, [connected]);

  const connect = () => {
    toast.success("🔌 Connecting to KrishiSensor v2... Done!");
    setTimeout(() => setConnected(true), 800);
  };

  const sensors = [
    { label: "Soil Temperature", val: `${readings.temp}°C`, icon: Thermometer, color: "text-destructive", optimal: "20-30°C", ok: readings.temp >= 20 && readings.temp <= 30 },
    { label: "Soil Moisture", val: `${readings.moisture}%`, icon: Droplets, color: "text-krishi-sky", optimal: "50-70%", ok: readings.moisture >= 50 && readings.moisture <= 70 },
    { label: "Soil pH", val: readings.ph.toString(), icon: Beaker, color: "text-primary", optimal: "6.0-7.5", ok: readings.ph >= 6 && readings.ph <= 7.5 },
    { label: "Nitrogen (N)", val: `${readings.n} kg/ha`, icon: Beaker, color: "text-krishi-gold", optimal: "200-280", ok: readings.n >= 200 && readings.n <= 280 },
    { label: "Phosphorus (P)", val: `${readings.p} kg/ha`, icon: Beaker, color: "text-krishi-gold", optimal: "30-50", ok: readings.p >= 30 && readings.p <= 50 },
    { label: "Potassium (K)", val: `${readings.k} kg/ha`, icon: Beaker, color: "text-krishi-gold", optimal: "180-250", ok: readings.k >= 180 && readings.k <= 250 },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <Breadcrumbs />
      <main className="pt-4 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary" /> IoT Sensor Hub
            </h1>
            <p className="text-muted-foreground mt-1">Connect your soil sensors for real-time NPK, moisture, and temperature data — for {active?.full_name}'s farm</p>
          </motion.div>

          {!connected ? (
            <div className="glass-card p-8 text-center">
              <Wifi className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display font-semibold text-foreground text-lg mb-2">No sensors connected</h3>
              <p className="text-sm text-muted-foreground mb-5">Click below to start with our demo sensor or add your own KrishiSensor / SenseGrow / similar device.</p>
              <Button onClick={connect} className="gradient-primary border-0 text-primary-foreground"><Wifi className="h-4 w-4 mr-2" /> Connect Demo Sensor</Button>
              <p className="text-[10px] text-muted-foreground mt-4 italic">Real device support: KrishiSensor v2, SenseGrow Pro, Fasal Sense, Cropwise IoT, custom Arduino over MQTT</p>
            </div>
          ) : (
            <>
              <IoTLiveStream />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-primary font-medium">KrishiSensor v2 — Live</span>
                  <span className="text-muted-foreground text-xs">Field A · Updated every 2s</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setConnected(false)}>Disconnect</Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sensors.map(s => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                      {s.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                    </div>
                    <div className="text-2xl font-display font-bold text-foreground">{s.val}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">Optimal: {s.optimal}</div>
                  </motion.div>
                ))}
              </div>

              <div className="glass-card p-4 mt-5">
                <h3 className="font-display font-semibold text-foreground text-sm mb-2">⚡ Auto-alerts</h3>
                <div className="space-y-1.5 text-xs">
                  {sensors.filter(s => !s.ok).length === 0 ? (
                    <div className="text-primary">✓ All readings within optimal range. Your soil is happy! 🌱</div>
                  ) : sensors.filter(s => !s.ok).map(s => (
                    <div key={s.label} className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-3 w-3" /> {s.label} ({s.val}) is outside optimal range ({s.optimal})
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
