import { ReactNode, useId } from "react";

/**
 * Distinct agricultural-themed animated backgrounds per page.
 * Each variant has: a deep gradient, a repeating SVG pattern, 3 floating
 * blurred aurora blobs, and a slow drift animation. All themed to its page.
 */

type Variant =
  | "dashboard"
  | "advisor"
  | "crops"
  | "news"
  | "schemes"
  | "market"
  | "community"
  | "research"
  | "tools"
  | "profile";

interface VariantTheme {
  /** CSS background-color base */
  bg: string;
  /** radial gradient stops */
  gradient: string;
  /** tiny repeating SVG (data URI) */
  pattern: string;
  /** size of pattern tile */
  patternSize: string;
  /** three blob colors */
  blobs: [string, string, string];
}

const svg = (inner: string, w = 40, h = 40) =>
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`
  );

// Tiny themed patterns (very low opacity strokes/fills)
const wheatPattern = svg(
  `<g fill="none" stroke="white" stroke-opacity="0.05" stroke-width="1" stroke-linecap="round"><path d="M20 5 L20 35"/><path d="M20 10 Q 16 12 14 15"/><path d="M20 10 Q 24 12 26 15"/><path d="M20 16 Q 16 18 14 21"/><path d="M20 16 Q 24 18 26 21"/><path d="M20 22 Q 16 24 14 27"/><path d="M20 22 Q 24 24 26 27"/></g>`
);
const leafPattern = svg(
  `<g fill="white" fill-opacity="0.04"><path d="M10 30 Q 12 12 28 10 Q 30 26 14 32 Z"/></g>`
);
const sunPattern = svg(
  `<g fill="none" stroke="white" stroke-opacity="0.06" stroke-width="1"><circle cx="20" cy="20" r="5"/><path d="M20 8 L20 12 M20 28 L20 32 M8 20 L12 20 M28 20 L32 20 M11 11 L13 13 M27 27 L29 29 M29 11 L27 13 M11 29 L13 27"/></g>`
);
const dataNodePattern = svg(
  `<g fill="none" stroke="white" stroke-opacity="0.07" stroke-width="0.8"><circle cx="10" cy="10" r="1.5"/><circle cx="30" cy="30" r="1.5"/><circle cx="30" cy="10" r="1.5"/><circle cx="10" cy="30" r="1.5"/><path d="M10 10 L30 30 M30 10 L10 30"/></g>`
);
const coinPattern = svg(
  `<g fill="none" stroke="white" stroke-opacity="0.06" stroke-width="1"><circle cx="20" cy="20" r="6"/><path d="M17 20 L23 20 M20 17 L20 23"/></g>`
);
const documentPattern = svg(
  `<g fill="none" stroke="white" stroke-opacity="0.06" stroke-width="0.8"><rect x="13" y="10" width="14" height="18" rx="1"/><path d="M16 15 L24 15 M16 19 L24 19 M16 23 L21 23"/></g>`
);
const peoplePattern = svg(
  `<g fill="white" fill-opacity="0.05"><circle cx="20" cy="14" r="3"/><path d="M12 30 Q 20 20 28 30 Z"/></g>`
);
const dnaPattern = svg(
  `<g fill="none" stroke="white" stroke-opacity="0.07" stroke-width="0.8"><path d="M10 5 Q 30 20 10 35"/><path d="M30 5 Q 10 20 30 35"/></g>`,
  40,
  40
);
const gearPattern = svg(
  `<g fill="none" stroke="white" stroke-opacity="0.06" stroke-width="0.8"><circle cx="20" cy="20" r="5"/><path d="M20 10 L20 13 M20 27 L20 30 M10 20 L13 20 M27 20 L30 20"/></g>`
);
const newspaperPattern = svg(
  `<g fill="none" stroke="white" stroke-opacity="0.05" stroke-width="0.6"><path d="M5 12 L35 12 M5 18 L35 18 M5 24 L30 24 M5 30 L35 30"/></g>`
);

const THEMES: Record<Variant, VariantTheme> = {
  // Sunrise farm — your home base
  dashboard: {
    bg: "#1a2616",
    gradient:
      "radial-gradient(ellipse at 30% 0%, #2d4a1a 0%, #1a2616 45%, #0f1a0a 100%)",
    pattern: sunPattern,
    patternSize: "80px 80px",
    blobs: ["#fbbf24", "#16a34a", "#f97316"],
  },
  // Deep neural/data ocean — AI advisor
  advisor: {
    bg: "#0a1628",
    gradient:
      "radial-gradient(ellipse at 70% 20%, #1e3a5f 0%, #0a1628 50%, #050b1a 100%)",
    pattern: dataNodePattern,
    patternSize: "60px 60px",
    blobs: ["#06b6d4", "#8b5cf6", "#3b82f6"],
  },
  // Forest greens — crops / disease
  crops: {
    bg: "#0d2b1a",
    gradient:
      "radial-gradient(ellipse at center, #1a4d2e 0%, #0d2b1a 40%, #0a1a05 100%)",
    pattern: wheatPattern,
    patternSize: "60px 60px",
    blobs: ["#22c55e", "#84cc16", "#10b981"],
  },
  // Editorial sepia — news
  news: {
    bg: "#1a1410",
    gradient:
      "radial-gradient(ellipse at 50% 0%, #3a2818 0%, #1a1410 50%, #0a0805 100%)",
    pattern: newspaperPattern,
    patternSize: "70px 70px",
    blobs: ["#d97706", "#a16207", "#dc2626"],
  },
  // Government tricolor — schemes
  schemes: {
    bg: "#0a1428",
    gradient:
      "radial-gradient(ellipse at 50% 0%, #1e3a5f 0%, #0a1428 50%, #050a1a 100%)",
    pattern: documentPattern,
    patternSize: "70px 70px",
    blobs: ["#f97316", "#ffffff", "#16a34a"], // saffron, white, green
  },
  // Golden market / mandi
  market: {
    bg: "#1a1305",
    gradient:
      "radial-gradient(ellipse at 50% 100%, #4a3010 0%, #1a1305 50%, #0a0703 100%)",
    pattern: coinPattern,
    patternSize: "70px 70px",
    blobs: ["#eab308", "#f97316", "#dc2626"],
  },
  // Warm community
  community: {
    bg: "#1a0f1a",
    gradient:
      "radial-gradient(ellipse at 50% 30%, #3d1f3a 0%, #1a0f1a 50%, #0a050a 100%)",
    pattern: peoplePattern,
    patternSize: "70px 70px",
    blobs: ["#ec4899", "#f97316", "#a855f7"],
  },
  // Lab / research deep purple
  research: {
    bg: "#0d0a1f",
    gradient:
      "radial-gradient(ellipse at 50% 20%, #2a1f4a 0%, #0d0a1f 50%, #050310 100%)",
    pattern: dnaPattern,
    patternSize: "50px 50px",
    blobs: ["#a855f7", "#06b6d4", "#3b82f6"],
  },
  // Tools / IoT — tech industrial
  tools: {
    bg: "#0a1418",
    gradient:
      "radial-gradient(ellipse at 50% 50%, #1a3a44 0%, #0a1418 50%, #050a0d 100%)",
    pattern: gearPattern,
    patternSize: "60px 60px",
    blobs: ["#14b8a6", "#0ea5e9", "#84cc16"],
  },
  // Profile — soft natural
  profile: {
    bg: "#15211a",
    gradient:
      "radial-gradient(ellipse at 50% 0%, #2e4a36 0%, #15211a 50%, #0a120c 100%)",
    pattern: leafPattern,
    patternSize: "60px 60px",
    blobs: ["#22c55e", "#fbbf24", "#10b981"],
  },
};

interface Props {
  variant: Variant;
  children: ReactNode;
  className?: string;
}

export default function AgriPageBackground({ variant, children, className = "" }: Props) {
  const theme = THEMES[variant];
  const uid = useId().replace(/:/g, "");
  const animName = `agriDrift_${uid}`;
  const floatName = `agriFloat_${uid}`;
  const pulseName = `agriPulse_${uid}`;

  return (
    <div className={`dark min-h-screen relative overflow-hidden bg-background text-foreground ${className}`}>
      <style>{`
        @keyframes ${animName} {
          0%   { background-position: 0% 0%, 0px 0px; }
          100% { background-position: 100% 100%, 600px 600px; }
        }
        @keyframes ${floatName} {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50%      { transform: translate3d(30px,-30px,0) scale(1.08); }
        }
        @keyframes ${pulseName} {
          0%, 100% { opacity: var(--blob-op, 0.18); }
          50%      { opacity: calc(var(--blob-op, 0.18) * 1.4); }
        }
        .agri-bg-${uid} {
          background-color: ${theme.bg};
          background-image: ${theme.gradient}, url('${theme.pattern}');
          background-size: 100% 100%, ${theme.patternSize};
          background-repeat: no-repeat, repeat;
          animation: ${animName} 60s linear infinite;
        }
        .agri-blob-${uid} {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          will-change: transform, opacity;
          animation: ${floatName} 22s ease-in-out infinite,
                     ${pulseName} 11s ease-in-out infinite;
        }
        /* Soft vignette so center stays readable */
        .agri-veil-${uid} {
          background: radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.35) 100%);
        }
      `}</style>

      {/* Layer 1: animated gradient + pattern */}
      <div className={`absolute inset-0 agri-bg-${uid}`} aria-hidden />

      {/* Layer 2: blurred aurora blobs — kept faint so text always wins */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`agri-blob-${uid}`}
          style={{
            top: "-10%", left: "-12%",
            width: 420, height: 420,
            backgroundColor: theme.blobs[0],
            ["--blob-op" as any]: 0.22,
            animationDelay: "0s, 0s",
          }}
        />
        <div
          className={`agri-blob-${uid}`}
          style={{
            top: "-5%", right: "-12%",
            width: 460, height: 460,
            backgroundColor: theme.blobs[1],
            ["--blob-op" as any]: 0.18,
            animationDelay: "-7s, -3s",
          }}
        />
        <div
          className={`agri-blob-${uid}`}
          style={{
            bottom: "-20%", left: "35%",
            width: 540, height: 540,
            backgroundColor: theme.blobs[2],
            ["--blob-op" as any]: 0.2,
            animationDelay: "-13s, -6s",
          }}
        />
      </div>

      {/* Layer 3: contrast veil so any text on top reads cleanly */}
      <div aria-hidden className={`absolute inset-0 agri-veil-${uid} pointer-events-none`} />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
