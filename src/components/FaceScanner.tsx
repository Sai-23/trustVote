"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, RefreshCw, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface FaceScannerProps {
  onFaceCaptured: (faceHex: string) => void;
}

export function FaceScanner({ onFaceCaptured }: FaceScannerProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReloadKey, setCameraReloadKey] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Force video element to reload if needed
  const reloadCamera = useCallback(() => {
    setCameraReloadKey((prev) => prev + 1);
  }, []);

  // Switch to demo mode
  const switchToDemoMode = () => {
    console.log("Switching to demo mode");
    
    // Close camera if open
    if (isCameraOpen) {
      closeCamera();
    }
    
    // Clear any existing errors
    setError(null);
    
    // Enable demo mode
    setDemoMode(true);
    
    // Generate a demo face image programmatically
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Set canvas size
        canvas.width = 300;
        canvas.height = 300;
        
        // Fill background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw face silhouette
        ctx.fillStyle = '#a0a0a0';
        ctx.beginPath();
        ctx.arc(150, 120, 80, 0, Math.PI * 2); // Head
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(150, 240, 50, 0, Math.PI); // Shoulders
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.arc(120, 110, 12, 0, Math.PI * 2); // Left eye
        ctx.arc(180, 110, 12, 0, Math.PI * 2); // Right eye
        ctx.fill();
        
        // Draw smile
        ctx.beginPath();
        ctx.arc(150, 140, 40, 0.2, Math.PI - 0.2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#555555';
        ctx.stroke();
        
        // Draw demo mode text
        ctx.fillStyle = '#606060';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DEMO MODE', 150, 190);
        
        // Convert to data URL
        const imageData = canvas.toDataURL('image/png');
        setCapturedImage(imageData);
      }
    }
    
    setIsCaptured(true);
    
    // Generate a consistent hex for demo mode
    const demoHex = "0x7465737466616365303031"; // "testface001" in hex
    
    // Notify parent
    onFaceCaptured(demoHex);
    
    toast.success("Demo mode enabled. Using sample face data.");
  };

  // Check if cameras are available
  const checkCameraAvailability = async (): Promise<boolean> => {
    try {
      // Check if we're in a secure context (required for camera API)
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        console.warn("Not in a secure context, camera API may not be available");
        return false;
      }
      
      // Check if the mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn("MediaDevices API not available");
        return false;
      }
      
      // Get list of all media devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter to only camera/video devices
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log(`Found ${videoDevices.length} video input devices:`, 
        videoDevices.map(d => ({ deviceId: d.deviceId, label: d.label || 'Unnamed camera' })));
      
      return videoDevices.length > 0;
    } catch (err) {
      console.error("Error checking camera availability:", err);
      return false;
    }
  };

  // Check camera permissions
  const checkCameraPermissions = async (): Promise<boolean> => {
    try {
      // Check if the permissions API is available
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log("Camera permission status:", result.state);
        
        if (result.state === 'denied') {
          console.warn("Camera permission denied");
          return false;
        }
      }
      
      return true;
    } catch (err) {
      console.error("Error checking camera permissions:", err);
      // If we can't check permissions, we'll try to access the camera anyway
      return true;
    }
  };

  // Open camera
  const openCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Track attempt
      setFailedAttempts(prev => prev + 1);

      console.log("Checking camera availability...");
      const hasCameras = await checkCameraAvailability();
      
      if (!hasCameras) {
        console.warn("No cameras detected on this device");
        setError("No camera detected on this device. Please use demo mode instead.");
        setIsLoading(false);
        
        // Auto-switch to demo mode after multiple failures
        if (failedAttempts >= 2) {
          console.log("Multiple camera failures, auto-switching to demo mode");
          setTimeout(() => switchToDemoMode(), 1500);
        }
        return;
      }
      
      // Check permissions
      const hasPermission = await checkCameraPermissions();
      if (!hasPermission) {
        setError("Camera permission denied. Please allow camera access in your browser settings or use demo mode.");
        setIsLoading(false);
        
        // Auto-switch to demo mode after multiple failures
        if (failedAttempts >= 2) {
          console.log("Multiple camera failures, auto-switching to demo mode");
          setTimeout(() => switchToDemoMode(), 1500);
        }
        return;
      }

      console.log("Attempting to open camera...");

      // Most compatible constraint first
      const basicConstraint = { video: true, audio: false };

      try {
        console.log("Trying basic camera constraint");
        const stream = await navigator.mediaDevices.getUserMedia(
          basicConstraint
        );
        console.log("Camera access successful with basic constraint");

        // Store the stream
        streamRef.current = stream;

        // Set camera open state
        setIsCameraOpen(true);

        // Force reload the camera element
        reloadCamera();

        // Add small delay before trying to set video source
        setTimeout(() => {
          if (videoRef.current) {
            console.log("Setting video source after delay...");
            videoRef.current.srcObject = stream;
          }
        }, 100);

        return; // Exit early on success
      } catch (err) {
        console.warn("Basic constraint failed, trying fallback options:", err);
      }

      // Fallback options if basic constraint fails
      const fallbackConstraints = [
        // Low resolution option
        {
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
          },
          audio: false,
        },
        // Front camera explicit option
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        },
        // Back camera option
        {
          video: {
            facingMode: "environment",
          },
          audio: false,
        },
        // Minimal requirements option
        {
          video: {
            width: { ideal: 160 },
            height: { ideal: 120 },
            frameRate: { ideal: 10 }
          },
          audio: false,
        }
      ];

      let stream = null;
      let errorDetails = [];

      // Try each fallback constraint
      for (let constraint of fallbackConstraints) {
        try {
          console.log("Trying fallback constraint:", constraint);
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log("Camera access successful with fallback constraint");
          break;
        } catch (err) {
          errorDetails.push(`${err}`);
          console.warn(
            "Failed with fallback constraint:",
            constraint,
            "Error:",
            err
          );
        }
      }

      if (!stream) {
        console.error("All camera access attempts failed");
        throw new Error(
          `All camera access attempts failed: ${errorDetails.join(", ")}`
        );
      }

      // Store the stream
      streamRef.current = stream;

      // Set camera open state
      setIsCameraOpen(true);

      // Force reload the camera element
      reloadCamera();

      // Add small delay before trying to set video source
      setTimeout(() => {
        if (videoRef.current) {
          console.log("Setting video source after delay...");
          videoRef.current.srcObject = stream;
        } else {
          console.error("Video element still not available after delay");
          setError("Could not initialize camera. Please try again.");
        }
      }, 100);
    } catch (error: any) {
      console.error("Error accessing camera:", error);
      
      // Check if it's a device not found error
      if (error.message && error.message.includes("NotFoundError") || 
          error.message && error.message.includes("Requested device not found")) {
        setError(
          "No camera detected or camera is in use by another application. Please use demo mode."
        );
      } else if (error.message && error.message.includes("Permission denied") || 
                error.message && error.message.includes("NotAllowedError")) {
        setError(
          "Camera access permission denied. Please allow camera access or use demo mode."
        );
      } else {
        setError(
          "Failed to access camera. You may try demo mode instead."
        );
      }
      
      setIsCameraOpen(false);
      
      // Auto-switch to demo mode after multiple failures
      if (failedAttempts >= 2) {
        console.log("Multiple camera failures, auto-switching to demo mode");
        setTimeout(() => switchToDemoMode(), 1500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle video loaded
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      console.log("Video metadata loaded, trying to play...");
      console.log("Video dimensions:", {
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        readyState: videoRef.current.readyState,
        srcObject: videoRef.current.srcObject ? "Stream set" : "No stream",
      });

      // If for some reason the srcObject is not set yet, try setting it again
      if (!videoRef.current.srcObject && streamRef.current) {
        console.log("Re-setting srcObject in handleVideoLoaded");
        videoRef.current.srcObject = streamRef.current;
      }

      // Try to play the video
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Video playback started successfully");
            // Check if video is actually showing content
            setTimeout(() => {
              if (
                videoRef.current &&
                (videoRef.current.videoWidth === 0 ||
                  videoRef.current.videoHeight === 0)
              ) {
                console.warn(
                  "Video dimensions are zero, stream might not be working properly"
                );
                setError(
                  "Camera stream doesn't appear to be working. Try demo mode instead."
                );
              }
            }, 1000); // Check after 1 second
          })
          .catch((err) => {
            console.error("Error playing video:", err);
            setError("Failed to start video stream. Try demo mode instead.");
          });
      }
    } else {
      console.error("Video ref is null in handleVideoLoaded");
    }
  };

  // Capture face
  const captureFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.error("Video or canvas ref not available when capturing");
      setError("Could not capture image. Please try again.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      console.error("Could not get canvas context");
      setError("Could not process image. Please try again.");
      return;
    }

    // Check if the video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("Video dimensions are zero, cannot capture");
      setError(
        "Camera stream is not ready yet. Please wait a moment and try again."
      );
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data as base64
      const imageData = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageData);

      // Convert to hex
      convertImageToHex(imageData);

      // Close camera
      closeCamera();
      setIsCaptured(true);
    } catch (err) {
      console.error("Error capturing face:", err);
      setError("Failed to capture image. Please try again.");
    }
  }, []);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Ensure video is properly initialized when camera is opened
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      console.log("Effect: Setting video srcObject");
      videoRef.current.srcObject = streamRef.current;

      // Try to play the video after setting srcObject
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Effect: Error playing video:", err);
        });
      }
    }
  }, [isCameraOpen]);

  // Close camera
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
  };

  // Reset scan
  const resetScan = () => {
    setCapturedImage(null);
    setIsCaptured(false);
    setDemoMode(false);
  };

  // Convert image to hex
  const convertImageToHex = (imageData: string) => {
    // Remove data URL prefix
    const base64Data = imageData.split(",")[1];

    // Convert base64 to binary
    const binaryData = atob(base64Data);

    // Convert binary to hex - use a simplified approach to generate a unique identifier
    // In a real app, you might use a more robust face recognition algorithm
    let hex = "0x";
    // Just take a sample of the data to create a reasonable length hex
    const step = Math.floor(binaryData.length / 32);
    for (let i = 0; i < binaryData.length; i += step) {
      if (hex.length < 66) {
        // limit to 32 bytes (0x + 64 chars)
        const charCode = binaryData.charCodeAt(i);
        hex += charCode.toString(16).padStart(2, "0");
      }
    }

    // Pass hex to parent component
    onFaceCaptured(hex);
  };

  // Error UI component
  const ErrorWithDemoOption = () => {
    if (!error) return null;
    
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-md space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-red-500 h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
        
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-700">
            You can continue using the demo mode instead:
          </p>
          <Button 
            onClick={switchToDemoMode}
            className="bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
          >
            <User size={16} />
            Continue with Demo Mode
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-700">
          Face Recognition
        </label>
        <span className="text-xs text-gray-500">(Required)</span>
      </div>

      {/* Error message with demo option */}
      {error && <ErrorWithDemoOption />}

      {!isCameraOpen && !isCaptured && !error && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={openCamera}
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <Camera size={18} />
            {isLoading ? "Starting Camera..." : "Scan Face"}
          </Button>
          
          <Button
            onClick={switchToDemoMode}
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
          >
            <User size={18} />
            Use Demo Mode
          </Button>
        </div>
      )}

      {isCameraOpen && (
        <Card className="p-4 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={closeCamera}
          >
            <X size={18} />
          </Button>

          <div className="space-y-4">
            <div className="rounded-md overflow-hidden bg-black min-h-[240px] flex items-center justify-center">
              {/* Loading indicator while camera initializes */}
              {isLoading && (
                <div className="animate-pulse flex flex-col items-center text-white p-4">
                  <Camera size={48} className="mb-2" />
                  <span>Initializing camera...</span>
                </div>
              )}

              <video
                key={`video-${cameraReloadKey}`}
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={handleVideoLoaded}
                className="w-full h-auto"
                style={{
                  maxHeight: "320px",
                  objectFit: "contain",
                  minHeight: "240px",
                  backgroundColor: "black",
                  display: "block",
                }}
                width="100%"
                height="auto"
              />
            </div>

            {/* Backup message in case video doesn't show */}
            <p className="text-xs text-gray-500 mt-1 text-center">
              If camera doesn't appear, please check your camera permissions and
              ensure no other app is using it.
              <Button
                variant="link"
                size="sm"
                className="px-1 py-0 h-auto text-xs text-blue-500"
                onClick={reloadCamera}
              >
                Try reloading
              </Button>
              or
              <Button
                variant="link"
                size="sm"
                className="px-1 py-0 h-auto text-xs text-blue-500"
                onClick={switchToDemoMode}
              >
                use demo mode
              </Button>
            </p>

            {/* Additional controls for when camera might be having issues */}
            <div className="flex space-x-2">
              <Button onClick={captureFace} className="flex-1">
                Capture
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  // Try to reinitialize the camera
                  closeCamera();
                  setTimeout(() => {
                    openCamera();
                  }, 500);
                }}
                title="Reinitialize camera"
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isCaptured && capturedImage && (
        <Card className="p-4 relative">
          <div className="space-y-4">
            <div className="rounded-md overflow-hidden">
              <img
                src={capturedImage}
                alt="Captured face"
                className="w-full h-auto"
                style={{ maxHeight: "320px", objectFit: "contain" }}
              />
              {demoMode && (
                <div className="bg-yellow-100 text-yellow-800 text-xs p-1 text-center">
                  Demo Mode - Using simulated face data
                </div>
              )}
            </div>

            <Button onClick={resetScan} variant="outline" className="w-full">
              Rescan Face
            </Button>
          </div>
        </Card>
      )}

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
