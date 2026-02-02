"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { createPortal } from "react-dom"

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.5

type LightboxProps = {
  images: { id: string; url: string }[]
  initialIndex: number
  onClose: () => void
}

export default function Lightbox({
  images,
  initialIndex,
  onClose,
}: LightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const currentImage = images[index]

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [index])

  const clampPan = useCallback((x: number, y: number, scale: number) => {
    const max = 50 * scale
    return {
      x: Math.max(-max, Math.min(max, x)),
      y: Math.max(-max, Math.min(max, y)),
    }
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, z - ZOOM_STEP)
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 })
      return next
    })
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (e.deltaY < 0) {
        setZoom((z) => Math.min(MAX_ZOOM, z + 0.2))
      } else {
        setZoom((z) => {
          const next = Math.max(MIN_ZOOM, z - 0.2)
          if (next === MIN_ZOOM) setPan({ x: 0, y: 0 })
          return next
        })
      }
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= MIN_ZOOM) return
      e.preventDefault()
      setIsDragging(true)
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      }
    },
    [zoom, pan.x, pan.y]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || zoom <= MIN_ZOOM) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      const clamped = clampPan(
        dragStart.current.panX + dx,
        dragStart.current.panY + dy,
        zoom
      )
      setPan(clamped)
    },
    [isDragging, zoom, clampPan]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft")
        setIndex((i) => (i > 0 ? i - 1 : images.length - 1))
      if (e.key === "ArrowRight")
        setIndex((i) => (i < images.length - 1 ? i + 1 : 0))
    },
    [images.length, onClose]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const goPrev = () =>
    setIndex((i) => (i > 0 ? i - 1 : images.length - 1))
  const goNext = () =>
    setIndex((i) => (i < images.length - 1 ? i + 1 : 0))

  const content = (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Top bar: close + zoom */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white/80 text-sm">
          {index + 1} / {images.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-white/80 text-sm min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom in"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors ml-2"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image area with pan/zoom */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{ touchAction: "none" }}
      >
        {currentImage?.url && (
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isDragging ? "none" : "transform 0.2s ease-out",
            }}
          >
            <Image
              src={currentImage.url}
              alt={`Product image ${index + 1}`}
              width={1200}
              height={1200}
              className="max-w-full max-h-[calc(100vh-120px)] w-auto h-auto object-contain select-none"
              draggable={false}
              unoptimized={currentImage.url.startsWith("http")}
              priority
            />
          </div>
        )}

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto justify-center border-t border-white/10">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => {
                setIndex(i)
                setZoom(1)
                setPan({ x: 0, y: 0 })
              }}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {img.url && (
                <Image
                  src={img.url}
                  alt=""
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(content, document.body)
}
