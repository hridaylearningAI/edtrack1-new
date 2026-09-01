"use client";

import {
  useScroll,
  useTransform,
  motion,
} from "motion/react";
import React, { useEffect, useRef, useState } from "react";

export interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

interface TimelineProps {
  data: TimelineEntry[];
  /** Optional title shown above the timeline (e.g. "Changelog from my journey") */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** If true, no extra top padding/header block is rendered (for embedding in a page that has its own header) */
  compact?: boolean;
  /** When provided (e.g. in compact mode inside a scrollable div), scroll progress is tracked from this container instead of the window */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export function Timeline({ data, title, subtitle, compact = false, scrollContainerRef }: TimelineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // Measure content height so the line track has correct height (works when embedded in scrollable container)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data.length]);

  const scrollOptions = scrollContainerRef
    ? { target: containerRef, container: scrollContainerRef, offset: ["start 10%", "end 50%"] as const }
    : { target: containerRef, offset: ["start 10%", "end 50%"] as const };
  const { scrollYProgress } = useScroll(scrollOptions);

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className={`w-full font-sans ${compact ? "bg-transparent md:px-0" : "bg-white dark:bg-neutral-950 md:px-10"}`}
      ref={containerRef}
    >
      {!compact && (title != null || subtitle != null) && (
        <div className="max-w-7xl mx-auto py-20 px-4 md:px-8 lg:px-10">
          {title != null && (
            <h2 className="text-lg md:text-4xl mb-4 text-black dark:text-white max-w-4xl">
              {title}
            </h2>
          )}
          {subtitle != null && (
            <p className="text-neutral-700 dark:text-neutral-300 text-sm md:text-base max-w-sm">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div ref={ref} className={`relative max-w-7xl mx-auto ${compact ? "pb-8" : "pb-20"}`}>
        {data.map((item, index) => (
          <div
            key={index}
            className={`flex justify-start md:gap-10 ${compact ? (index === 0 ? "pt-4 md:pt-12" : "pt-10 md:pt-24") : "pt-10 md:pt-40"}`}
          >
            <div className="sticky flex flex-col md:flex-row z-10 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-white dark:bg-black flex items-center justify-center border-2 border-slate-200 dark:border-slate-700">
                <div className="h-4 w-4 rounded-full bg-brand-blue/20 dark:bg-brand-blue/30 border-2 border-brand-blue dark:border-brand-blue-light" />
              </div>
              <h3 className="hidden md:block text-lg md:pl-20 md:text-2xl font-bold text-slate-500 dark:text-slate-500">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-lg mb-4 text-left font-bold text-slate-500 dark:text-slate-500">
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}
        {/* Static track: full height so the line is always visible (no dependency on JS height) */}
        <div
          className="absolute left-8 top-0 bottom-0 w-[2px] overflow-hidden bg-gradient-to-b from-transparent from-[0%] via-slate-200 dark:via-slate-700 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
          aria-hidden
        >
          {/* Animated fill: height still driven by scroll for progress effect */}
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-brand-blue via-brand-red to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
