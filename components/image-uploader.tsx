"use client";

import React, { useEffect, useId, useRef, useCallback, useState, useMemo } from "react";
import { X, Upload, GripVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  CollisionDetection,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  SortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

/* ----------------------------- Types ---------------------------------- */

export interface ImageFile {
  readonly id: string;
  readonly file: File;
  readonly preview: string; // object URL
}

export interface ErrorPayload {
  readonly code: "FILE_TOO_LARGE" | "INVALID_TYPE" | "MAX_FILES_EXCEEDED" | "UNKNOWN";
  readonly message: string;
  readonly file?: File;
}

export interface ImageUploaderProps {
  readonly images: readonly ImageFile[];
  readonly onImagesChange: (images: ImageFile[]) => void;
  readonly maxFiles?: number;
  readonly maxFileSize?: number; // bytes
  readonly acceptedFileTypes?: string; // e.g. "image/*" or "image/png,image/jpeg"
  readonly disabled?: boolean;
  readonly className?: string;
  readonly multiple?: boolean;
  /**
   * Optional callback for user-visible errors (size/type/rejects).
   */
  readonly onError?: (err: ErrorPayload) => void;
}

interface ImageUploaderRootProps extends Omit<ImageUploaderProps, 'className'> {
  readonly children: React.ReactNode;
  readonly sortingStrategy?: SortingStrategy;
  readonly collisionDetection?: CollisionDetection;
}

interface ImageUploaderDropzoneProps {
  readonly onFileSelect: (files: File[]) => void;
  readonly maxFiles?: number;
  readonly acceptedFileTypes?: string;
  readonly disabled?: boolean;
  readonly multiple?: boolean;
  readonly className?: string;
  readonly children?: React.ReactNode;
  readonly id?: string;
}

interface ImageUploaderGridProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  /**
   * Responsive grid columns configuration using Tailwind classes
   * Example: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
   * Default: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
   */
  readonly columns?: string;
}

interface ImageUploaderItemProps {
  readonly image: ImageFile;
  readonly onDelete?: (id: string) => void;
  readonly className?: string;
  readonly children?: React.ReactNode;
  readonly imageClassName?: string;
  readonly overlayClassName?: string;
  readonly showDragHandle?: boolean;
  readonly showDeleteButton?: boolean;
  readonly dragHandleIcon?: LucideIcon;
  readonly deleteIcon?: LucideIcon;
  readonly onImageClick?: (image: ImageFile) => void;
}

interface ImageUploaderHeaderProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

/* --------------------------- Constants & Helpers ---------------------- */

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_FILENAME_TRUNCATE_LENGTH = 40;
const DEFAULT_GRID_COLUMNS = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

/**
 * Safe URL revocation with error logging
 */
function safeRevokeObjectURL(url: string, onError?: (error: unknown) => void): void {
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn('Failed to revoke object URL:', error);
    onError?.(error);
  }
}

/**
 * Generates a unique ID using crypto.randomUUID with fallback
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Validates if a file type is accepted based on the accept string
 */
function isAcceptedType(file: File, acceptedTypes?: string): boolean {
  if (!acceptedTypes?.trim()) return true;

  const trimmed = acceptedTypes.trim();
  if (trimmed === "image/*") return file.type.startsWith("image/");
  
  const acceptedPatterns = trimmed.split(",").map(s => s.trim().toLowerCase());
  
  return acceptedPatterns.some(pattern => {
    if (pattern === "*/*") return true;
    
    if (pattern.endsWith("/*")) {
      const [type] = pattern.split("/");
      return file.type.startsWith(`${type}/`);
    }
    
    if (pattern.startsWith(".")) {
      return file.name.toLowerCase().endsWith(pattern);
    }
    
    return file.type === pattern;
  });
}

/**
 * Truncates filename for display
 */
