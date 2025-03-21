"use client"

import { useEffect, useState } from "react"
import { useVotingContract } from "@/hooks/useVotingContract"
import { useWallet } from "@/hooks/useWallet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, FileCheck, User, CheckCircle2, XCircle, AlertCircle, ChevronRight, Shield, Phone } from "lucide-react"
import { getVoterRegistration } from "@/lib/firebaseServices"
import { OtpVerification } from "@/components/OtpVerification"

// Check if we're in demo mode
const isDemoMode = process.env.NEXT_PUBLIC_USE_DEMO_MODE === 'true';

export default function VotePage() {
  const { contract, isLoading: contractLoading } = useVotingContract()
  const { account, isConnected } = useWallet()
  const address = account
  
  const [candidates, setCandidates] = useState<{ id: number; name: string; voteCount: number }[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)
  const [isVoted, setIsVoted] = useState<boolean>(false)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [voterData, setVoterData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationStep, setVerificationStep] = useState<'start' | 'otp' | 'vote'>('start')
  const [isOtpVerified, setIsOtpVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (!contract || !address) return
    
    const loadVoterInfo = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const voter = await contract.voters(address)
        setIsRegistered(voter.isRegistered)
        setIsVoted(voter.hasVoted)
        
        if (voter.isRegistered) {
          try {
            // Try to get data from Firebase first
            const voterRegistration = await getVoterRegistration(address)
            if (voterRegistration) {
              // Use firebase data
              setVoterData({
                address,
                requestId: address.substring(0, 8),
                timestamp: voterRegistration.createdAt?.toDate().getTime() || Date.now(),
                aadharNumber: voterRegistration.aadharNumber || "XXXX-XXXX-XXXX",
                mobileNumber: "+91-" + (voterRegistration.phoneNumber || "XXXXXXXXXX")
              })
              return
            }
          } catch (err) {
            console.error("Error fetching from Firebase:", err)
            // Fall back to localStorage
          }
          
          // Fallback to localStorage
          const getLocalVoterData = (addr: string) => {
            try {
              // Try to get from localStorage
              const storedData = localStorage.getItem(`voter_${addr}`)
              if (storedData) {
                return JSON.parse(storedData)
              }
              
              // Fallback minimal data
              return {
                address: addr,
                requestId: addr.substring(0, 8),
                timestamp: Date.now(),
                aadharNumber: "XXXX-XXXX-XXXX", // Default Aadhar number
                mobileNumber: "+91-XXXXXXXXXX"  // Default mobile number
              }
            } catch (err) {
              console.error("Error reading voter data:", err)
              return {
                address: addr,
                requestId: addr.substring(0, 8),
                timestamp: Date.now(),
                aadharNumber: "XXXX-XXXX-XXXX", // Default Aadhar number
                mobileNumber: "+91-XXXXXXXXXX"  // Default mobile number
              }
            }
          }
          
          // Use our local implementation
          const data = getLocalVoterData(address)
          setVoterData(data)
        }
      } catch (err) {
        console.error("Error loading voter data:", err)
        setError("Failed to load voter information. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    loadVoterInfo()
  }, [contract, address])

  // Utility function to check if a candidate is hidden
  const isCandidateHidden = (candidateId: number): boolean => {
    try {
      const hiddenCandidatesStr = localStorage.getItem('deleted_candidates') || '[]';
      const hiddenCandidates = JSON.parse(hiddenCandidatesStr);
      return hiddenCandidates.includes(candidateId);
    } catch (error) {
      console.error("Error checking if candidate is hidden:", error);
      return false;
    }
  };

  // Function to load candidates that respects hidden status
  const loadCandidates = async () => {
    if (!contract) return;
    
    try {
      const candidateCount = await contract.totalCandidates();
      const count = Number(candidateCount);
      
      // Get list of hidden candidates from localStorage - ensure it's fresh every time
      const hiddenCandidatesStr = localStorage.getItem('deleted_candidates') || '[]';
      const hiddenCandidates = JSON.parse(hiddenCandidatesStr);
      console.log("Hidden candidates:", hiddenCandidates);
      
      const candidatesList = [];
      for (let i = 0; i < count; i++) {
        const candidate = await contract.candidates(i);
        const candidateId = Number(candidate.id);
        
        // Skip candidates that were hidden by admin
        if (hiddenCandidates.includes(candidateId)) {
          console.log(`Skipping hidden candidate ${candidateId}`);
          continue;
        }
        
        candidatesList.push({
          id: candidateId,
          name: candidate.name,
          voteCount: Number(candidate.voteCount),
        });
      }
      
      console.log("Visible candidates:", candidatesList.map(c => c.id));
      setCandidates(candidatesList);
      
      // If the currently selected candidate is hidden, deselect it
      if (selectedCandidate !== null && hiddenCandidates.includes(selectedCandidate)) {
        setSelectedCandidate(null);
      }
    } catch (err) {
      console.error("Error loading candidates:", err);
    }
  };
  
  // Load candidates when contract is available
  useEffect(() => {
    // Initial load
    loadCandidates();
    
    // Listen for candidate hidden events
    const handleCandidateHidden = (event: CustomEvent) => {
      console.log("Candidate hidden event received:", event.detail);
      
      // If there's a specific candidate hidden
      if (event.detail && event.detail.candidateId) {
        const hiddenId = event.detail.candidateId;
        
        // If the currently selected candidate is now hidden, reset selection
        if (selectedCandidate === hiddenId) {
          setSelectedCandidate(null);
          toast.warning("The candidate you selected has been removed from the election.");
        }
        
        // Update the list by filtering out the hidden candidate
        setCandidates(prev => prev.filter(c => c.id !== hiddenId));
      } else {
        // If no specific candidate info, reload everything
        loadCandidates();
      }
    };
    
    window.addEventListener('candidateHidden', handleCandidateHidden as EventListener);
    
    return () => {
      window.removeEventListener('candidateHidden', handleCandidateHidden as EventListener);
    };
  }, [contract, selectedCandidate]);

  // Keep the candidates list in sync with hidden status
  useEffect(() => {
    // Filter out any hidden candidates from the current list
    setCandidates(prev => prev.filter(candidate => !isCandidateHidden(candidate.id)));
    
    // Watch for changes to localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'deleted_candidates') {
        // When the hidden candidates list changes, update our candidates list
        loadCandidates();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleOtpVerificationComplete = (verified: boolean) => {
    if (verified) {
      setIsOtpVerified(true);
      setVerificationStep('vote');
      toast.success("Phone number verified successfully. You can now vote.");
    } else {
      setIsOtpVerified(false);
    }
    setIsVerifying(false);
  };

  const handleVote = async () => {
    if (!address) {
      toast.error("Please connect your wallet to vote.")
      return
    }

    if (!isRegistered) {
      toast.error("You are not registered to vote in this election.")
      return
    }

    if (isVoted) {
      toast.error("You have already cast your vote in this election.")
      return
    }

    if (!isOtpVerified) {
      toast.error("Phone verification is required before voting.")
      setVerificationStep('otp')
      return
    }

    if (selectedCandidate === null) {
      toast.error("Please select a candidate to vote for.")
      return
    }

    try {
      setIsLoading(true)
      
      if (contract) {
        const tx = await contract.vote(selectedCandidate)
        await tx.wait()
        
        setIsVoted(true)
        
        toast.success("Your vote has been recorded on the blockchain.")
      }
    } catch (err: any) {
      console.error("Voting error:", err)
      toast.error(err.message || "Failed to cast your vote. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-full bg-yellow-100 p-3 w-12 h-12 mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-8">Please connect your wallet to access the voting system.</p>
        </div>
      </div>
    )
  }

  if (isLoading || contractLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-64 mb-4 mx-auto" />
          <Skeleton className="h-4 w-96 mb-8 mx-auto" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!isRegistered) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-full bg-red-100 p-3 w-12 h-12 mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Not Registered</h2>
          <p className="text-gray-600">You are not registered to vote in this election. Please contact the administrator.</p>
        </div>
      </div>
    )
  }

  if (isVoted) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-full bg-green-100 p-3 w-12 h-12 mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Vote Recorded</h2>
          <p className="text-gray-600">Thank you for participating! Your vote has been recorded on the blockchain.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl py-6 space-y-6">
      <h1 className="text-3xl font-bold">Voting Platform</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Voter Information
            {isRegistered ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="mr-1" size={14} /> Registered
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <XCircle className="mr-1" size={14} /> Not Registered
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Your current voting status and identity information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRegistered && voterData && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <User size={18} />
                      <span className="font-medium">Wallet Address:</span>
                    </div>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded break-all">
                      {address}
                    </code>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <FileCheck size={18} />
                      <span className="font-medium">Registration ID:</span>
                    </div>
                    <span>{voterData.requestId || "Unknown"}</span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <Clock size={18} />
                      <span className="font-medium">Registration Date:</span>
                    </div>
                    <span>
                      {voterData.timestamp 
                        ? new Date(voterData.timestamp).toLocaleDateString() 
                        : "Unknown"}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-id-card">
                        <rect width="18" height="16" x="3" y="4" rx="2"/>
                        <path d="M9 10h.01"/>
                        <path d="M15 10h.01"/>
                        <path d="M9 14h6"/>
                      </svg>
                      <span className="font-medium">Aadhar Number:</span>
                    </div>
                    <span className="font-mono">{voterData.aadharNumber || "XXXX-XXXX-XXXX"}</span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <span className="font-medium">Mobile Number:</span>
                    </div>
                    <span>{voterData.mobileNumber || "+91-XXXXXXXXXX"}</span>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <span className="font-medium">Voting Status:</span>
                    </div>
                    {isVoted ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <CheckCircle2 className="mr-1" size={14} /> Vote Cast
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="mr-1" size={14} /> Not Voted
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(!isRegistered || !voterData) && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Voting Status:</span>
              {isVoted ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <CheckCircle2 className="mr-1" size={14} /> Vote Cast
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Clock className="mr-1" size={14} /> Not Voted
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isRegistered && (
        <Card>
          <CardHeader>
            <CardTitle>Cast Your Vote</CardTitle>
            <CardDescription>
              Select a candidate and cast your vote for the election.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {!isRegistered ? (
              <div className="text-amber-600">Not registered to vote in this election.</div>
            ) : isVoted ? (
              <div className="text-green-600">You have already cast your vote in this election.</div>
            ) : (
              // Voter is registered and hasn't voted yet
              // Main voting process
              <>
                {verificationStep === 'start' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-4 mb-4">
                      <h3 className="font-semibold flex items-center mb-2">
                        <Shield className="mr-2" size={18} />
                        Phone Verification Required
                      </h3>
                      <p className="text-sm">
                        To ensure election integrity, you must verify your identity through phone verification
                        before casting your vote. A one-time password (OTP) will be sent to your registered mobile number.
                      </p>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={() => setVerificationStep('otp')}
                      disabled={isVoted}
                    >
                      Start Phone Verification
                      <ChevronRight className="ml-2" size={16} />
                    </Button>
                  </div>
                )}
                
                {verificationStep === 'otp' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4 mb-2">
                      <h3 className="font-semibold flex items-center mb-2">
                        <Phone className="mr-2" size={18} />
                        Identity Verification
                      </h3>
                      <p className="text-sm mb-2">
                        Please verify your mobile number to confirm your identity.
                        This ensures one person, one vote integrity.
                      </p>
                      
                      {isDemoMode ? (
                        <div className="bg-white bg-opacity-30 p-2 rounded text-sm border border-blue-200">
                          <strong>DEMO MODE:</strong> The OTP will be displayed on screen for testing purposes. 
                          In a production environment, it would be sent via SMS to {voterData?.mobileNumber || "your registered number"}.
                        </div>
                      ) : (
                        <div className="bg-white bg-opacity-30 p-2 rounded text-sm border border-blue-200">
                          <strong>PRODUCTION MODE:</strong> An OTP will be sent via SMS to your registered number {voterData?.mobileNumber || ""}. 
                          Please complete the reCAPTCHA verification to receive the OTP.
                        </div>
                      )}
                    </div>
                    
                    <OtpVerification 
                      phoneNumber={voterData?.mobileNumber || ""}
                      onVerificationComplete={handleOtpVerificationComplete}
                    />
                  </div>
                )}
                
                {verificationStep === 'vote' && (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 text-green-800 rounded-md p-4 mb-2">
                      <h3 className="font-semibold flex items-center mb-2">
                        <CheckCircle2 className="mr-2" size={18} />
                        Identity Verified
                      </h3>
                      <p className="text-sm">
                        Your phone number has been verified. You can now cast your vote for your preferred candidate.
                      </p>
                    </div>
                    
                    <Tabs defaultValue="candidates" className="w-full">
                      <TabsList className="grid w-full grid-cols-1">
                        <TabsTrigger value="candidates">Candidates</TabsTrigger>
                      </TabsList>
                      <TabsContent value="candidates" className="mt-4">
                        <div className="space-y-4">
                          {candidates.filter(c => !isCandidateHidden(c.id)).length > 0 ? (
                            candidates
                              .filter(c => !isCandidateHidden(c.id))
                              .map((candidate) => (
                                <div
                                  key={candidate.id}
                                  className={`p-4 border rounded-md cursor-pointer transition-all ${
                                    selectedCandidate === candidate.id
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/50"
                                  }`}
                                  onClick={() => !isVoted && setSelectedCandidate(candidate.id)}
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{candidate.name}</span>
                                      <span className="text-sm text-gray-500">Candidate #{candidate.id}</span>
                                    </div>
                                    {selectedCandidate === candidate.id && (
                                      <CheckCircle2 className="text-blue-500" size={24} />
                                    )}
                                  </div>
                                </div>
                              ))
                          ) : (
                            <p className="text-amber-600 italic">No candidates available.</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {verificationStep !== 'start' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  if (verificationStep === 'otp') {
                    setVerificationStep('start');
                  } else if (verificationStep === 'vote') {
                    setVerificationStep('otp');
                  }
                }}
                disabled={isLoading || isVoted}
              >
                Back
              </Button>
            )}
            
            {verificationStep === 'vote' && (
              <Button
                onClick={handleVote}
                disabled={selectedCandidate === null || isLoading || isVoted}
                className={isVoted ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isLoading ? "Processing..." : isVoted ? "Vote Cast Successfully" : "Cast Vote"}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {!isRegistered && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Not Registered to Vote</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700">
              You are not registered to vote in this election. Please visit the registration page to request voter registration.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild>
              <a href="/request-voter">Request Voter Registration</a>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

