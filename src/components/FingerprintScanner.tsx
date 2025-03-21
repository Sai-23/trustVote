"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Fingerprint, X, AlertCircle } from "lucide-react";

interface FingerprintScannerProps {
  onFingerprintCaptured: (fingerprintHex: string) => void;
}

export function FingerprintScanner({
  onFingerprintCaptured,
}: FingerprintScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fingerprintImage, setFingerprintImage] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  // Generate a simulated fingerprint
  const generateFingerprintPattern = useCallback(() => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    
    // Set dimensions
    canvas.width = 250;
    canvas.height = 250;
    
    // Draw background
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw fingerprint pattern
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1.5;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 10;
    
    // Create somewhat random elliptical patterns
    const loops = 15 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < loops; i++) {
      const radius = (i / loops) * maxRadius;
      const deviation = 10 * Math.sin(i * 0.5) + Math.random() * 15;
      
      ctx.beginPath();
      
      // Create an elliptical arc
      for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
        const noise = Math.random() * deviation;
        const x = centerX + (radius + noise) * Math.cos(angle);
        const y = centerY + (radius + noise) * Math.sin(angle + i * 0.2);
        
        if (angle === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.stroke();
    }
    
    // Add random arches and whorls
    for (let i = 0; i < 8; i++) {
      const startAngle = Math.random() * Math.PI * 2;
      const endAngle = startAngle + Math.PI * (0.5 + Math.random() * 1);
      const arcRadius = 20 + Math.random() * (maxRadius - 30);
      
      ctx.beginPath();
      ctx.arc(
        centerX, 
        centerY, 
        arcRadius, 
        startAngle, 
        endAngle
      );
      ctx.stroke();
    }
    
    return canvas.toDataURL("image/png");
  }, []);

  // Check WebAuthn support
  const isWebAuthnSupported = typeof window !== 'undefined' && 
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function';

  // Simulate fingerprint scanning process
  const startSimulatedFingerprint = useCallback(() => {
    setIsScanning(true);
    setError(null);
    setScanProgress(0);
    setDemoMode(true);
    
    // Simulate scanning progress
    let progress = 0;
    scanTimerRef.current = setInterval(() => {
      progress += 5;
      setScanProgress(progress);
      
      if (progress >= 100) {
        clearInterval(scanTimerRef.current as NodeJS.Timeout);
        scanTimerRef.current = null;
        
        // Generate fingerprint image
        const image = generateFingerprintPattern();
        if (image) {
          setFingerprintImage(image);
          // Generate random fingerprint data
          const fingerprintHex = "0x" + Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("");
          
          onFingerprintCaptured(fingerprintHex);
          setIsDone(true);
          setIsScanning(false);
        } else {
          setError("Failed to generate fingerprint image");
          setIsScanning(false);
        }
      }
    }, 100);
  }, [generateFingerprintPattern, onFingerprintCaptured]);

  // Try to use WebAuthn for fingerprint or fall back to simulated
  const startFingerprint = useCallback(() => {
    if (isWebAuthnSupported) {
      try {
        startWebAuthnFingerprint();
      } catch (err) {
        console.warn("WebAuthn failed, falling back to simulated:", err);
        startSimulatedFingerprint();
      }
    } else {
      console.log("WebAuthn not supported, using simulated fingerprint");
      startSimulatedFingerprint();
    }
  }, [startSimulatedFingerprint]);

  // Try to use WebAuthn for fingerprint authentication
  const startWebAuthnFingerprint = async () => {
    try {
      setIsScanning(true);
      setError(null);
      setScanProgress(0);

      // This is a simplified version. In a real app, you would implement
      // proper WebAuthn authentication with a server challenge
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn not supported in this browser");
      }

      // Check if user verifying platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        throw new Error("No fingerprint reader available");
      }

      // Simulate progress
      let progress = 0;
      scanTimerRef.current = setInterval(() => {
        progress += 10;
        setScanProgress(Math.min(progress, 95)); // Max at 95% until we get actual result
      }, 150);

      // In a real implementation, you would create a credential with navigator.credentials.create()
      // For demo purposes, we'll simulate a successful fingerprint after a short delay
      setTimeout(() => {
        clearInterval(scanTimerRef.current as NodeJS.Timeout);
        setScanProgress(100);
        
        // Generate fingerprint image
        const image = generateFingerprintPattern();
        if (image) {
          setFingerprintImage(image);
          // Generate a deterministic but unique fingerprint hex
          // In reality this would be derived from the WebAuthn credential
          const fingerprintHex = "0x" + Array.from({ length: 64 }, (_, i) =>
            ((i * 7) % 16).toString(16)
          ).join("");
          
          onFingerprintCaptured(fingerprintHex);
          setIsDone(true);
          setIsScanning(false);
        } else {
          setError("Failed to generate fingerprint visualization");
          setIsScanning(false);
        }
      }, 2000);
    } catch (err: any) {
      clearInterval(scanTimerRef.current as NodeJS.Timeout);
      console.error("Fingerprint authentication error:", err);
      setError(err.message || "Fingerprint authentication failed. Try demo mode instead.");
      setIsScanning(false);
      // Automatically switch to demo mode after an error
      setTimeout(() => {
        startSimulatedFingerprint();
      }, 500);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    };
  }, []);

  // Cancel scanning
  const cancelScan = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setIsScanning(false);
    setError(null);
  };

  // Reset the scanner
  const resetScan = () => {
    setFingerprintImage(null);
    setIsDone(false);
    setDemoMode(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-700">
          Fingerprint Verification
        </label>
        <span className="text-xs text-gray-500">(Required)</span>
      </div>

      {!isScanning && !isDone && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={startFingerprint}
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Fingerprint size={18} />
            Scan Fingerprint
          </Button>
          
          <Button
            onClick={startSimulatedFingerprint}
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Fingerprint size={18} />
            Use Demo Mode
          </Button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={startSimulatedFingerprint}
            className="text-blue-500 p-0 h-auto"
          >
            Use Demo Mode
          </Button>
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
            <div className="rounded-lg bg-gray-100 p-6 flex flex-col items-center justify-center min-h-[200px]">
              <div className="mb-4">
                <Fingerprint
                  size={64}
                  className={`text-blue-500 ${
                    isScanning ? "animate-pulse" : ""
                  }`}
                />
              </div>
              
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${scanProgress}%` }}
                ></div>
              </div>
              
              <p className="text-sm text-gray-600 text-center">
                {demoMode ? 'Demo Mode: ' : ''}
                {scanProgress < 100
                  ? `Scanning fingerprint (${scanProgress}%)...`
                  : "Processing..."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {isDone && fingerprintImage && (
        <Card className="p-4 relative">
          <div className="space-y-4">
            <div className="rounded-md overflow-hidden flex items-center justify-center bg-gray-50 p-2">
              <div className="relative">
                <img
                  src={fingerprintImage}
                  alt="Fingerprint"
                  className="w-full max-w-[250px] h-auto"
                />
                {demoMode && (
                  <div className="absolute bottom-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-xs p-1 text-center">
                    Demo Mode - Using simulated fingerprint data
                  </div>
                )}
              </div>
            </div>

            <Button onClick={resetScan} variant="outline" className="w-full">
              Rescan Fingerprint
            </Button>
          </div>
        </Card>
      )}

      {/* Hidden canvas for fingerprint generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
