"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

export function HeroIntro() {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const els = ref.current.children;
    gsap.set(els, { y: 24, opacity: 0 });
    gsap.to(els, {
      y: 0,
      opacity: 1,
      duration: 0.55,
      stagger: 0.06,
      ease: "power2.out",
    });
  }, []);

  return (
    <section
      ref={ref}
      className="flex h-full min-w-0 flex-1 flex-col justify-center gap-6 text-white"
    >
      <div className="flex flex-col items-start gap-6">
        <Image
          alt="AOMONA avatar"
          className="size-41 rounded-full object-cover shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
          height={164}
          priority
          src="https://github.com/aomona.png"
          width={164}
        />
        <div className="leading-none">
          <h1 className="text-[clamp(4.5rem,9vw,8rem)] font-bold italic tracking-[-0.08em] lg:text-[clamp(4rem,7.8vw,8rem)] xl:text-[clamp(4.5rem,9vw,8rem)]">
            AOMONA
          </h1>
          <div className="mt-3 leading-normal">
            <p className="text-[clamp(2rem,3vw,2.5rem)] font-normal lg:text-[clamp(1.75rem,2.6vw,2.5rem)] xl:text-[clamp(2rem,3vw,2.5rem)]">
              High school developer
            </p>
            <p className="text-[clamp(1.25rem,2vw,1.5rem)] font-normal lg:text-[clamp(1.125rem,1.7vw,1.5rem)] xl:text-[clamp(1.25rem,2vw,1.5rem)]">
              building AI, web, and XR experiences.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-152 text-lg font-light leading-normal">
        <p>
          As a high school software engineer, I am engaged in both individual and team development
          projects using TypeScript, JavaScript, and Java.
        </p>
        <p>
          I build projects quickly across various themes that interest me—such as Discord
          integration tools, Minecraft/Fabric-related projects, cooking support apps, order
          management systems, and experiments in web expression—while valuing both practicality and
          a sense of playfulness in my development.
        </p>
      </div>
    </section>
  );
}
