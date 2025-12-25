import { useState, useRef } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { getImageUrl } from '../../lib/utils';

export function ImageUpload({
  value,
  onChange,
  folder = 'general',
  imageType = null,
  multiple = false,
  maxFiles = 5,
  label = 'Upload Image',
  description = 'Upload an image file (any size - will be automatically optimized)',
  className = '',
  accept = 'image/*'
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    // Validate file count
    if (multiple) {
      const currentCount = Array.isArray(value) ? value.length : 0;
      if (currentCount + fileList.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }
    } else if (fileList.length > 1) {
      toast.error('Only one file allowed');
      return;
    }

    // Validate file types only (no size restriction)
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
    }

    setUploading(true);
    try {
      if (multiple && fileList.length > 1) {
        // Upload multiple files
        const formData = new FormData();
        fileList.forEach(file => formData.append('files', file));
        formData.append('folder', folder);
        if (imageType) formData.append('image_type', imageType);

        const response = await api.post('/upload/multiple', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const newUrls = response.data.files.map(f => f.url);
        const currentUrls = Array.isArray(value) ? value : [];
        onChange([...currentUrls, ...newUrls]);

        toast.success(`${newUrls.length} images uploaded and optimized successfully`);
      } else {
        // Upload single file
        const formData = new FormData();
        formData.append('file', fileList[0]);
        formData.append('folder', folder);
        if (imageType) formData.append('image_type', imageType);

        const response = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (multiple) {
          const currentUrls = Array.isArray(value) ? value : [];
          onChange([...currentUrls, response.data.url]);
        } else {
          onChange(response.data.url);
        }

        toast.success('Image uploaded and optimized successfully');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (urlToRemove) => {
    try {
      // Delete from server
      await api.delete('/upload/delete', {
        params: { file_url: urlToRemove }
      });

      // Update state
      if (multiple) {
        const currentUrls = Array.isArray(value) ? value : [];
        onChange(currentUrls.filter(url => url !== urlToRemove));
      } else {
        onChange('');
      }

      toast.success('Image removed successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove image');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const currentImages = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []);
  const canUploadMore = multiple ? currentImages.length < maxFiles : currentImages.length === 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {label && <Label>{label}</Label>}

      {/* Upload Area */}
      {canUploadMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${dragOver
              ? 'border-primary bg-primary/5'
              : 'border-slate-300 hover:border-primary hover:bg-slate-50'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          )}
        </div>
      )}

      {/* Image Preview */}
      {currentImages.length > 0 && (
        <div className={`grid gap-4 ${multiple ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
          {currentImages.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                <img
                  src={getImageUrl(imageUrl)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAxMDBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
                  }}
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(imageUrl)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload More Button (for multiple) */}
      {multiple && currentImages.length > 0 && canUploadMore && (
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload More Images ({currentImages.length}/{maxFiles})
        </Button>
      )}
    </div>
  );
}

// Single Image Upload Component
export function SingleImageUpload(props) {
  return <ImageUpload {...props} multiple={false} />;
}

// Multiple Image Upload Component
export function MultipleImageUpload(props) {
  return <ImageUpload {...props} multiple={true} />;
}