function truncateFilename(name: string, maxLength: number = DEFAULT_FILENAME_TRUNCATE_LENGTH): string {
  if (!name || name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 3)}...`;
}

/**
 * Formats file size for error messages
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/* ----------------------------- Hooks ---------------------------------- */

/**
 * Hook for managing object URL lifecycle
 */
function useObjectURLs() {
  const generatedUrlsRef = useRef<Set<string>>(new Set());
  
  const createObjectURL = useCallback((file: File): string => {
    const url = URL.createObjectURL(file);
    generatedUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeObjectURL = useCallback((url: string, onError?: (error: unknown) => void) => {
    if (generatedUrlsRef.current.has(url)) {
      safeRevokeObjectURL(url, onError);
      generatedUrlsRef.current.delete(url);
    }
  }, []);

  const cleanup = useCallback((onError?: (error: unknown) => void) => {
    generatedUrlsRef.current.forEach(url => {
      safeRevokeObjectURL(url, onError);
    });
    generatedUrlsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup(error => console.warn('Cleanup error:', error));
    };
  }, [cleanup]);

  return {
    createObjectURL,
    revokeObjectURL,
    cleanup
  };
}

/**
 * Hook for file validation
 */
function useFileValidation() {
  const validateFile = useCallback((file: File, options: {
    maxFileSize?: number;
    acceptedFileTypes?: string;
  }): { isValid: boolean; error?: ErrorPayload } => {
    const { maxFileSize, acceptedFileTypes } = options;

    if (maxFileSize && file.size > maxFileSize) {
      return {
        isValid: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: `File "${file.name}" exceeds maximum size of ${formatFileSize(maxFileSize)}.`,
          file
        }
      };
    }

    if (!isAcceptedType(file, acceptedFileTypes)) {
      return {
        isValid: false,
        error: {
          code: "INVALID_TYPE",
          message: `File "${file.name}" is not an accepted file type. Accepted: ${acceptedFileTypes}.`,
          file
        }
      };
    }

    return { isValid: true };
  }, []);

  return { validateFile };
}

/* -------------------------- Subcomponents ------------------------------ */

const ImageUploaderContext = {
  Root: function ImageUploaderRoot({
    images,
    onImagesChange,
    children,
    sortingStrategy = rectSortingStrategy,
    collisionDetection = closestCenter,
  }: ImageUploaderRootProps) {
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
      const { active, over } = event;
      
      if (!over || active.id === over.id) return;

      const oldIndex = images.findIndex((item) => item.id === active.id);
      const newIndex = images.findIndex((item) => item.id === over.id);
      
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        onImagesChange(arrayMove([...images], oldIndex, newIndex));
      }
    }, [images, onImagesChange]);

    return (
      <DndContext 
        sensors={sensors} 
        collisionDetection={collisionDetection} 
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={images.map((i) => i.id)} strategy={sortingStrategy}>
          {children}
        </SortableContext>
      </DndContext>
    );
  },

  Dropzone: function ImageUploaderDropzone({
    onFileSelect,
    acceptedFileTypes = "image/*",
    disabled = false,
    multiple = true,
    className,
    children,
    id,
  }: ImageUploaderDropzoneProps) {
    const reactId = useId();
    const inputId = id || `image-uploader-input-${reactId}`;
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      onFileSelect(files);
      
      // Reset input to allow selecting same file again
      e.target.value = "";
    }, [onFileSelect]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (disabled) return;
      
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inputRef.current?.click();
      }
    }, [disabled]);

    const handleClick = useCallback(() => {
      if (disabled) return;
      inputRef.current?.click();
    }, [disabled]);

    return (
      <div className={cn("flex items-center justify-center w-full", className)}>
        <label
          htmlFor={inputId}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          className={cn(
            "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer",
            "bg-muted/50 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          {children || (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-12 h-12 mb-4 text-muted-foreground" aria-hidden="true" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
            </div>
          )}
        </label>
        
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="hidden"
          accept={acceptedFileTypes}
          multiple={multiple}
          onChange={handleFileChange}
          disabled={disabled}
          aria-describedby={children ? undefined : `${inputId}-description`}
        />
        
        {!children && (
          <div id={`${inputId}-description`} className="sr-only">
            Upload image files. Accepted types: {acceptedFileTypes}
          </div>
        )}
      </div>
    );
  },

  Grid: function ImageUploaderGrid({
    children,
    className,
    columns = DEFAULT_GRID_COLUMNS,
  }: ImageUploaderGridProps) {
    return (
      <div 
        className={cn(
          "grid gap-4",
          columns, // Use the responsive column classes
          className
        )}
        role="list"
        aria-label="Uploaded images"
      >
        {children}
      </div>
    );
  },

  Item: function ImageUploaderItem({
    image,
    onDelete,
    className,
    children,
    imageClassName,
    overlayClassName,
    showDragHandle = true,
    showDeleteButton = true,
    dragHandleIcon: DragHandleIcon = GripVertical,
    deleteIcon: DeleteIcon = X,
    onImageClick,
  }: ImageUploaderItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: image.id,
    });

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.55 : 1,
      touchAction: "manipulation",
    };

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (onImageClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onImageClick(image);
      }
    }, [onImageClick, image]);

    const handleDelete = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(image.id);
    }, [onDelete, image.id]);

    const rootAttributes = showDragHandle ? {} : { ...attributes, ...listeners };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative group cursor-grab active:cursor-grabbing",
          isDragging && "z-10",
          className
        )}
        {...rootAttributes}
        role="listitem"
        aria-label={truncateFilename(image.file?.name || "Uploaded image")}
      >
        <Card className="overflow-hidden h-full">
          <div 
            className="relative aspect-video"
            {...(showDragHandle ? {} : listeners)}
            {...(showDragHandle ? {} : attributes)}
          >
            {/* Drag Handle */}
            {showDragHandle && (
              <div
                className="absolute top-2 left-2 z-20 p-1 bg-background/80 rounded cursor-grab active:cursor-grabbing"
                {...listeners}
                {...attributes}
                role="button"
                aria-label="Drag to reorder"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Let dnd-kit handle the drag
                  }
                }}
              >
                <DragHandleIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {/* Image */}
            <img
              src={image.preview}
              alt={truncateFilename(image.file?.name || "Uploaded image")}
              className={cn(
                "w-full h-full object-cover aspect-video",
                onImageClick && "cursor-pointer",
                imageClassName
              )}
              onClick={() => onImageClick?.(image)}
              onKeyDown={handleKeyDown}
              tabIndex={onImageClick ? 0 : -1}
              role={onImageClick ? "button" : "img"}
            />

            {/* Overlay with delete button */}
            <div
              className={cn(
                "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end gap-2 p-2",
                overlayClassName
              )}
            >
              <div className="flex items-center gap-2">
                {showDeleteButton && onDelete && (
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label={`Remove ${truncateFilename(image.file?.name || "image")}`}
                    onClick={handleDelete}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <DeleteIcon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          {children}
        </Card>
      </div>
    );
  },

  Header: function ImageUploaderHeader({ children, className }: ImageUploaderHeaderProps) {
    return <div className={cn("mb-4", className)}>{children}</div>;
  },
};

/* -------------------------- Main Component ----------------------------- */

export function ImageUploader({
  images,
  onImagesChange,
  maxFiles,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedFileTypes = "image/*",
  disabled = false,
  className,
  multiple = true,
  onError,
}: ImageUploaderProps) {
  const { createObjectURL, revokeObjectURL, cleanup } = useObjectURLs();
  const { validateFile } = useFileValidation();

  // Track generated previews for proper cleanup
  const generatedPreviewsRef = useRef<Set<string>>(new Set());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup(error => {
        onError?.({
          code: "UNKNOWN",
          message: "Failed to clean up image previews",
        });
      });
    };
  }, [cleanup, onError]);

  const handleFileSelect = useCallback((files: File[]) => {
    if (!files.length || disabled) return;

    // Validate files
    const validFiles: File[] = [];
    const errors: ErrorPayload[] = [];

    files.forEach(file => {
      const validation = validateFile(file, { maxFileSize, acceptedFileTypes });
      
      if (validation.isValid) {
        validFiles.push(file);
      } else if (validation.error) {
        errors.push(validation.error);
      }
    });

    // Report validation errors
    errors.forEach(error => onError?.(error));
    if (!validFiles.length) return;

    // Enforce max files limit
    const currentCount = images.length;
    const remainingSlots = maxFiles ? Math.max(0, maxFiles - currentCount) : Infinity;
    
    if (remainingSlots <= 0) {
      onError?.({
        code: "MAX_FILES_EXCEEDED",
        message: `Maximum of ${maxFiles} files allowed.`,
      });
      return;
    }

    let filesToAdd = validFiles;
    if (validFiles.length > remainingSlots) {
      filesToAdd = validFiles.slice(0, remainingSlots);
      onError?.({
        code: "MAX_FILES_EXCEEDED",
        message: `Only ${remainingSlots} of ${validFiles.length} files were added due to limit of ${maxFiles}.`,
      });
    }

    // Create new image objects
    const newImages: ImageFile[] = filesToAdd.map(file => {
      const preview = createObjectURL(file);
      return { id: generateId(), file, preview };
    });

    // Update parent
    onImagesChange([...images, ...newImages]);
  }, [
    images,
    onImagesChange,
    maxFiles,
    maxFileSize,
    acceptedFileTypes,
    disabled,
    onError,
    validateFile,
    createObjectURL
  ]);

  const handleDelete = useCallback((id: string) => {
    const imageToDelete = images.find(img => img.id === id);
    if (imageToDelete) {
      revokeObjectURL(imageToDelete.preview, error => {
        onError?.({
          code: "UNKNOWN",
          message: "Failed to clean up image preview",
        });
      });
    }
    onImagesChange(images.filter(img => img.id !== id));
  }, [images, onImagesChange, revokeObjectURL, onError]);

  const isDropzoneDisabled = disabled || (maxFiles ? images.length >= maxFiles : false);

  return (
    <div className={cn("w-full max-w-4xl mx-auto space-y-6", className)}>
      <ImageUploaderContext.Root images={images} onImagesChange={onImagesChange}>
        <ImageUploaderContext.Dropzone
          onFileSelect={handleFileSelect}
          acceptedFileTypes={acceptedFileTypes}
          disabled={isDropzoneDisabled}
          multiple={multiple}
        />

        {images.length > 0 && (
          <div>
            <ImageUploaderContext.Header>
              <h2 className="text-lg font-semibold">
                Uploaded Images ({images.length}
                {maxFiles && `/${maxFiles}`})
              </h2>
            </ImageUploaderContext.Header>

            <ImageUploaderContext.Grid
              // You can customize the grid columns here
              // columns="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
            >
              {images.map((image) => (
                <ImageUploaderContext.Item
                  key={image.id}
                  image={image}
                  onDelete={handleDelete}
                  showDragHandle={!disabled}
                  showDeleteButton={!disabled}
                />
              ))}
            </ImageUploaderContext.Grid>
          </div>
        )}
      </ImageUploaderContext.Root>
    </div>
  );
}

/* ---------------------- Named Exports ------------------------- */

ImageUploader.Root = ImageUploaderContext.Root;
ImageUploader.Dropzone = ImageUploaderContext.Dropzone;
ImageUploader.Grid = ImageUploaderContext.Grid;
ImageUploader.Item = ImageUploaderContext.Item;
ImageUploader.Header = ImageUploaderContext.Header;

// Export default grid configuration for easy customization
ImageUploader.DEFAULT_GRID_COLUMNS = DEFAULT_GRID_COLUMNS;

export default ImageUploader;