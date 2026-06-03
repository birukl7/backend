"use client"

import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { router, usePage } from "@inertiajs/react"
import { JOBS_INDEX_PATH } from '@/lib/welcome'
import { Badge } from "./ui/badge"

interface SectionProps {
    id: string
    isActive: boolean
    showButton?: boolean
    canRegister?: boolean
}

export default function Section({ id, isActive, showButton, canRegister }: SectionProps) {
    const { t } = useTranslation()
    const { auth } = usePage().props as { auth?: { user?: unknown } }

    const title = t(`landing.${id}.title`)
    const content = t(`landing.${id}.content`)

    const goToGuestPage = (path: '/login' | '/register') => {
        if (auth?.user) {
            router.post('/logout', {}, {
                preserveScroll: true,
                onSuccess: () => router.visit(path),
            })
            return
        }
        router.visit(path)
    }

    return (
        <section id={id} className="relative h-screen w-full snap-start flex flex-col justify-center p-8 md:p-16 lg:p-24">
            {id === 'hero' && (
                <motion.div
                    className="mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isActive ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                >
                    <Badge
                        variant="outline"
                        className="border-white/40 bg-white/5 text-white"
                    >
                        {t('landing.hero.badge')}
                    </Badge>
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

            <motion.p
                className="text-lg md:text-xl lg:text-2xl max-w-2xl mt-6 text-neutral-400"
                initial={{ opacity: 0, y: 50 }}
                animate={isActive ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                {content}
            </motion.p>

            {showButton && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isActive ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-8 flex items-center gap-4"
                >
                    <button
                        type="button"
                        onClick={() => goToGuestPage('/login')}
                        className="inline-flex min-h-11 items-center rounded-lg border border-gray-500 px-6 py-2.5 text-sm text-gray-300 hover:border-gray-300"
                    >
                        {auth?.user ? t('landing.hero.dashboard') : t('landing.hero.logIn')}
                    </button>

                    {canRegister && !auth?.user && (
                        <button
                            type="button"
                            onClick={() =>
                                id === 'join'
                                    ? goToGuestPage('/register')
                                    : router.visit(JOBS_INDEX_PATH)
                            }
                            className="inline-flex min-h-11 items-center rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-black hover:bg-gray-200"
                        >
                            {id === 'join' ? t('landing.hero.joinNow') : t('landing.hero.getStarted')}
                        </button>
                    )}
                </motion.div>
            )}
        </section>
    )
}
