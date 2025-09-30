"use client"

import { useState } from "react"
import { ImageUploader, ImageFile } from "@/components/image-uploader"
import { Upload, Trash2, Image as ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function ExamplesPage() {
  const [basicImages, setBasicImages] = useState<ImageFile[]>([])
  const [customImages, setCustomImages] = useState<ImageFile[]>([])
  const [compositionImages, setCompositionImages] = useState<ImageFile[]>([])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16 space-y-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Image Uploader Examples
          </h1>
          <p className="text-muted-foreground text-lg">
            Explore different ways to use the composable image uploader
          </p>
        </div>

        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Basic Usage</h2>
            <p className="text-muted-foreground">
              Simple plug-and-play component with controlled state
            </p>
          </div>
          <ImageUploader
            images={basicImages}
            onImagesChange={setBasicImages}
            maxFiles={5}
            className="max-w-3xl mx-auto"
          />
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Custom Styling</h2>
            <p className="text-muted-foreground">
              Override classNames and customize appearance
            </p>
          </div>
          <ImageUploader
            images={customImages}
            onImagesChange={setCustomImages}
            maxFiles={8}
            className="max-w-4xl mx-auto"
          />
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Composition Pattern</h2>
            <p className="text-muted-foreground">
              Build your own layout using composition components
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-6">
            <ImageUploader.Root
              images={compositionImages}
              onImagesChange={setCompositionImages}
            >
              <ImageUploader.Dropzone
                onFileSelect={(files) => {
                  const newImages: ImageFile[] = files.map((file) => ({
                    id: `${Date.now()}-${Math.random()}`,
                    file,
                    preview: URL.createObjectURL(file),
                  }))
                  setCompositionImages([...compositionImages, ...newImages])
                }}
                className="mb-8"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <p className="mb-2 text-base font-semibold">
                    Drop your images here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse
                  </p>
                  <Badge variant="secondary" className="mt-3">
                    <ImageIcon className="w-3 h-3 mr-1" />
                    JPG, PNG, WebP supported
                  </Badge>
                </div>
              </ImageUploader.Dropzone>

              {compositionImages.length > 0 && (
                <>
                  <ImageUploader.Header className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">Your Gallery</h3>
                      <p className="text-sm text-muted-foreground">
                        {compositionImages.length} image{compositionImages.length !== 1 ? "s" : ""} uploaded
                      </p>
                    </div>
                    <Badge variant="outline">
                      Drag to reorder
                    </Badge>
                  </ImageUploader.Header>

                  <ImageUploader.Grid
                    columns={{ default: 3, md: 4, lg: 5 }}
                    className="gap-3"
                  >
                    {compositionImages.map((image) => (
                      <ImageUploader.Item
                        key={image.id}
                        image={image}
                        onDelete={(id) => {
                          const img = compositionImages.find((i) => i.id === id)
                          if (img) URL.revokeObjectURL(img.preview)
                          setCompositionImages(
                            compositionImages.filter((i) => i.id !== id)
                          )
                        }}
                        deleteIcon={Trash2}
                        imageClassName="hover:scale-105 transition-transform"
                        overlayClassName="bg-gradient-to-t from-black/60 to-transparent"
                      />
                    ))}
                  </ImageUploader.Grid>
                </>
              )}
            </ImageUploader.Root>
          </div>
        </section>
      </div>
    </div>
  )
}