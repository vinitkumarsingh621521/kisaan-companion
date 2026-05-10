import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Save, Upload, Loader2, Users, Plus, Trash2 } from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string | null;
  name: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  socials: { github?: string; linkedin?: string; email?: string };
  is_teacher: boolean;
  is_lead: boolean;
  sort_order: number;
}

export default function AdminTeamPage() {
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("team_members").select("*").order("sort_order");
    setMembers((data as any) || []);
    setLoading(false);
  };

  const addMember = async () => {
    if (!user) return;
    setAdding(true);
    const { error } = await supabase.from("team_members").insert({
      user_id: user.id,
      name: "New Member",
      role: "Role",
      bio: "",
      socials: {},
      sort_order: members.length,
    } as any);
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Member added — edit details below");
    load();
  };

  const deleteMember = async (id: string) => {
    if (!confirm("Delete this team member?")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const updateMember = (id: string, patch: Partial<TeamMember>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const updateSocial = (id: string, key: string, val: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, socials: { ...m.socials, [key]: val } } : m));
  };

  const saveMember = async (m: TeamMember) => {
    setSavingId(m.id);
    const { error } = await supabase.from("team_members").update({
      name: m.name, role: m.role, bio: m.bio, photo_url: m.photo_url,
      socials: m.socials, is_lead: m.is_lead, is_teacher: m.is_teacher,
    }).eq("id", m.id);
    setSavingId(null);
    if (error) toast.error("Save failed: " + error.message);
    else toast.success(`✓ ${m.name} updated`);
  };

  const uploadPhoto = async (m: TeamMember, file: File) => {
    if (!user) return;
    const path = `${user.id}/${m.id}-${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
    const { error: upErr } = await supabase.storage.from("team-photos").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload failed: " + upErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("team-photos").getPublicUrl(path);
    updateMember(m.id, { photo_url: publicUrl });
    await supabase.from("team_members").update({ photo_url: publicUrl }).eq("id", m.id);
    toast.success("Photo uploaded!");
  };

  if (authLoading || loading) return <div className="min-h-screen bg-muted/30"><Navbar /><div className="pt-24 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div></div>;
  if (!user) return <div className="min-h-screen bg-muted/30"><Navbar /><div className="pt-24 text-center text-muted-foreground">Please sign in.</div></div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> My Team</h1>
              <p className="text-sm text-muted-foreground">Add your teammates, photos, roles, bios, and social links. Only you can see your team.</p>
            </div>
            <Button onClick={addMember} disabled={adding} className="gradient-primary border-0 text-primary-foreground gap-1.5">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Member
            </Button>
          </div>

          {members.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <Users className="h-12 w-12 text-primary mx-auto mb-3 opacity-60" />
              <h3 className="font-display font-semibold text-foreground">No team members yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Add your first teammate to showcase them on your KrishiMitra profile.</p>
              <Button onClick={addMember} className="gradient-primary border-0 text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add your first member</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((m) => (
                <div key={m.id} className="glass-card p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                        <AvatarImage src={m.photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xl">{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <label className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:scale-110 transition">
                        <Upload className="h-3 w-3" />
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(m, e.target.files[0])} />
                      </label>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><Label className="text-xs">Name</Label><Input value={m.name} onChange={e => updateMember(m.id, { name: e.target.value })} /></div>
                      <div><Label className="text-xs">Role</Label><Input value={m.role} onChange={e => updateMember(m.id, { role: e.target.value })} /></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div><Label className="text-xs">GitHub URL</Label><Input value={m.socials?.github || ""} onChange={e => updateSocial(m.id, "github", e.target.value)} placeholder="https://github.com/..." /></div>
                    <div><Label className="text-xs">LinkedIn URL</Label><Input value={m.socials?.linkedin || ""} onChange={e => updateSocial(m.id, "linkedin", e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
                    <div><Label className="text-xs">Email</Label><Input value={m.socials?.email || ""} onChange={e => updateSocial(m.id, "email", e.target.value)} placeholder="name@example.com" /></div>
                  </div>

                  <div className="mb-3">
                    <Label className="text-xs">Bio</Label>
                    <Textarea value={m.bio || ""} onChange={e => updateMember(m.id, { bio: e.target.value })} rows={2} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs">
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={m.is_lead} onChange={e => updateMember(m.id, { is_lead: e.target.checked })} /> Team Lead</label>
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={m.is_teacher} onChange={e => updateMember(m.id, { is_teacher: e.target.checked })} /> Teacher / Mentor</label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => deleteMember(m.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" onClick={() => saveMember(m)} disabled={savingId === m.id} className="gradient-primary border-0 text-primary-foreground">
                        {savingId === m.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />} Save
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
