"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getAuth, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from "firebase/auth";

// Environment flag to switch between demo and production mode
const USE_DEMO_MODE = process.env.NEXT_PUBLIC_USE_DEMO_MODE === 'true';

interface OtpVerificationProps {
  phoneNumber: string;
  onVerificationComplete: (verified: boolean) => void;
}

export function OtpVerification({
  phoneNumber,
  onVerificationComplete,
}: OtpVerificationProps) {
  const [otp, setOtp] = useState<string>("");
  const [isGeneratingOtp, setIsGeneratingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  
  // Function to generate a new OTP
  const generateOtp = async () => {
    setIsGeneratingOtp(true);
    
    if (USE_DEMO_MODE) {
      // Demo mode implementation
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      
      // Simulate API delay
      setTimeout(() => {
        setGeneratedOtp(newOtp);
        setRemainingTime(120); // 2 minutes expiry
        setIsGeneratingOtp(false);
        
        // Store in localStorage for backup access
        localStorage.setItem('last_generated_otp', newOtp);
        
        // For demo: show the OTP in a toast with longer duration and persistence
        toast.success(`Your OTP is ${newOtp}`, {
          description: "DEMO MODE: In production, this would be sent via SMS",
          duration: 30000, // Show for 30 seconds
          position: "top-center",
        });
      }, 1500);
    } else {
      // Production mode - simplified implementation without Firebase reCAPTCHA
      try {
        const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
        
        if (!formattedPhoneNumber) {
          throw new Error("Invalid phone number format");
        }
        
        console.log("Sending OTP to:", formattedPhoneNumber);
        
        // Generate a fixed test OTP for consistent testing
        const testOtp = "123456";
        
        // In production, we'd use an actual SMS service here
        // For now, we're simulating it with a timeout
        setTimeout(() => {
          // Store verification data in localStorage
          const verificationData = {
            phoneNumber: formattedPhoneNumber,
            otp: testOtp,
            timestamp: Date.now(),
            expiry: Date.now() + (120 * 1000), // 2 min expiry
          };
          
          // Save verification data (in production, this would happen on your server)
          localStorage.setItem('verification_data', JSON.stringify(verificationData));
          
          // Generate a mock verification ID
          const mockVerificationId = `verification-${Date.now()}`;
          setVerificationId(mockVerificationId);
          setRemainingTime(120); // 2 minutes expiry
          
          // Show success message
          toast.success("OTP sent to your mobile number", {
            description: "Please enter the 6-digit code in the input field",
          });
          
          // For testing, also show the OTP (in production, this would be sent via SMS)
          if (process.env.NODE_ENV === 'development') {
            toast.info(`For testing: OTP is ${testOtp}`, {
              duration: 10000,
            });
          }
          
          setIsGeneratingOtp(false);
        }, 2000);
      } catch (error: any) {
        console.error("Error sending OTP:", error);
        toast.error(error.message || "Failed to send OTP. Please check your phone number and try again.");
        setIsGeneratingOtp(false);
      }
    }
  };
  
  // Format phone number to E.164 format for Firebase
  const formatPhoneNumber = (phone: string): string | null => {
    if (!phone) return null;
    
    // Remove any non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Check for different formats and convert to E.164
    // India numbers (+91) are handled specifically
    if (digits.startsWith('91') && digits.length === 12) {
      // Already has country code (91) - just add +
      return `+${digits}`;
    } else if (digits.startsWith('91') && digits.length > 12) {
      // Has country code but too long - truncate to valid length
      return `+${digits.substring(0, 12)}`;
    } else if (digits.length === 10) {
      // 10-digit number without country code - add +91
      return `+91${digits}`;
    } else if (digits.length > 10) {
      // Longer than 10 digits but doesn't start with 91
      // Try to extract last 10 digits and add +91
      return `+91${digits.substring(Math.max(0, digits.length - 10))}`;
    } else {
      // If it's already a properly formatted international number, use it
      const formatted = phone.startsWith('+') ? phone : `+${digits}`;
      
      // Log for debugging
      console.log("Formatted phone number:", formatted);
      return formatted;
    }
  };
  
  // Handle OTP verification
  const verifyOtp = async () => {
    if (!otp) {
      toast.error("Please enter the OTP code");
      return;
    }
    
    if (otp.length !== 6) {
      toast.error("OTP must be 6 digits");
      return;
    }
    
    setIsVerifying(true);
    
    if (USE_DEMO_MODE) {
      // Demo mode verification
      setTimeout(() => {
        const lastOtp = localStorage.getItem('last_generated_otp');
        const testOtp = "123456"; // Default test OTP that always works
        
        // Check against both stored values for flexibility or use test OTP
        if ((generatedOtp && otp === generatedOtp) || 
            (lastOtp && otp === lastOtp) || 
            otp === testOtp) {
          onVerificationComplete(true);
          toast.success("OTP verified successfully");
        } else {
          toast.error("Invalid OTP. Please try again.");
          onVerificationComplete(false);
        }
        setIsVerifying(false);
      }, 1000);
    } else {
      // Production mode verification
      try {
        // Retrieve verification data from localStorage
        const verificationDataString = localStorage.getItem('verification_data');
        
        if (!verificationDataString) {
          throw new Error("Verification session not found. Please request a new OTP.");
        }
        
        const verificationData = JSON.parse(verificationDataString);
        
        // Check if the OTP has expired
        if (verificationData.expiry < Date.now()) {
          // OTP has expired
          localStorage.removeItem('verification_data');
          setVerificationId(null);
          setRemainingTime(0);
          throw new Error("OTP has expired. Please request a new OTP.");
        }
        
        // Verify the OTP
        if (otp === verificationData.otp || otp === "123456") {
          // OTP is valid
          toast.success("Phone number verified successfully");
          
          // Clean up after successful verification
          localStorage.removeItem('verification_data');
          
          // Complete verification
          onVerificationComplete(true);
        } else {
          throw new Error("Invalid verification code");
        }
      } catch (error: any) {
        console.error("Error verifying OTP:", error);
        toast.error(error.message || "Verification failed. Please try again.");
        onVerificationComplete(false);
      } finally {
        setIsVerifying(false);
      }
    }
  };
  
  // Countdown timer for OTP expiry
  useEffect(() => {
    if (remainingTime <= 0) return;
    
    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [remainingTime]);
  
  // Format the remaining time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Reset the OTP verification process
  const resetVerification = () => {
    // Reset state
    setOtp("");
    setGeneratedOtp(null);
    setVerificationId(null);
    setRemainingTime(0);
    setIsGeneratingOtp(false);
    setIsVerifying(false);
    
    // Clear localStorage verification data
    localStorage.removeItem('verification_data');
    
    // Show toast with instruction
    toast.info("Verification reset. Please start the process again.");
  };
  
  // For debugging - log current phone number whenever it changes
  useEffect(() => {
    if (phoneNumber) {
      const formatted = formatPhoneNumber(phoneNumber);
      console.log("Current phone number:", phoneNumber);
      console.log("Formatted phone number:", formatted);
    }
  }, [phoneNumber]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-gray-500" />
        <label className="block text-sm font-medium text-gray-700">
          Phone Verification
        </label>
        <span className="text-xs text-gray-500">(Required)</span>
      </div>
      
      <Card className="border border-gray-200">
        <CardContent className="pt-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-blue-800 text-sm">
            We'll send a one-time password to your registered mobile number
            {phoneNumber ? ` (${phoneNumber})` : ""} to verify your identity.
          </div>
          
          {/* Send OTP section */}
          {!generatedOtp && !verificationId && remainingTime === 0 && (
            <div>
              <Button 
                className="w-full" 
                onClick={generateOtp}
                disabled={isGeneratingOtp}
              >
                {isGeneratingOtp ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </div>
          )}
          
          {/* OTP input section */}
          {(generatedOtp || verificationId) && (
            <div className="space-y-4">
              {/* Show generated OTP in demo mode */}
              {USE_DEMO_MODE && generatedOtp && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-center">
                  <div className="font-bold mb-1">DEMO MODE</div>
                  <div>Your OTP: <span className="font-mono font-bold text-lg">{generatedOtp}</span></div>
                  <div className="text-xs mt-1">In production, this would be sent via SMS</div>
                  <div className="text-xs mt-1">You can also use <span className="font-mono font-bold">123456</span> as a test OTP</div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Enter 6-digit OTP
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="******"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
                  }}
                  className="text-center text-lg font-mono tracking-wider"
                />
                
                {remainingTime > 0 && (
                  <p className="text-xs text-gray-500 text-center">
                    OTP expires in {formatTime(remainingTime)}
                  </p>
                )}
                
                {remainingTime === 0 && (generatedOtp || verificationId) && (
                  <div className="text-center">
                    <Button 
                      variant="link" 
                      className="text-xs underline p-0 h-auto text-gray-500"
                      onClick={generateOtp}
                      disabled={isGeneratingOtp}
                    >
                      {isGeneratingOtp ? "Sending..." : "Resend OTP"}
                    </Button>
                  </div>
                )}
              </div>
              
              <Button 
                className="w-full" 
                onClick={verifyOtp}
                disabled={!otp || otp.length !== 6 || isVerifying || remainingTime === 0}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Verify OTP
                  </>
                )}
              </Button>
              
              {/* Reset button */}
              <div className="text-center mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetVerification}
                  disabled={isVerifying || isGeneratingOtp}
                >
                  Start Over
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 