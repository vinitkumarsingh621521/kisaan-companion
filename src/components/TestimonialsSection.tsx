import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Ramesh Yadav",
    location: "Bihar",
    text: "KrishiMitra helped me switch from traditional rice to SRI method. My yield increased by 40% in just one season!",
    avatar: "🧑‍🌾",
    rating: 5,
  },
  {
    name: "Priya Devi",
    location: "Madhya Pradesh",
    text: "The disease detection saved my entire tomato crop. I uploaded a photo and got treatment advice in 30 seconds.",
    avatar: "👩‍🌾",
    rating: 5,
  },
  {
    name: "Suresh Kumar",
    location: "Jharkhand",
    text: "I got PM-KISAN benefits within 2 weeks after KrishiMitra helped me with the documentation. Amazing tool!",
    avatar: "👨‍🌾",
    rating: 5,
  },
  {
    name: "Lakshmi Bai",
    location: "Telangana",
    text: "Market price predictions helped me sell my cotton at 15% higher rates. The AI truly understands farming economics.",
    avatar: "👩‍🌾",
    rating: 4,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="krishi-badge bg-krishi-gold-light text-krishi-gold mb-4">
            <Quote className="h-3.5 w-3.5" /> Farmer Testimonials
          </span>
          <h2 className="section-title text-foreground">
            Trusted by <span className="text-gradient-primary">1.5 Lakh+</span> Farmers
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className="glass-card p-5"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-krishi-gold text-krishi-gold" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
                "{t.text}"
              </p>
              <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                <span className="text-2xl">{t.avatar}</span>
                <div>
                  <div className="font-display font-semibold text-sm text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.location}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
