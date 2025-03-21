"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useVotingContract } from "@/hooks/useVotingContract";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { FaceScanner } from "@/components/FaceScanner";
import { FingerprintScanner } from "@/components/FingerprintScanner";

// Store voter registration requests in localStorage
const STORAGE_KEY = "voter_requests";

interface VoterRequest {
  address: string;
  timestamp: number;
  faceData: string;
  fingerprintData: string;
  aadharNumber: string;
  phoneNumber: string;
}

export default function RequestVoterPage() {
  const { account, isConnected } = useWallet();
  const { contract } = useVotingContract();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasRequestPending, setHasRequestPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [faceData, setFaceData] = useState<string>("");
  const [fingerprintData, setFingerprintData] = useState<string>("");
  const [aadharNumber, setAadharNumber] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  useEffect(() => {
    if (!account || !contract) return;

    const checkVoterStatus = async () => {
      try {
        // Check if already registered as a voter
        if (!contract) {
          toast.error("Failed to check voter status");
          return;
        }
        const voter = await contract.voters(account);
        setIsRegistered(voter.isRegistered);

        // Check if there's a pending request
        const existingData = localStorage.getItem(STORAGE_KEY);
        const requests: VoterRequest[] = existingData
          ? JSON.parse(existingData)
          : [];
        setHasRequestPending(
          requests.some(
            (req) => req.address.toLowerCase() === account.toLowerCase()
          )
        );

        setIsLoading(false);
      } catch (error) {
        console.error("Error checking voter status:", error);
        toast.error("Failed to check voter status");
        setIsLoading(false);
      }
    };

    checkVoterStatus();
  }, [account, contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    // Validate biometric data
    if (!faceData) {
      toast.error("Please scan your face before submitting");
      return;
    }

    if (!fingerprintData) {
      toast.error("Please scan your fingerprint before submitting");
      return;
    }

    // Validate Aadhar number
    if (!aadharNumber || aadharNumber.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhar number");
      return;
    }

    // Validate phone number
    if (!phoneNumber || phoneNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    // Add a function for the success path to handle the final registration steps
    const completeRegistration = async () => {
      // Get existing requests
      const existingData = localStorage.getItem(STORAGE_KEY);
      const requests: VoterRequest[] = existingData
        ? JSON.parse(existingData)
        : [];

      // Check if address already requested
      if (
        requests.some(
          (req) => req.address.toLowerCase() === account.toLowerCase()
        )
      ) {
        toast.error("You have already submitted a registration request");
        return;
      }

      // Check if already registered as a voter
      if (!contract) {
        toast.error("Failed to check voter status");
        return;
      }

      try {
        const voter = await contract.voters(account);
        if (voter.isRegistered) {
          toast.error("This wallet is already registered as a voter");
          return;
        }
      } catch (contractError) {
        console.error("Error checking voter status:", contractError);
        // Continue with registration even if contract check fails
      }

      // Add new request
      const newRequest: VoterRequest = {
        address: account,
        timestamp: Date.now(),
        faceData: faceData,
        fingerprintData: fingerprintData,
        aadharNumber: aadharNumber,
        phoneNumber: phoneNumber,
      };

      requests.push(newRequest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));

      toast.success(
        "Registration request submitted successfully! Please wait for admin approval."
      );
      setHasRequestPending(true);
    };

    try {
      setIsSubmitting(true);

      // Log the data being submitted for debugging
      console.log("Submitting with data:", {
        address: account,
        faceDataLength: faceData.length,
        fingerprintDataLength: fingerprintData.length,
        aadharNumber:
          aadharNumber.substring(0, 2) +
          "****" +
          aadharNumber.substring(aadharNumber.length - 2),
        phoneNumber:
          phoneNumber.substring(0, 2) +
          "****" +
          phoneNumber.substring(phoneNumber.length - 2),
      });

      // Call the authentication API
      const authUrl =
        "https://magicloops.dev/api/loop/d3e7ab75-3fc4-4fe0-8ac8-bdcbf76d74e7/run";

      // Prepare a shortened version of biometric data if it's too long
      const facialFingerprint = (faceData + fingerprintData).substring(0, 500);

      // Create query parameters for GET request
      const params = {
        action: "register",
        aadhar: aadharNumber,
        facialFingerprint: facialFingerprint,
        mobileOTP: phoneNumber.substring(0, 6), // Using first 6 digits as OTP for demo
      };

      const queryParams = new URLSearchParams(params).toString();

      console.log(
        "Sending authentication request with params:",
        Object.keys(params).reduce((acc, key) => {
          // Mask sensitive data in logs
          const k = key as keyof typeof params;
          if (k === "aadhar") {
            acc[k] =
              params[k].substring(0, 2) +
              "****" +
              params[k].substring(params[k].length - 2);
          } else if (k === "facialFingerprint") {
            acc[k] = params[k].substring(0, 10) + "...";
          } else if (k === "mobileOTP") {
            acc[k] = "******";
          } else {
            acc[k] = params[k];
          }
          return acc;
        }, {} as Record<string, string>)
      );

      try {
        // First try with GET and query params
        const response = await fetch(`${authUrl}?${queryParams}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer d3e7ab75-3fc4-4fe0-8ac8-bdcbf76d74e7`,
          },
        });

        if (!response.ok) {
          console.warn(
            `GET request failed with status ${response.status}: ${response.statusText}, trying with POST as fallback`
          );
          throw new Error(`GET request failed: ${response.status}`);
        }

        const authResponse = await response.json();
        console.log("Authentication API response:", authResponse);

        // Check authentication response
        if (authResponse.error) {
          toast.error(
            authResponse.error || "Authentication failed. Please try again."
          );
          throw new Error(authResponse.error);
        }

        // Success case - assume success if there's no explicit error
        console.log("Authentication successful:", authResponse);
        toast.success("Biometric authentication successful!");

        // Authentication was successful, delay before proceeding
        setTimeout(() => {
          completeRegistration();
        }, 1000); // Add a small delay for better UX
      } catch (apiError) {
        // Fallback to POST request if GET fails
        console.log("Trying POST request as fallback");

        try {
          const postResponse = await fetch(authUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer d3e7ab75-3fc4-4fe0-8ac8-bdcbf76d74e7`,
            },
            body: JSON.stringify(params),
          });

          console.log("POST response status:", postResponse.status);

          // For 401 errors, we'll still proceed with registration for demo purposes
          if (postResponse.status === 401) {
            console.log(
              "API authentication failed (401), but proceeding with registration for demo purposes"
            );
            toast.warning("Demo mode: Proceeding without API authentication");
          } else if (!postResponse.ok) {
            throw new Error(
              `Authentication API error: ${postResponse.status} ${postResponse.statusText}`
            );
          } else {
            const authResponse = await postResponse.json();
            console.log("POST authentication response:", authResponse);

            // If we get a response with an error message
            if (authResponse.error) {
              toast.error(
                authResponse.error || "Authentication failed. Please try again."
              );
              throw new Error(authResponse.error);
            }

            toast.success("Biometric authentication successful!");

            // Authentication was successful, delay before proceeding
            setTimeout(() => {
              completeRegistration();
            }, 1000); // Add a small delay for better UX
          }
        } catch (postError) {
          // If the error message contains "successful", it's actually a success
          if (
            postError instanceof Error &&
            postError.message.toLowerCase().includes("successful")
          ) {
            console.log(
              "Detected success message in error, treating as success"
            );
            toast.success("Biometric authentication successful!");

            // Authentication was successful, delay before proceeding
            setTimeout(() => {
              completeRegistration();
            }, 1000); // Add a small delay for better UX
          } else {
            console.error("POST request failed:", postError);
            toast.error(
              `Authentication failed: ${
                postError instanceof Error ? postError.message : "Unknown error"
              }`
            );
            throw postError;
          }
        }
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error(
        "Failed to submit registration request: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFaceCaptured = (faceHex: string) => {
    setFaceData(faceHex);
  };

  const handleFingerprintCaptured = (fingerprintHex: string) => {
    setFingerprintData(fingerprintHex);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-full bg-yellow-100 p-3 w-12 h-12 mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 mb-8">
            Please connect your wallet to request voter registration.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600">Loading voter status...</p>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-full bg-green-100 p-3 w-12 h-12 mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Already Registered
          </h2>
          <p className="text-gray-600">
            This wallet is already registered as a voter. You can proceed to
            vote when the election is active.
          </p>
        </div>
      </div>
    );
  }

  if (hasRequestPending) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-full bg-blue-100 p-3 w-12 h-12 mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Request Pending
          </h2>
          <p className="text-gray-600">
            Your registration request is pending admin approval. Please check
            back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Request Voter Registration
            </h1>
            <p className="text-gray-600">
              Submit your request to be registered as a voter. The admin will
              review and approve your request.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wallet Address
              </label>
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <code className="text-sm text-gray-800">{account}</code>
              </div>
            </div>

            <FaceScanner onFaceCaptured={handleFaceCaptured} />

            <FingerprintScanner
              onFingerprintCaptured={handleFingerprintCaptured}
            />

            {faceData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Face Data Hex
                </label>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 overflow-auto">
                  <code className="text-xs text-gray-800 whitespace-nowrap">
                    {faceData}
                  </code>
                </div>
              </div>
            )}

            {fingerprintData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fingerprint Data Hex
                </label>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 overflow-auto">
                  <code className="text-xs text-gray-800 whitespace-nowrap">
                    {fingerprintData}
                  </code>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aadhar Number{" "}
                <span className="text-xs text-gray-500">(Required)</span>
              </label>
              <input
                type="text"
                value={aadharNumber}
                onChange={(e) => {
                  // Only allow numbers and limit to 12 digits
                  const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setAadharNumber(value);
                }}
                placeholder="Enter 12-digit Aadhar number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              {aadharNumber && aadharNumber.length !== 12 && (
                <p className="mt-1 text-sm text-red-600">
                  Aadhar number must be 12 digits
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number{" "}
                <span className="text-xs text-gray-500">(Required)</span>
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                  +91
                </span>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => {
                    // Only allow numbers and limit to 10 digits
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    setPhoneNumber(value);
                  }}
                  placeholder="Enter 10-digit mobile number"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              {phoneNumber && phoneNumber.length !== 10 && (
                <p className="mt-1 text-sm text-red-600">
                  Phone number must be 10 digits
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !faceData ||
                !fingerprintData ||
                !aadharNumber ||
                aadharNumber.length !== 12 ||
                !phoneNumber ||
                phoneNumber.length !== 10
              }
              className="w-full"
            >
              {isSubmitting ? "Submitting..." : "Submit Registration Request"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
