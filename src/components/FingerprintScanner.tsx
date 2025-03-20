"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Fingerprint, X, RefreshCw } from "lucide-react"

interface FingerprintScannerProps {
  onFingerprintCaptured: (fingerprintHex: string) => void
}

export function FingerprintScanner({ onFingerprintCaptured }: FingerprintScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [isScanned, setIsScanned] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Start scanning animation
  const startScanning = () => {
    setIsScanning(true)
    setError(null)
    setProgress(0)
    
    // Simulate fingerprint scanning with progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 200);
    
    // Complete scan after random time (2-3.5 seconds)
    const scanTime = 2000 + Math.random() * 1500;
    timeoutRef.current = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      generateFingerprintData();
    }, scanTime);
  }
  
  // Generate random fingerprint pattern and draw it
  const generateFingerprintData = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size
    canvas.width = 300;
    canvas.height = 300;
    
    // Draw fingerprint pattern
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    
    // Create a unique pattern each time
    const seedValue = Date.now();
    const randomSeed = (seed: number) => {
      return () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    };
    
    const random = randomSeed(seedValue);
    
    // Draw elliptical loops
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Draw core
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    
    // Draw fingerprint ridges
    for (let i = 0; i < 35; i++) {
      const radiusX = 30 + i * 5 + random() * 10;
      const radiusY = 20 + i * 5 + random() * 10;
      const rotation = random() * Math.PI / 4;
      
      ctx.beginPath();
      
      for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        const xOffset = random() * 5 - 2.5;
        const yOffset = random() * 5 - 2.5;
        
        const x = centerX + Math.cos(angle) * radiusX * Math.cos(rotation) - 
                  Math.sin(angle) * radiusY * Math.sin(rotation) + xOffset;
        const y = centerY + Math.cos(angle) * radiusX * Math.sin(rotation) + 
                  Math.sin(angle) * radiusY * Math.cos(rotation) + yOffset;
        
        if (angle === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
    
    // Add some minutiae points (fingerprint details)
    for (let i = 0; i < 30; i++) {
      const angle = random() * Math.PI * 2;
      const distance = 30 + random() * 100;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
    }
    
    // Convert to hex and complete the process
    const imageData = canvas.toDataURL('image/png');
    convertToHex(imageData);
    
    setIsScanned(true);
    setIsScanning(false);
  }, []);

  // Convert image to hex format
  const convertToHex = (imageData: string) => {
    // Extract base64 data
    const base64Data = imageData.split(',')[1];
    
    // Convert to binary
    const binaryData = atob(base64Data);
    
    // Create hex representation (shortened version)
    let hex = '0x';
    const step = Math.floor(binaryData.length / 32);
    
    for (let i = 0; i < binaryData.length; i += step) {
      if (hex.length < 66) { // limit to 32 bytes (0x + 64 chars)
        const charCode = binaryData.charCodeAt(i);
        hex += charCode.toString(16).padStart(2, '0');
      }
    }
    
    // Send hex data to parent component
    onFingerprintCaptured(hex);
  };
  
  // Cancel scan
  const cancelScan = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsScanning(false);
    setProgress(0);
  };
  
  // Reset scan
  const resetScan = () => {
    setIsScanned(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-700">
          Fingerprint Recognition
        </label>
        <span className="text-xs text-gray-500">(Required)</span>
      </div>
      
      {!isScanning && !isScanned && (
        <Button 
          onClick={startScanning}
          variant="outline" 
          className="w-full flex items-center justify-center gap-2"
        >
          <Fingerprint size={18} />
          Scan Fingerprint
        </Button>
      )}
      
      {error && (
        <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md">
          {error}
        </div>
      )}
      
      {isScanning && (
        <Card className="p-4 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 z-10"
            onClick={cancelScan}
          >
            <X size={18} />
          </Button>
          
          <div className="space-y-4">
            <div className="p-8 flex flex-col items-center justify-center">
              <Fingerprint className="h-20 w-20 text-blue-500 animate-pulse mb-4" />
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-4 text-gray-600 text-center">
                Place your finger on the scanner
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {isScanned && (
        <Card className="p-4 relative">
          <div className="space-y-4">
            <div className="rounded-md overflow-hidden flex justify-center p-2">
              <canvas 
                ref={canvasRef} 
                className="border border-gray-200"
                width={300}
                height={300}
              />
            </div>
            
            <Button 
              onClick={resetScan} 
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Rescan Fingerprint
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
} 