import { Button, Heading } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

const Hero = () => {
  return (
    <div className="relative w-full h-[85vh] md:h-[90vh] bg-white overflow-hidden flex items-center">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-60 z-0"></div>

      <div className="content-container relative z-10 w-full h-full flex flex-col sm:flex-row items-center gap-12 sm:gap-16 md:gap-20 pt-20 sm:pt-0">

        {/* Left: Text */}
        <div className="flex-1 flex flex-col justify-center items-start gap-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-forwards">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100/50 text-blue-700 text-sm font-semibold tracking-wide uppercase mb-2 backdrop-blur-sm border border-blue-200/50">
            The Next Gen Network
          </div>

          <Heading
            level="h1"
            className="text-5xl md:text-7xl font-bold tracking-tight text-neutral-900 leading-[1.1]"
          >
            Future of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Connectivity
            </span>
          </Heading>

          <p className="text-xl text-neutral-500 max-w-lg font-light leading-relaxed">
            Experience ultra-fast 5G, seamless roaming, and premium devices.
            Join the network designed for your digital lifestyle.
          </p>

          <div className="flex items-center gap-4 pt-4">
            <LocalizedClientLink href="/buy-sim">
              <Button
                className="
                      px-8 py-4 rounded-full text-base bg-neutral-900 text-white 
                      hover:bg-neutral-800 hover:shadow-lg transition-all duration-300
                   "
              >
                Get Connected
              </Button>
            </LocalizedClientLink>
            <LocalizedClientLink href="/store">
              <Button
                variant="secondary"
                className="
                      px-8 py-4 rounded-full text-base bg-white border border-neutral-200 
                      text-neutral-900 hover:bg-neutral-50 transition-all duration-300
                   "
              >
                View Devices
              </Button>
            </LocalizedClientLink>
          </div>
        </div>

        {/* Right: Modern Image Composition */}
        <div className="flex-1 h-full w-full relative flex items-center justify-center md:justify-end animate-in fade-in zoom-in-95 duration-1000 delay-200 fill-mode-forwards opacity-0">
          <div className="relative w-[90%] md:w-[100%] aspect-[3/4] md:aspect-[4/5] max-h-[80vh]">
            <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-2xl border-[8px] border-white z-10">
              <Image
                src="/hero-lifestyle.png"
                alt="Future Connectivity"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            {/* Decorative backdrop blobs */}
            <div className="absolute top-10 -right-10 w-full h-full bg-blue-200/30 rounded-full blur-3xl -z-0"></div>
            <div className="absolute bottom-10 -left-10 w-2/3 h-2/3 bg-purple-200/30 rounded-full blur-3xl -z-0"></div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Hero
