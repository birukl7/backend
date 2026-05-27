"use client"

import { motion } from "framer-motion"
import type { SectionProps } from "../types"
import { router, usePage } from "@inertiajs/react";

export default function Section({ id, title, subtitle, content, isActive, showButton, buttonText, canRegister }: SectionProps) {
  const ctaText = buttonText ?? "Get Started";
  const { auth } = usePage().props as { auth?: { user?: unknown } };

  const goToGuestPage = (path: '/login' | '/register') => {
    if (auth?.user) {
      router.post('/logout', {}, {
        preserveScroll: true,
        onSuccess: () => router.visit(path),
      });
      return;
    }

    router.visit(path);
  };

  return (
    <section id={id} className="relative h-screen w-full snap-start flex flex-col justify-center p-8 md:p-16 lg:p-24">
      {subtitle && (
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {subtitle}
        </motion.div>
      )}
      <motion.h2
        className="text-4xl md:text-6xl lg:text-[5rem] xl:text-[6rem] font-bold leading-[1.1] tracking-tight max-w-4xl text-white"
        initial={{ opacity: 0, y: 50 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        {title}
      </motion.h2>
      {content && (
        <motion.p
          className="text-lg md:text-xl lg:text-2xl max-w-2xl mt-6 text-neutral-400"
          initial={{ opacity: 0, y: 50 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {content}
        </motion.p>
      )}
      {showButton && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex items-center gap-4"
        >
          <>
              <button
                  type="button"
                  onClick={() => goToGuestPage('/login')}
                  className="inline-flex min-h-11 items-center rounded-lg border border-gray-500 px-6 py-2.5 text-sm text-gray-300 hover:border-gray-300"
              >
                  Log in
              </button>

              {canRegister && (
                  <button
                      type="button"
                      onClick={() => goToGuestPage('/register')}
                      className="inline-flex min-h-11 items-center rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-black hover:bg-gray-200"
                  >
                      {ctaText}
                  </button>
              )}
          </>
          {/* <Button
            variant="outline"
            size="lg"
            className="text-[#FF4D00] bg-transparent border-[#FF4D00] hover:bg-[#FF4D00] hover:text-black transition-colors"
          >
            {buttonText}
          </Button> */}
        </motion.div>
      )}
    </section>
  )
}
