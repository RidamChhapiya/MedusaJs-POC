"use client"

import { useEffect, useRef, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRight } from "@medusajs/icons"
import Image from "next/image"

type FeatureSectionProps = {
    title: string
    description: string
    linkText: string
    href: string
    imageSrc: string
    reversed?: boolean
}

const FeatureSection = ({
    title,
    description,
    linkText,
    href,
    imageSrc,
    reversed = false,
}: FeatureSectionProps) => {
    const [isVisible, setIsVisible] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                }
            },
            { threshold: 0.15 }
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current)
            }
        }
    }, [])

    return (
        <div
            ref={ref}
            className={`relative w-full py-24 px-6 md:px-12 transition-all duration-1000 transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
        >
            <div className="content-container flex flex-col md:flex-row items-center gap-12 md:gap-24 h-full">
                {/* Text Content */}
                <div className={`flex-1 flex flex-col gap-8 ${reversed ? "md:order-2" : "md:order-1"}`}>
                    <div className="space-y-4">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 leading-tight">
                            {title}
                        </h2>
                        <p className="text-lg text-neutral-500 leading-relaxed max-w-lg font-light">
                            {description}
                        </p>
                    </div>

                    <div>
                        <LocalizedClientLink
                            href={href}
                            className="group inline-flex items-center gap-2 text-blue-600 font-semibold text-lg hover:text-blue-700 transition-colors"
                        >
                            {linkText}
                            <ArrowRight className="transition-transform group-hover:translate-x-1" />
                        </LocalizedClientLink>
                    </div>
                </div>

                {/* Image Content */}
                <div className={`flex-1 w-full aspect-[4/3] relative ${reversed ? "md:order-1" : "md:order-2"}`}>
                    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-500 group">
                        <Image
                            src={imageSrc}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        {/* Subtle internal gradient overlay for depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>

                    {/* Decorative Elements (Optional Floating UI) */}
                    <div className={`
             absolute -bottom-6 -right-6 w-24 h-24 bg-blue-50/50 backdrop-blur-3xl rounded-full -z-10
             ${reversed ? "-left-6 right-auto" : "-right-6 left-auto"}
          `} />
                </div>
            </div>
        </div>
    )
}

export default FeatureSection
