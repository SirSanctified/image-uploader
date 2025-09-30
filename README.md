# ImageUploader Component Documentation

## Overview

A robust, accessible, and feature-rich image uploader component built with React, TypeScript, and Tailwind CSS. Supports drag-and-drop, file validation, image previews, and drag-to-reorder functionality.

## Features

- 🖼️ **Drag & Drop** - Intuitive file upload with drag-and-drop support
- 📱 **Fully Responsive** - Adapts to all screen sizes with customizable grid layouts
- ♿ **Accessible** - WCAG compliant with keyboard navigation and ARIA labels
- 🛡️ **Type Safe** - Full TypeScript support with comprehensive type definitions
- 📏 **File Validation** - Size and type validation with custom error handling
- 🔄 **Drag to Reorder** - Reorder images with smooth drag-and-drop
- 💾 **Memory Efficient** - Proper object URL management to prevent memory leaks
- 🎨 **Customizable** - Flexible styling and icon customization
- 🧩 **Composable** - Use subcomponents to build custom layouts

## Installation

### Prerequisites

Ensure you have the required dependencies:

```bash
npm install lucide-react @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Component Structure

```
src/
├── components/
│   └── ui/
│       └── image-uploader.tsx
├── hooks/
│   ├── useObjectURLs.ts
│   └── useFileValidation.ts
└── utils/
    └── imageUploaderUtils.ts
```

## Usage

### Basic Usage

```tsx
import { useState } from 'react';
import { ImageUploader, ImageFile } from '@/components/ui/image-uploader';

function MyComponent() {
  const [images, setImages] = useState<ImageFile[]>([]);

  return (
    <ImageUploader
      images={images}
      onImagesChange={setImages}
      maxFiles={10}
      maxFileSize={5 * 1024 * 1024} // 5MB
      acceptedFileTypes="image/png,image/jpeg,image/webp"
      onError={(error) => console.error('Upload error:', error)}
    />
  );
}
```

### Advanced Usage with Custom Layout

```tsx
import { ImageUploader } from '@/components/ui/image-uploader';

function CustomUploader() {
  const [images, setImages] = useState<ImageFile[]>([]);

  return (
    <ImageUploader.Root images={images} onImagesChange={setImages}>
      <ImageUploader.Header>
        <h2>Custom Header</h2>
        <p>Upload your product images</p>
      </ImageUploader.Header>
      
      <ImageUploader.Dropzone
        onFileSelect={(files) => {/* Custom handling */}}
        className="border-2 border-blue-300"
      >
        <div className="text-center">
          <Upload className="w-16 h-16 mx-auto mb-4" />
          <p>Custom dropzone content</p>
        </div>
      </ImageUploader.Dropzone>

      {images.length > 0 && (
        <ImageUploader.Grid columns="grid-cols-1 md:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <ImageUploader.Item
              key={image.id}
              image={image}
              onDelete={(id) => setImages(prev => prev.filter(img => img.id !== id))}
              showDragHandle={true}
              onImageClick={(image) => openPreview(image)}
              imageClassName="rounded-lg"
              overlayClassName="bg-blue-500/30"
            />
          ))}
        </ImageUploader.Grid>
      )}
    </ImageUploader.Root>
  );
}
```

## API Reference

### Main Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `images` | `ImageFile[]` | **Required** | Array of current images |
| `onImagesChange` | `(images: ImageFile[]) => void` | **Required** | Callback when images change |
| `maxFiles` | `number` | `undefined` | Maximum number of files allowed |
| `maxFileSize` | `number` | `10 * 1024 * 1024` | Maximum file size in bytes |
| `acceptedFileTypes` | `string` | `"image/*"` | Accept attribute for file input |
| `disabled` | `boolean` | `false` | Disable all interactions |
| `className` | `string` | `undefined` | Additional CSS classes |
| `multiple` | `boolean` | `true` | Allow multiple file selection |
| `onError` | `(error: ErrorPayload) => void` | `undefined` | Error callback |

### ImageFile Interface

```typescript
interface ImageFile {
  readonly id: string;
  readonly file: File;
  readonly preview: string; // object URL
}
```

### ErrorPayload Interface

```typescript
interface ErrorPayload {
  readonly code: "FILE_TOO_LARGE" | "INVALID_TYPE" | "MAX_FILES_EXCEEDED" | "UNKNOWN";
  readonly message: string;
  readonly file?: File;
}
```

## Subcomponents

### ImageUploader.Root

The container component that provides drag-and-drop context.

```tsx
<ImageUploader.Root
  images={images}
  onImagesChange={setImages}
  sortingStrategy={rectSortingStrategy}
  collisionDetection={closestCenter}
