import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sprout, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: route not found:", location.pathname);
    document.title = "404 · Lost in the field — KrishiMitra";
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/30 via-background to-primary/5 px-4">
      <div className="text-center max-w-md">
        {/* Animated wilting plant illustration */}
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -8, 0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block mb-6"
        >
          <div className="relative">
            <Sprout className="h-24 w-24 text-primary mx-auto" strokeWidth={1.5} />
            <motion.div
              className="absolute -top-2 -right-2 text-3xl"
              animate={{ y: [0, -4, 0], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              💧
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-7xl font-display font-bold text-gradient-gold mb-2"
        >
          404
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-foreground font-display mb-2"
        >
          This field is fallow 🌾
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground mb-8"
        >
          The page you're looking for has been ploughed under. Let's get you back to the farm.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/">
            <Button size="lg" className="gradient-primary border-0 text-primary-foreground gap-2">
              <Home className="h-5 w-5" /> Back to Farm
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
