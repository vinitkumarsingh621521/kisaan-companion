import { useState, useEffect } from "react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, Plus, MapPin, Trash2, Edit3, Sparkles, User as UserIcon, EyeOff, Eye } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function ActiveProfileBar() {
  const { profiles, active, switchProfile, createProfile, deleteProfile, completionPct, loading } = useActiveProfile();
  const [openAdd, setOpenAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [hidden, setHidden] = useState(() => localStorage.getItem("km.profileBar.hidden") === "1");
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem("km.profileBar.hidden", hidden ? "1" : "0");
  }, [hidden]);

  // Hide on auth and home pages
  if (location.pathname === "/auth" || location.pathname === "/") return null;
  if (loading || !active) return null;

  const initials = active.full_name?.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() || "F";

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const created = await createProfile(newName.trim());
    setCreating(false);
    if (created) {
      toast.success(`🎉 Profile "${created.full_name}" created! Time to fill in the details.`);
      setNewName("");
      setOpenAdd(false);
    } else {
      toast.error("Could not create profile");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (profiles.length <= 1) { toast.error("Can't delete your last profile, kisaan!"); return; }
    if (!confirm(`Delete profile "${name}"? This cannot be undone.`)) return;
    await deleteProfile(id);
    toast.success("Profile deleted");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-16 z-40 bg-card/90 backdrop-blur-xl border-b border-border/50"
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarImage src={active.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-semibold text-foreground leading-tight flex items-center gap-1.5">
                  {active.full_name}
                  {profiles.length > 1 && <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{profiles.length} profiles</span>}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {active.farm_location || active.farmer_details?.district || active.farmer_details?.state || "Add location"}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>Switch farmer profile</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <AnimatePresence>
              {profiles.map(p => (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={() => switchProfile(p.id)}
                  className={`flex items-center gap-2 ${p.id === active.id ? "bg-primary/5" : ""}`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-muted">{p.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.farm_location || "No location"}</div>
                  </div>
                  {p.id === active.id && <span className="text-xs text-primary">●</span>}
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.full_name); }} className="p-1 hover:bg-destructive/10 rounded">
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </DropdownMenuItem>
              ))}
            </AnimatePresence>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setOpenAdd(true)} className="text-primary">
              <Plus className="h-4 w-4 mr-2" /> Add new farmer profile
            </DropdownMenuItem>
            <Link to="/profile">
              <DropdownMenuItem><Edit3 className="h-4 w-4 mr-2" /> Edit current profile</DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-3 flex-1 max-w-xs ml-auto">
          <div className="flex-1 hidden md:block">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
              <Sparkles className="h-3 w-3" />
              Personalization Power: <span className="font-semibold text-foreground">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-1.5" />
          </div>
          <Link to="/profile">
            <Button size="sm" variant="ghost" className="gap-1.5">
              <UserIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Profile</span>
            </Button>
          </Link>
        </div>
      </div>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🌱 Add a new farmer profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Got more than one farm? Or managing your uncle's land too? Add a profile and switch anytime.</p>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Farmer name (e.g. Suresh Patel)" autoFocus onKeyDown={e => e.key === "Enter" && handleCreate()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="gradient-primary border-0 text-primary-foreground">
              {creating ? "Creating..." : "Create profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
