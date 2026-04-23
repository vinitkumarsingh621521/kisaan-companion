import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface PWAInstallContextType {
  canInstall: boolean;
  installed: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const PWAInstallContext = createContext<PWAInstallContextType>({
  canInstall: false,
  installed: false,
  promptInstall: async () => "unavailable",
});

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia?.("(display-mode: standalone)").matches) {
      setInstalled(true);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!evt) return "unavailable";
    await evt.prompt();
    const choice = await evt.userChoice;
    setEvt(null);
    return choice.outcome;
  };

  return (
    <PWAInstallContext.Provider value={{ canInstall: !!evt, installed, promptInstall }}>
      {children}
    </PWAInstallContext.Provider>
  );
}

export const usePWAInstall = () => useContext(PWAInstallContext);
