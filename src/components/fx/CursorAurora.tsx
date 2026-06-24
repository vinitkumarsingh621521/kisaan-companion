import { useEffect, useRef } from "react";

/**
 * A fixed cursor-following spotlight + a scroll-progress bar.
 * Pure visual layer — pointer-events: none, never blocks interaction.
 */
export default function CursorAurora() {
  const spotRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const spot = spotRef.current;
    const bar = barRef.current;
    if (!spot || !bar) return;

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const apply = () => {
      raf = 0;
      spot.style.setProperty("--x", `${tx}px`);
      spot.style.setProperty("--y", `${ty}px`);
    };

    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? window.scrollY / h : 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Respect reduced-motion: skip spotlight, keep progress bar
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <>
      <div ref={barRef} className="scroll-progress" style={{ transform: "scaleX(0)" }} aria-hidden />
      {!reduce && <div ref={spotRef} className="cursor-spotlight hidden md:block" aria-hidden />}
    </>
  );
}