>
  {/* children */}
</ImageUploader.Root>
```

### ImageUploader.Dropzone

The file upload area with drag-and-drop support.

```tsx
<ImageUploader.Dropzone
  onFileSelect={(files) => handleFiles(files)}
  acceptedFileTypes="image/*"
  disabled={false}
  multiple={true}
  className="custom-class"
  id="custom-id"
>
  {/* Custom dropzone content */}
</ImageUploader.Dropzone>
```

### ImageUploader.Grid

Responsive grid container for uploaded images.

```tsx
<ImageUploader.Grid
  columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
  className="gap-6"
>
  {/* Image items */}
</ImageUploader.Grid>
```

**Common Grid Patterns:**
```tsx
// Mobile-first scaling
columns="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"

// Thumbnail gallery
columns="grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"

// Minimal on mobile
columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

### ImageUploader.Item

Individual image item with delete and drag handles.

```tsx
<ImageUploader.Item
  image={image}
  onDelete={(id) => handleDelete(id)}
  showDragHandle={true}
  showDeleteButton={true}
  dragHandleIcon={CustomGripIcon}
  deleteIcon={CustomDeleteIcon}
  onImageClick={(image) => handlePreview(image)}
  imageClassName="rounded-xl"
  overlayClassName="bg-black/50"
/>
```

### ImageUploader.Header

Container for header content.

```tsx
<ImageUploader.Header className="border-b pb-4">
  <h2>Uploaded Images</h2>
  <p>Manage your image gallery</p>
</ImageUploader.Header>
```

## Hooks

### useObjectURLs

Manages object URL lifecycle to prevent memory leaks.

```typescript
import { useObjectURLs } from '@/hooks/useObjectURLs';

function MyComponent() {
  const { createObjectURL, revokeObjectURL, cleanup } = useObjectURLs();

  // Create URL for file upload preview
  const previewUrl = createObjectURL(file);

  // Revoke when no longer needed
  revokeObjectURL(previewUrl);

  // Cleanup all URLs (automatically called on unmount)
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
}
```

### useFileValidation

Provides file validation utilities.

```typescript
import { useFileValidation } from '@/hooks/useFileValidation';

function MyComponent() {
  const { validateFile } = useFileValidation();

  const handleFile = (file: File) => {
    const result = validateFile(file, {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      acceptedFileTypes: 'image/jpeg,image/png'
    });

    if (!result.isValid) {
      console.error(result.error);
      return;
    }

    // Process valid file
  };
}
```

## Utilities

### imageUploaderUtils

```typescript
import { 
  safeRevokeObjectURL,
  generateId,
  isAcceptedType,
  truncateFilename,
  formatFileSize 
} from '@/utils/imageUploaderUtils';

// Safely revoke object URLs
safeRevokeObjectURL(url, (error) => console.warn(error));

// Generate unique IDs
const id = generateId();

// Check file type
const isValid = isAcceptedType(file, 'image/jpeg,image/png');

// Format filenames for display
const displayName = truncateFilename('very-long-filename.jpg', 30);

// Format file sizes
const sizeText = formatFileSize(1024); // "1 KB"
```

## Error Handling

The component provides comprehensive error handling through the `onError` callback:

