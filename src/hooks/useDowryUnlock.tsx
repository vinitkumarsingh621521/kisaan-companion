import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";

type Ctx = {
  unlocked: boolean;
  unlock: () => void;
  lock: () => void;
};

const DowryCtx = createContext<Ctx>({ unlocked: false, unlock: () => {}, lock: () => {} });

export const DOWRY_PASSWORD = "takingdowryisbad";
export const DOWRY_ROUTE = "/dowry-estimator";

export function DowryUnlockProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const location = useLocation();

  // Auto-lock when navigating to ANY route other than /dowry-estimator
  useEffect(() => {
    if (unlocked && location.pathname !== DOWRY_ROUTE) {
      setUnlocked(false);
    }
  }, [location.pathname, unlocked]);

  return (
    <DowryCtx.Provider value={{ unlocked, unlock: () => setUnlocked(true), lock: () => setUnlocked(false) }}>
      {children}
    </DowryCtx.Provider>
  );
}

export const useDowryUnlock = () => useContext(DowryCtx);
