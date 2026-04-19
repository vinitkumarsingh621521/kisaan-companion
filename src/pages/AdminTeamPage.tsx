import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Save, Upload, Loader2, Shield } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo_url: string | null;
  socials: { github?: string; linkedin?: string; email?: string };
  is_teacher: boolean;
  is_lead: boolean;
  sort_order: number;
}

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    // Check admin
    if (user) {
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!roleData);
    }
    const { data } = await supabase.from("team_members").select("*").order("sort_order");
    setMembers((data as any) || []);
    setLoading(false);
  };

  const becomeAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Login first"); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" });
    if (error) { toast.error("Already admin or error: " + error.message); return; }
    setIsAdmin(true);
    toast.success("🎉 You're now an admin!");
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
      name: m.name, role: m.role, bio: m.bio, photo_url: m.photo_url, socials: m.socials, is_lead: m.is_lead, is_teacher: m.is_teacher,
    }).eq("id", m.id);
    setSavingId(null);
    if (error) toast.error("Save failed: " + error.message);
    else toast.success(`✓ ${m.name} updated`);
  };

  const uploadPhoto = async (m: TeamMember, file: File) => {
    const path = `${m.id}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("team-photos").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload failed: " + upErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("team-photos").getPublicUrl(path);
    updateMember(m.id, { photo_url: publicUrl });
    await supabase.from("team_members").update({ photo_url: publicUrl }).eq("id", m.id);
    toast.success("Photo uploaded! Don't forget to Save.");
  };

  if (loading) return <div className="min-h-screen bg-muted/30"><Navbar /><div className="pt-24 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div></div>;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Team Admin</h1>
              <p className="text-sm text-muted-foreground">Edit photos, names, roles, bios, and social links</p>
            </div>
            {!isAdmin && <Button onClick={becomeAdmin} variant="outline">Claim Admin Role</Button>}
          </div>

          {!isAdmin && (
            <div className="mb-6 p-4 rounded-lg bg-krishi-gold-light border border-krishi-gold/30 text-sm">
              ⚠️ You need admin role to save changes. Click "Claim Admin Role" above (first user gets it).
            </div>
          )}

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
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(m, e.target.files[0])} disabled={!isAdmin} />
                    </label>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label className="text-xs">Name</Label><Input value={m.name} onChange={e => updateMember(m.id, { name: e.target.value })} disabled={!isAdmin} /></div>
                    <div><Label className="text-xs">Role</Label><Input value={m.role} onChange={e => updateMember(m.id, { role: e.target.value })} disabled={!isAdmin} /></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div><Label className="text-xs">GitHub URL</Label><Input value={m.socials?.github || ""} onChange={e => updateSocial(m.id, "github", e.target.value)} placeholder="https://github.com/..." disabled={!isAdmin} /></div>
                  <div><Label className="text-xs">LinkedIn URL</Label><Input value={m.socials?.linkedin || ""} onChange={e => updateSocial(m.id, "linkedin", e.target.value)} placeholder="https://linkedin.com/in/..." disabled={!isAdmin} /></div>
                  <div><Label className="text-xs">Email</Label><Input value={m.socials?.email || ""} onChange={e => updateSocial(m.id, "email", e.target.value)} placeholder="name@example.com" disabled={!isAdmin} /></div>
                </div>

                <div className="mb-3">
                  <Label className="text-xs">Bio</Label>
                  <Textarea value={m.bio || ""} onChange={e => updateMember(m.id, { bio: e.target.value })} rows={2} disabled={!isAdmin} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={m.is_lead} onChange={e => updateMember(m.id, { is_lead: e.target.checked })} disabled={!isAdmin} /> Team Lead</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={m.is_teacher} onChange={e => updateMember(m.id, { is_teacher: e.target.checked })} disabled={!isAdmin} /> Teacher / Mentor</label>
                  </div>
                  <Button size="sm" onClick={() => saveMember(m)} disabled={savingId === m.id || !isAdmin} className="gradient-primary border-0 text-primary-foreground">
                    {savingId === m.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />} Save
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
