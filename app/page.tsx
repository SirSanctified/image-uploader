"use client"

import { useState } from "react"
import { ImageUploader, ImageFile } from "@/components/image-uploader"

export default function Home() {
  const [images, setImages] = useState<ImageFile[]>([])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Image Uploader
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload, preview, sort, and manage your images
          </p>
        </div>
        <ImageUploader images={images} onImagesChange={setImages} maxFiles={10} />
      </div>
    </div>
  )
}
