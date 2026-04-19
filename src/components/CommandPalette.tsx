import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home, LayoutDashboard, Sprout, TrendingUp, FileText, Newspaper, FlaskConical,
  Users, Map as MapIcon, BarChart3, Satellite, Cpu, Trophy, WifiOff, User, LogOut,
  Sun, Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const items = [
  { group: "Pages", icon: Home, label: "Home", path: "/" },
  { group: "Pages", icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { group: "Pages", icon: Sprout, label: "Crop Advisor", path: "/crop-advisor" },
  { group: "Pages", icon: TrendingUp, label: "Market Intelligence", path: "/market" },
  { group: "Pages", icon: FileText, label: "Government Schemes", path: "/schemes" },
  { group: "Pages", icon: Newspaper, label: "News", path: "/news" },
  { group: "Pages", icon: FlaskConical, label: "Research Lab", path: "/research" },
  { group: "Pages", icon: Users, label: "Community", path: "/community" },
  { group: "Pages", icon: User, label: "Profile", path: "/profile" },
  { group: "Tools", icon: MapIcon, label: "Field Mapper", path: "/tools/field-mapper" },
  { group: "Tools", icon: BarChart3, label: "Smart Reports", path: "/tools/reports" },
  { group: "Tools", icon: Satellite, label: "Satellite View", path: "/tools/satellite" },
  { group: "Tools", icon: Cpu, label: "IoT Sensors", path: "/tools/iot" },
  { group: "Tools", icon: Trophy, label: "Achievements", path: "/tools/achievements" },
  { group: "Tools", icon: WifiOff, label: "Offline Mode", path: "/tools/offline" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {["Pages", "Tools"].map((g) => (
          <CommandGroup key={g} heading={g}>
            {items.filter(i => i.group === g).map((it) => (
              <CommandItem key={it.path} onSelect={() => go(() => navigate(it.path))}>
                <it.icon className="h-4 w-4 mr-2" />
                {it.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go(() => setTheme(theme === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            Toggle theme
          </CommandItem>
          <CommandItem onSelect={() => go(async () => { await supabase.auth.signOut(); toast.success("Signed out"); navigate("/"); })}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
