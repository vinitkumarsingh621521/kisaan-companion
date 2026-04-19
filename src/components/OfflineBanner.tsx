import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3000);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-destructive text-destructive-foreground px-4 py-2 rounded-b-lg shadow-lg flex items-center gap-2 text-sm font-medium"
        >
          <WifiOff className="h-4 w-4" /> Offline — using cached data
        </motion.div>
      )}
      {showRestored && online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-primary text-primary-foreground px-4 py-2 rounded-b-lg shadow-lg flex items-center gap-2 text-sm font-medium"
        >
          <Wifi className="h-4 w-4" /> Back online
        </motion.div>
      )}
    </AnimatePresence>
  );
}
