import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useState } from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export function ImagePreviewModal({ 
  isOpen, 
  onClose, 
  imageUrl,
  title = 'Document Preview'
}: ImagePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = title.replace(/\s+/g, '_') + '.png';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  // Reset on close
  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-border max-w-5xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="p-3 md:p-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm md:text-base truncate flex-1">{title}</DialogTitle>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Mobile-optimized controls */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                className="h-8 w-8 md:h-9 md:w-9"
                title="Zoom Out"
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                className="h-8 w-8 md:h-9 md:w-9"
                title="Zoom In"
                disabled={zoom >= 3}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="h-8 w-8 md:h-9 md:w-9"
                title="Rotate"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenInNewTab}
                  className="h-9 w-9"
                  title="Open in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="h-9 w-9"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          {/* Zoom indicator */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Zoom: {Math.round(zoom * 100)}%</span>
            {zoom !== 1 || rotation !== 0 ? (
              <button
                onClick={handleReset}
                className="text-xs text-primary hover:underline"
              >
                Reset
              </button>
            ) : null}
          </div>
        </DialogHeader>
        
        {/* Image Container - Mobile optimized with touch support */}
        <div className="relative overflow-auto max-h-[calc(95vh-120px)] md:max-h-[calc(95vh-140px)] bg-black/50">
          <div className="min-h-[300px] md:min-h-[400px] flex items-center justify-center p-4 md:p-6">
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full h-auto object-contain rounded-lg shadow-2xl transition-transform duration-300"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
                touchAction: 'pan-x pan-y pinch-zoom',
              }}
              loading="eager"
            />
          </div>
        </div>

        {/* Mobile bottom actions */}
        <div className="flex md:hidden items-center justify-center gap-2 p-3 border-t border-border bg-background/95 backdrop-blur-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInNewTab}
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
