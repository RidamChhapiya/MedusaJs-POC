import { Metadata } from "next"

import Hero from "@modules/home/components/hero"
import FeatureSection from "@modules/home/components/feature-section"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import FeaturedProducts from "@modules/home/components/featured-products"

export const metadata: Metadata = {
  title: "Medusa Telecom - Future Connected",
  description:
    "Experience the next generation of telecom with high-speed 5G plans, instant recharge, and premium gear.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  return (
    <main className="bg-white">
      <Hero />

      <div className="space-y-0">

        {/* Feature 1: Get Connected (Uses default Hero Image context or we can reuse/add another) 
            Wait, I need a specific image for PLANS if possible, but hero-lifestyle.png works. 
            Let's use a subtle pattern or maybe no image for the first if we want, OR reuse hero-lifestyle differently?
            Actually I don't have a "feature_plans.png". 
            I'll use "hero-lifestyle.png" again or generate one? 
            I have 4 images: hero, recharge, gear, business.
            "Get Connected" -> I can use the same hero one or wait... 
            I'll use "feature-business.png" for Business.
            "Get Connected" -> I'll use the Hero image but cropped? Or just skip "Get Connected" block and let Hero be it?
            The Hero IS "Get Connected". 
            So I will start with "Instant Recharge".
        */}

        {/* Feature 2: Instant Recharge */}
        <section className="bg-neutral-50 border-y border-neutral-100">
          <FeatureSection
            title="Instant Recharge"
            description="Top up in seconds. Smart automation keeps you connected without interruption. Validated security with every transaction."
            linkText="Recharge Now"
            href="/recharge"
            imageSrc="/feature-recharge.png"
          />
        </section>

        {/* Feature 3: Gear */}
        <section className="bg-white">
          <FeatureSection
            title="Premium Gear"
            description="Curated selection of the world's finest mobile technology. Smartphones, wearables, and audio—engineered for excellence."
            linkText="Shop Devices"
            href="/store"
            reversed={true}
            imageSrc="/feature-gear.png"
          />
        </section>

        {/* Feature 4: Business */}
        <section className="bg-neutral-50 border-t border-neutral-100">
          <FeatureSection
            title="Enterprise Solutions"
            description="Empower your workforce with scalable connectivity. Dedicated account management and fleet dashboards."
            linkText="For Business"
            href="/business"
            imageSrc="/feature-business.png"
          />
        </section>

        {/* Trending */}
        <div className="py-32 px-6 content-container bg-white">
          <div className="mb-20 text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-neutral-900">Trending Now</h2>
            <p className="text-neutral-500 font-light text-lg">Community favorites and new arrivals</p>
          </div>
          <ul className="flex flex-col gap-x-6 gap-y-12">
            <FeaturedProducts collections={collections} region={region} />
          </ul>
        </div>
      </div>
    </main>
  )
}
