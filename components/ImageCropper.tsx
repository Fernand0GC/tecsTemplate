
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CropArea, ImageDimensions } from '../types';

interface ImageCropperProps {
  imageSrc: string;
  onCropChange: (crop: CropArea, dimensions: ImageDimensions) => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropChange }) => {
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, size: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImageDimensions(null);
  }, [imageSrc]);

  const initializeCrop = useCallback((img: HTMLImageElement) => {
    const container = containerRef.current;
    if (!container) return;

    setTimeout(() => {
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const { naturalWidth, naturalHeight } = img;

      if (naturalWidth === 0 || containerWidth === 0) return;

      const naturalAspectRatio = naturalWidth / naturalHeight;
      const containerAspectRatio = containerWidth / containerHeight;

      let displayWidth, displayHeight;
      if (naturalAspectRatio > containerAspectRatio) {
        displayWidth = containerWidth;
        displayHeight = containerWidth / naturalAspectRatio;
      } else {
        displayHeight = containerHeight;
        displayWidth = containerHeight * naturalAspectRatio;
      }

      const dims = { width: displayWidth, height: displayHeight, aspectRatio: naturalAspectRatio };
      setImageDimensions(dims);

      const cropSize = Math.min(displayWidth, displayHeight);
      const initialCrop = {
        x: (displayWidth - cropSize) / 2,
        y: (displayHeight - cropSize) / 2,
        size: cropSize,
      };
      setCrop(initialCrop);
      onCropChange(initialCrop, dims);
    }, 0);
  }, [onCropChange]);

  const getPointerPosition = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!imageWrapperRef.current) return;
    const rect = imageWrapperRef.current.getBoundingClientRect();
    const pos = getPointerPosition(e);
    setIsDragging(true);
    setDragStart({ x: pos.x - rect.left - crop.x, y: pos.y - rect.top - crop.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !imageDimensions || !imageWrapperRef.current) return;
    const rect = imageWrapperRef.current.getBoundingClientRect();
    const pos = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

    let newX = pos.x - rect.left - dragStart.x;
    let newY = pos.y - rect.top - dragStart.y;
    
    if (imageDimensions.width > imageDimensions.height) { // horizontal image
      newY = crop.y;
      newX = Math.max(0, Math.min(newX, imageDimensions.width - crop.size));
    } else { // vertical or square image
      newX = crop.x;
      newY = Math.max(0, Math.min(newY, imageDimensions.height - crop.size));
    }

    const newCrop = { ...crop, x: newX, y: newY };
    setCrop(newCrop);
    onCropChange(newCrop, imageDimensions);
  }, [isDragging, dragStart, crop, imageDimensions, onCropChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('touchend', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-4xl mx-auto touch-none bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center"
      style={{ aspectRatio: '16/9' }}
    >
      <img src={imageSrc} onLoad={e => initializeCrop(e.currentTarget)} style={{ display: 'none' }} alt="" />

      {imageDimensions && (
        <div ref={imageWrapperRef} className="relative" style={{ width: imageDimensions.width, height: imageDimensions.height }}>
          <img
            src={imageSrc}
            alt="To be cropped"
            className="pointer-events-none w-full h-full"
          />
          <div
            className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50"
            style={{
              clipPath: `path('M0 0 H${imageDimensions.width} V${imageDimensions.height} H0 Z M${crop.x} ${crop.y} H${crop.x + crop.size} V${crop.y + crop.size} H${crop.x} Z')`,
            }}
          />
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            className="absolute border-2 border-dashed border-white cursor-move"
            style={{
              left: crop.x,
              top: crop.y,
              width: crop.size,
              height: crop.size,
            }}
          />
        </div>
      )}
    </div>
  );
};
