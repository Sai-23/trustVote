"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Fingerprint, X, RefreshCw, Check } from "lucide-react"

interface BiometricVerificationProps {
  faceData: string
  fingerprintData: string
  onVerificationComplete: (isVerified: boolean) => void
}

export function BiometricVerification({ 
  faceData, 
  fingerprintData, 
  onVerificationComplete 
}: BiometricVerificationProps) {
  const [activeTab, setActiveTab] = useState("face")
  const [isFaceVerified, setIsFaceVerified] = useState(false)
  const [isFingerprintVerified, setIsFingerprintVerified] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isFingerScanOpen, setIsFingerScanOpen] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Verify if both biometrics have been validated
  useEffect(() => {
    if (isFaceVerified && isFingerprintVerified) {
      onVerificationComplete(true)
    }
  }, [isFaceVerified, isFingerprintVerified, onVerificationComplete])

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      closeCamera()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Face verification section
  const openCamera = async () => {
    try {
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
    }
  }

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

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err)
        setError("Failed to start video stream. Please try again.")
      })
    }
  }

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
    
    // Simulate verification
    verifyFace(imageData)
    
    // Close camera
    closeCamera()
  }, [])

  const verifyFace = (imageData: string) => {
    setIsVerifying(true)
    setError(null)
    
    // In a real system, this would send the image to a server for comparison
    // For demo, we'll simulate verification with the stored face data
    
    // Create a timeout to simulate processing
    timeoutRef.current = setTimeout(() => {
      // Convert captured image to a similar format as stored data for comparison
      const base64Data = imageData.split(',')[1]
      const binaryData = atob(base64Data)
      
      // Simple matching for demo
      // In production, you would use a proper face recognition API
      const randomSuccess = Math.random() > 0.2 // 80% success rate for demo
      
      if (randomSuccess) {
        setIsFaceVerified(true)
        setActiveTab("fingerprint") // Automatically move to next verification
      } else {
        setError("Face verification failed. Please try again.")
        setCapturedImage(null)
      }
      
      setIsVerifying(false)
    }, 1500) // Simulate 1.5 seconds of processing
  }

  const resetFaceScan = () => {
    setCapturedImage(null)
    setIsFaceVerified(false)
    setError(null)
  }

  // Fingerprint verification section
  const startFingerprintScan = () => {
    setIsFingerScanOpen(true)
    setError(null)
    setProgress(0)
    
    // Simulate fingerprint scanning with progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 15
        return newProgress >= 100 ? 100 : newProgress
      })
    }, 200)
    
    // Complete scan after random time (2-3.5 seconds)
    const scanTime = 2000 + Math.random() * 1500
    timeoutRef.current = setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      verifyFingerprint()
    }, scanTime)
  }

  const verifyFingerprint = () => {
    setIsVerifying(true)
    setError(null)
    
    // In a real system, this would compare fingerprint data
    // For demo, we'll simulate verification with the stored fingerprint data
    
    // Create a timeout to simulate processing
    timeoutRef.current = setTimeout(() => {
      // Simple matching for demo
      // In production, you would use a proper fingerprint matching API
      const randomSuccess = Math.random() > 0.2 // 80% success rate for demo
      
      if (randomSuccess) {
        setIsFingerprintVerified(true)
      } else {
        setError("Fingerprint verification failed. Please try again.")
        setIsFingerScanOpen(false)
      }
      
      setIsVerifying(false)
    }, 1000) // Simulate 1 second of processing
  }

  const resetFingerprintScan = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsFingerScanOpen(false)
    setIsFingerprintVerified(false)
    setError(null)
  }

  return (
    <Card className="p-4">
      <h2 className="text-xl font-semibold text-center mb-4">Biometric Verification</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="face" disabled={isFaceVerified}>
            Face Verification {isFaceVerified && <Check className="ml-2 h-4 w-4 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="fingerprint" disabled={!isFaceVerified || isFingerprintVerified}>
            Fingerprint {isFingerprintVerified && <Check className="ml-2 h-4 w-4 text-green-600" />}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="face" className="space-y-4 mt-4">
          {error && (
            <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          
          {isFaceVerified ? (
            <div className="text-center p-4">
              <div className="mb-2 flex items-center justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="text-green-700 font-medium">Face verified successfully!</p>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFaceScan}
                className="mt-2"
              >
                Reset and Try Again
              </Button>
            </div>
          ) : isVerifying ? (
            <div className="text-center p-4">
              <p>Verifying face data...</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '100%', animation: 'pulse 1.5s infinite' }}></div>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="space-y-4">
              <div className="rounded-md overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured face"
                  className="w-full h-auto max-h-60 object-contain"
                />
              </div>
              <div className="flex justify-center gap-2">
                <Button
                  onClick={resetFaceScan}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retake
                </Button>
              </div>
            </div>
          ) : isCameraOpen ? (
            <div className="space-y-4">
              <div className="relative rounded-md overflow-hidden bg-black">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={closeCamera}
                >
                  <X size={18} />
                </Button>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={handleVideoLoaded}
                  className="w-full h-auto"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
              </div>
              <Button onClick={captureFace} className="w-full">
                Capture Face
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                We need to verify your identity before you can vote. Please scan your face to continue.
              </p>
              <Button
                onClick={openCamera}
                className="w-full flex items-center justify-center gap-2"
              >
                <Camera size={18} />
                Start Face Verification
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="fingerprint" className="space-y-4 mt-4">
          {error && (
            <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          
          {isFingerprintVerified ? (
            <div className="text-center p-4">
              <div className="mb-2 flex items-center justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="text-green-700 font-medium">Fingerprint verified successfully!</p>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFingerprintScan}
                className="mt-2"
              >
                Reset and Try Again
              </Button>
            </div>
          ) : isVerifying ? (
            <div className="text-center p-4">
              <p>Verifying fingerprint data...</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '100%', animation: 'pulse 1.5s infinite' }}></div>
              </div>
            </div>
          ) : isFingerScanOpen ? (
            <div className="p-4 flex flex-col items-center justify-center">
              <Fingerprint className="h-20 w-20 text-blue-500 animate-pulse mb-4" />
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-gray-600 text-center">
                Place your finger on the scanner
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFingerprintScan}
                className="mt-4"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                Please scan your fingerprint to complete the verification process.
              </p>
              <Button
                onClick={startFingerprintScan}
                className="w-full flex items-center justify-center gap-2"
                disabled={!isFaceVerified}
              >
                <Fingerprint size={18} />
                Start Fingerprint Verification
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </Card>
  )
} 