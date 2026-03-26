import { useState, useCallback } from 'react';

export function useImageUpload() {
  const [images, setImages] = useState<string[]>([]); // Base64 strings

  const readImageFiles = async (files: FileList | File[]) => {
    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const base64 = await convertToBase64(file);
        newImages.push(base64 as string);
      }
    }
    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (e.clipboardData.files.length > 0) {
      await readImageFiles(e.clipboardData.files);
    } else {
      // Allow fallback to input text paste if not handled specifically by input components
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await readImageFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await readImageFiles(e.target.files);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => setImages([]), []);

  return {
    images,
    handlePaste,
    handleDrop,
    handleFileSelect,
    removeImage,
    clearImages
  };
}

function convertToBase64(file: File): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
