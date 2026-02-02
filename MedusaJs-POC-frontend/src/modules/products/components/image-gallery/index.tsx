"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useState } from "react"
import Lightbox from "./lightbox"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const imageList = images?.filter((img) => img?.url) ?? []
  if (imageList.length === 0) return null

  return (
    <div className="flex items-start relative">
      <div className="flex flex-col flex-1 small:mx-16 gap-y-4">
        {imageList.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => openLightbox(index)}
            className="relative aspect-[29/34] w-full overflow-hidden rounded-xl bg-ui-bg-subtle shadow-sm ring-1 ring-ui-border-base text-left cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-ui-focus-base focus:ring-offset-2"
            aria-label={`View image ${index + 1} full size`}
          >
            <Image
              src={image.url!}
              priority={index <= 2}
              className="absolute inset-0 rounded-xl object-cover transition-transform duration-300 ease-out hover:scale-105"
              alt={`Product image ${index + 1}`}
              fill
              sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
            />
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <Lightbox
          images={imageList.map((img) => ({ id: img.id!, url: img.url! }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}

export default ImageGallery