```typescript
const handleError = (error: ErrorPayload) => {
  switch (error.code) {
    case 'FILE_TOO_LARGE':
      toast.error(`File too large: ${error.message}`);
      break;
    case 'INVALID_TYPE':
      toast.error(`Invalid file type: ${error.message}`);
      break;
    case 'MAX_FILES_EXCEEDED':
      toast.error(`Maximum files exceeded: ${error.message}`);
      break;
    case 'UNKNOWN':
      console.error('Unknown error:', error.message);
      break;
  }
};

<ImageUploader onError={handleError} />
```

## Accessibility

### Keyboard Navigation
- **Dropzone**: Accessible via `Tab`, activate with `Enter` or `Space`
- **Image Items**: Navigate with `Tab`, activate click handlers with `Enter` or `Space`
- **Drag Handles**: Focusable with `Tab`, activate drag with `Enter` or `Space`
- **Delete Buttons**: Focusable with `Tab`, activate with `Enter` or `Space`

### Screen Readers
- Proper ARIA labels and roles
- Descriptive alt text for images
- Status announcements for drag operations
- Error messages communicated to assistive technology

### Focus Management
- Focus remains within the component during interactions
- Logical tab order
- Visible focus indicators

## Performance Considerations

### Memory Management
- Object URLs are automatically revoked when components unmount
- Preview cleanup happens when images are deleted
- No memory leaks from abandoned object URLs

### Optimization
- Callbacks are memoized with `useCallback`
- Expensive operations are optimized
- Drag-and-drop operations are smooth and performant

## Browser Support

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

Requires support for:
- `URL.createObjectURL()` and `URL.revokeObjectURL()`
- `crypto.randomUUID()` (with fallback)
- CSS Grid
- Pointer Events

## Common Patterns

### Custom File Validation

```typescript
const { validateFile } = useFileValidation();

const customValidate = (file: File) => {
  const baseValidation = validateFile(file, {
    maxFileSize: 10 * 1024 * 1024,
    acceptedFileTypes: 'image/*'
  });

  if (!baseValidation.isValid) {
    return baseValidation;
  }

  // Custom validation
  if (file.name.includes('invalid')) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_TYPE',
        message: 'File name contains invalid pattern',
        file
      }
    };
  }

  return { isValid: true };
};
```

### Integration with Form Libraries

```tsx
import { useForm } from 'react-hook-form';

function FormWithUploader() {
  const { setValue, watch } = useForm();
  const images = watch('images') || [];

  const handleImagesChange = (newImages: ImageFile[]) => {
    setValue('images', newImages, { shouldValidate: true });
  };

  return (
    <form>
      <ImageUploader
        images={images}
        onImagesChange={handleImagesChange}
        maxFiles={5}
      />
    </form>
  );
}
```

### Custom Image Preview

```tsx
<ImageUploader.Item
  image={image}
  onDelete={handleDelete}
  overlayClassName="bg-gradient-to-t from-black/80 via-transparent to-transparent"
>
  <div className="absolute bottom-2 left-2 text-white text-sm">
    {truncateFilename(image.file.name)}
  </div>
</ImageUploader.Item>
```

## Troubleshooting

### Common Issues

1. **Memory Leaks**
   - Ensure you're using the latest version with proper cleanup
   - Check that `onImagesChange` is properly updating state

2. **Drag-and-Drop Not Working**
   - Verify `@dnd-kit` dependencies are installed
   - Check that sensors are properly configured

3. **Images Not Displaying**
   - Verify file types are accepted
   - Check browser support for object URLs
   - Ensure proper CORS configuration if loading external images

4. **TypeScript Errors**
   - Ensure all required props are provided
   - Check that types are properly imported

### Debugging

Enable detailed logging by passing an error handler:

```tsx
<ImageUploader
  onError={(error) => {
    console.group('ImageUploader Error');
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    console.log('File:', error.file);
    console.groupEnd();
  }}
/>
```

## Contributing

When contributing to this component:

1. **Follow TypeScript best practices** - Use strict typing and avoid `any`
2. **Maintain accessibility** - All interactions must be keyboard accessible
3. **Test memory management** - Ensure no object URL leaks
4. **Update documentation** - Keep examples and API reference current
5. **Consider performance** - Optimize re-renders and expensive operations
