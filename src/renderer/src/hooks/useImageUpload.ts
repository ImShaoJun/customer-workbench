import { useState, useCallback } from 'react';
import { LogFile } from '../types';

const TEXT_FILE_EXTENSIONS = ['.txt', '.log', '.csv', '.json', '.xml', '.yaml', '.yml', '.md', '.conf', '.cfg', '.ini', '.properties', '.out', '.err'];

function isTextFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true;
  const lower = file.name.toLowerCase();
  return TEXT_FILE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export function useImageUpload() {
  const [images, setImages] = useState<string[]>([]); // Base64 strings
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);

  const readFiles = async (files: FileList | File[]) => {
    const newImages: string[] = [];
    const newLogFiles: LogFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const base64 = await convertToBase64(file);
        newImages.push(base64 as string);
      } else if (isTextFile(file)) {
        const content = await readTextFile(file);
        newLogFiles.push({ name: file.name, content });
      }
    }
    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
    if (newLogFiles.length > 0) {
      setLogFiles(prev => [...prev, ...newLogFiles]);
    }
  };

  // Only prevent default when there are actual files to handle; let text paste fall through to the textarea
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      await readFiles(e.clipboardData.files);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await readFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await readFiles(e.target.files);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeLogFile = useCallback((index: number) => {
    setLogFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => setImages([]), []);

  const clearLogFiles = useCallback(() => setLogFiles([]), []);

  const clearAll = useCallback(() => {
    setImages([]);
    setLogFiles([]);
  }, []);

  return {
    images,
    logFiles,
    handlePaste,
    handleDrop,
    handleFileSelect,
    removeImage,
    removeLogFile,
    clearImages,
    clearLogFiles,
    clearAll
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

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file, 'utf-8');
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
