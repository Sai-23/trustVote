"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Camera, X } from "lucide-react"

interface FaceScannerProps {
  onFaceCaptured: (faceHex: string) => void
}

export function FaceScanner({ onFaceCaptured }: FaceScannerProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCaptured, setIsCaptured] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Open camera
  const openCamera = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
      
      setIsCameraOpen(true)
    } catch (error: any) {
      console.error("Error accessing camera:", error)
      setError(error.message || "Failed to access camera. Please make sure you have granted camera permissions.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle video loaded
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err)
        setError("Failed to start video stream. Please try again.")
      })
    }
  }

  // Capture face
  const captureFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    if (!context) return
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg')
    setCapturedImage(imageData)
    
    // Convert to hex
    convertImageToHex(imageData)
    
    // Close camera
    closeCamera()
    setIsCaptured(true)
  }, [])

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Close camera
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsCameraOpen(false)
  }

  // Reset scan
  const resetScan = () => {
    setCapturedImage(null)
    setIsCaptured(false)
  }

  // Convert image to hex
  const convertImageToHex = (imageData: string) => {
    // Remove data URL prefix
    const base64Data = imageData.split(',')[1]
    
    // Convert base64 to binary
    const binaryData = atob(base64Data)
    
    // Convert binary to hex - use a simplified approach to generate a unique identifier
    // In a real app, you might use a more robust face recognition algorithm
    let hex = '0x'
    // Just take a sample of the data to create a reasonable length hex
    const step = Math.floor(binaryData.length / 32)
    for (let i = 0; i < binaryData.length; i += step) {
      if (hex.length < 66) { // limit to 32 bytes (0x + 64 chars)
        const charCode = binaryData.charCodeAt(i)
        hex += charCode.toString(16).padStart(2, '0')
      }
    }
    
    // Pass hex to parent component
    onFaceCaptured(hex)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-700">
          Face Recognition
        </label>
        <span className="text-xs text-gray-500">(Required)</span>
      </div>
      
      {!isCameraOpen && !isCaptured && (
        <Button 
          onClick={openCamera}
          variant="outline" 
          className="w-full flex items-center justify-center gap-2"
          disabled={isLoading}
        >
          <Camera size={18} />
          {isLoading ? "Starting Camera..." : "Scan Face"}
        </Button>
      )}
      
      {error && (
        <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md">
          {error}
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
            <div className="rounded-md overflow-hidden bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                muted
                onLoadedMetadata={handleVideoLoaded}
                className="w-full h-auto"
                style={{ maxHeight: '320px', objectFit: 'contain' }}
              />
            </div>
            
            <Button onClick={captureFace} className="w-full">
              Capture
            </Button>
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
                style={{ maxHeight: '320px', objectFit: 'contain' }}
              />
            </div>
            
            <Button 
              onClick={resetScan} 
              variant="outline"
              className="w-full"
            >
              Rescan Face
            </Button>
          </div>
        </Card>
      )}
      
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
} 