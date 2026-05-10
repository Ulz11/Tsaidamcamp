"use client";

import { useEffect, useRef, useState, type ElementType } from "react";

const DELAY_CLASS: Record<number, string> = {
  0: "",
  1: "[transition-delay:100ms]",
  2: "[transition-delay:200ms]",
  3: "[transition-delay:320ms]",
  4: "[transition-delay:440ms]",
};

/**
 * Wrapper that fades + slides its children up when scrolled into view.
 * Single IntersectionObserver per instance — cheap to use generously.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: 0 | 1 | 2 | 3 | 4;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const Component = Tag as ElementType;
  return (
    <Component
      ref={ref}
      className={`tsaidam-reveal ${DELAY_CLASS[delay]} ${visible ? "is-visible" : ""} ${className}`.trim()}
    >
      {children}
    </Component>
  );
}
