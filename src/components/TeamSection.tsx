import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Github, Linkedin, Mail, Award, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  socials: { github?: string; linkedin?: string; email?: string };
  is_teacher: boolean;
  is_lead: boolean;
  sort_order: number;
}

export default function TeamSection({ compact = false }: { compact?: boolean }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("team_members").select("*").order("sort_order").then(({ data }) => {
      setMembers((data as any) || []);
      setLoading(false);
    });
  }, []);

  return (
    <section className={`${compact ? "py-10" : "py-16"} bg-gradient-to-b from-background to-muted/30 border-t border-border/50`}>
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <span className="krishi-badge bg-primary/10 text-primary mb-3"><Award className="h-3 w-3" /> SIH 2025 — Team #25030</span>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Meet the Team Behind KrishiMitra</h2>
          <p className="text-muted-foreground mt-2 text-sm">4 students, 1 mentor, 1 mission — empower every Indian farmer with AI</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {members.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -6 }}
                className="glass-card p-4 text-center group"
              >
                <div className="relative inline-block mb-3">
                  <Avatar className="h-20 w-20 ring-2 ring-primary/20 mx-auto">
                    <AvatarImage src={m.photo_url || undefined} alt={m.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-display">
                      {m.name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {m.is_teacher && <span className="absolute -bottom-1 -right-1 bg-krishi-gold text-primary-foreground rounded-full p-1"><GraduationCap className="h-3 w-3" /></span>}
                  {m.is_lead && <span className="absolute -top-1 -right-1 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">Lead</span>}
                </div>
                <h3 className="font-display font-semibold text-foreground text-sm">{m.name}</h3>
                <p className="text-xs text-primary font-medium">{m.role}</p>
                {m.bio && <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{m.bio}</p>}
                <div className="flex items-center justify-center gap-2 mt-2">
                  {m.socials?.github && <a href={m.socials.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Github className="h-3.5 w-3.5" /></a>}
                  {m.socials?.linkedin && <a href={m.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Linkedin className="h-3.5 w-3.5" /></a>}
                  {m.socials?.email && <a href={`mailto:${m.socials.email}`} className="text-muted-foreground hover:text-primary"><Mail className="h-3.5 w-3.5" /></a>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
