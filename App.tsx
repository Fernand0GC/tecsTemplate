
import React, { useState, useCallback, useRef } from 'react';
import { TEMPLATES, CROP_SIZE } from './constants';
import { CropArea, ImageDimensions } from './types';
import { ImageCropper } from './components/ImageCropper';
import { Icon } from './components/Icon';

type AppState = 'UPLOADING' | 'CROPPING' | 'GENERATED';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('UPLOADING');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].url);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cropAreaRef = useRef<CropArea | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const displayedImageDimensionsRef = useRef<ImageDimensions | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          originalImageRef.current = img;
          setImageSrc(result);
          setAppState('CROPPING');
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropChange = useCallback((crop: CropArea, dimensions: ImageDimensions) => {
    cropAreaRef.current = crop;
    displayedImageDimensionsRef.current = dimensions;
  }, []);

  const handleGenerate = async () => {
    if (!originalImageRef.current || !cropAreaRef.current || !displayedImageDimensionsRef.current) {
      setError('Missing image or crop information.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setFinalImage(null);

    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const originalImage = originalImageRef.current;
      const crop = cropAreaRef.current;
      const displayDimensions = displayedImageDimensionsRef.current;

      const scaleX = originalImage.naturalWidth / displayDimensions.width;

      const sourceX = crop.x * scaleX;
      const sourceY = crop.y * scaleX; // Use scaleX for both as it's a square crop
      const sourceSize = crop.size * scaleX;

      const canvas = document.createElement('canvas');
      canvas.width = CROP_SIZE;
      canvas.height = CROP_SIZE;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context.');
      }

      ctx.drawImage(
        originalImage,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        CROP_SIZE,
        CROP_SIZE
      );

      const templateImage = new Image();
      templateImage.crossOrigin = "anonymous";
      templateImage.src = selectedTemplate;

      await new Promise((resolve, reject) => {
        templateImage.onload = resolve;
        templateImage.onerror = reject;
      });

      ctx.drawImage(templateImage, 0, 0, CROP_SIZE, CROP_SIZE);

      setFinalImage(canvas.toDataURL('image/png'));
      setAppState('GENERATED');

    } catch (e) {
      console.error('Error generating image:', e);
      setError('Could not generate the image. The template might be unavailable or blocked by CORS policy.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAppState('UPLOADING');
    setImageSrc(null);
    setFinalImage(null);
    setError(null);
    setIsLoading(false);
    originalImageRef.current = null;
    cropAreaRef.current = null;
    displayedImageDimensionsRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderContent = () => {
    switch (appState) {
      case 'UPLOADING':
        return (
          <div className="flex flex-col items-center justify-center w-full max-w-lg p-8 mx-auto border-2 border-dashed rounded-lg border-gray-600 hover:border-indigo-500 transition-colors">
            <Icon icon="upload" className="w-16 h-16 text-gray-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Cargar Imagen</h2>
            <p className="text-gray-400 mb-6 text-center">presiona el boton o arrastra y suelta una imagen aqui</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="px-6 py-3 font-semibold text-white bg-indigo-600 rounded-md shadow-lg cursor-pointer hover:bg-indigo-700 transition-transform transform hover:scale-105">
              Seleccionar Imagen
            </label>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </div>
        );
      case 'CROPPING':
        return (
          <div className="w-full flex flex-col items-center">
            <ImageCropper imageSrc={imageSrc!} onCropChange={handleCropChange} />
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-6 w-full max-w-4xl">
              <div className="w-full md:w-1/2">
                <label htmlFor="template-select" className="block text-sm font-medium text-gray-300 mb-2">Selecciona la plantilla:</label>
                <select id="template-select" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5">
                  {TEMPLATES.map((template) => (
                    <option key={template.name} value={template.url}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={handleGenerate} disabled={isLoading} className="w-full md:w-1/2 mt-4 md:mt-0 self-end px-8 py-3 font-semibold text-white bg-green-600 rounded-md shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Icon icon="generate" className="w-5 h-5" />
                {isLoading ? 'Generando...' : 'Generar Imagen'}
              </button>
            </div>
            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
          </div>
        );
      case 'GENERATED':
        return (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4">La imagen esta lista!</h2>
            {finalImage && (
              <img src={finalImage} alt="Generated result" className="rounded-lg shadow-2xl max-w-full h-auto" style={{ maxWidth: `${CROP_SIZE}px` }} />
            )}
            <div className="flex gap-4 mt-6">
              <a href={finalImage!} download="generated-image.png" className="px-6 py-3 font-semibold text-white bg-indigo-600 rounded-md shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 flex items-center gap-2">
                <Icon icon="download" className="w-5 h-5" />
                Descargar
              </a>
              <button onClick={handleReset} className="px-6 py-3 font-semibold text-gray-800 bg-gray-300 rounded-md shadow-lg hover:bg-gray-400 transition-transform transform hover:scale-105 flex items-center gap-2">
                <Icon icon="reset" className="w-5 h-5" />
                Volver a inicio
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
          Creador de Flyers
        </h1>
        <p className="mt-2 text-lg text-gray-400">Recorta primero la imagen a formato cuadrado y luego selecciona el template que deseas aplicar.</p>
      </header>
      <main className="w-full max-w-5xl p-6 bg-gray-800 rounded-xl shadow-2xl flex items-center justify-center min-h-[400px]">
        {renderContent()}
      </main>
      <footer className="mt-8 text-center text-gray-500">
        <p>por FernandoGc</p>
      </footer>
    </div>
  );
};

export default App;
