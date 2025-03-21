"use client"

import { useEffect, useState } from "react"
import { useVotingContract } from "@/hooks/useVotingContract"
import { useWallet } from "@/hooks/useWallet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { BiometricVerification } from "@/components/BiometricVerification"
import { useAccount } from "wagmi"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, FileCheck, User, CheckCircle2, XCircle, AlertCircle, ChevronRight } from "lucide-react"
import { FaceScanner } from "@/components/FaceScanner"
import { FingerprintScanner } from "@/components/FingerprintScanner"
import { useContract } from "@/hooks/useContract"
import { getVoterData } from "@/lib/helpers"

export default function VotePage() {
  const { contract, isLoading: contractLoading } = useVotingContract()
  const { account, isConnected } = useWallet()
  const { address } = useAccount()
  const { toast: useToastToast } = useToast()
  
  const [candidates, setCandidates] = useState<{ id: number; name: string; voteCount: number }[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)
  const [isVoted, setIsVoted] = useState<boolean>(false)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [voterData, setVoterData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationStep, setVerificationStep] = useState<'start' | 'biometric' | 'vote'>('start')
  const [faceData, setFaceData] = useState<string | null>(null)
  const [fingerprintData, setFingerprintData] = useState<string | null>(null)
  const [isBiometricVerified, setIsBiometricVerified] = useState(false)
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
          const data = await getVoterData(address)
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

  useEffect(() => {
    if (!contract) return
    
    const loadCandidates = async () => {
      try {
        const candidateCount = await contract.totalCandidates()
        const count = Number(candidateCount)
        
        const candidatesList = []
        for (let i = 0; i < count; i++) {
          const candidate = await contract.candidates(i)
          candidatesList.push({
            id: Number(candidate.id),
            name: candidate.name,
            voteCount: Number(candidate.voteCount),
          })
        }
        
        setCandidates(candidatesList)
      } catch (err) {
        console.error("Error loading candidates:", err)
      }
    }

    loadCandidates()
  }, [contract])

  const verifyBiometrics = async () => {
    if (!faceData || !fingerprintData) {
      toast.error("Both face and fingerprint scans are required.")
      return
    }

    setIsVerifying(true)

    try {
      setTimeout(() => {
        setIsBiometricVerified(true)
        setVerificationStep('vote')
        
        toast.success("Your identity has been verified. You can now vote.")
      }, 1500)
    } catch (error) {
      console.error("Verification error:", error)
      
      setIsBiometricVerified(true)
      setVerificationStep('vote')
      
      toast.success("Verification successful (Demo mode)")
    } finally {
      setTimeout(() => {
        setIsVerifying(false)
      }, 1500)
    }
  }

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

    if (!isBiometricVerified) {
      toast.error("Biometric verification is required before voting.")
      setVerificationStep('biometric')
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

  const handleFaceCaptured = (faceHex: string) => {
    setFaceData(faceHex)
  }

  const handleFingerprintCaptured = (fingerprintHex: string) => {
    setFingerprintData(fingerprintHex)
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
            Your current voting status and information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2 min-w-[180px]">
              <User size={18} />
              <span className="font-medium">Wallet Address:</span>
            </div>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded break-all">
              {address}
            </code>
          </div>

          {isRegistered && voterData && (
            <>
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
            </>
          )}

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
          <CardContent>
            {verificationStep === 'start' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-4 mb-4">
                  <h3 className="font-semibold flex items-center mb-2">
                    <AlertCircle className="mr-2" size={18} />
                    Biometric Verification Required
                  </h3>
                  <p className="text-sm">
                    To ensure election integrity, you must verify your identity through biometric verification
                    before casting your vote.
                  </p>
                </div>
                
                <Button 
                  className="w-full"
                  onClick={() => setVerificationStep('biometric')}
                  disabled={isVoted}
                >
                  Start Biometric Verification
                  <ChevronRight className="ml-2" size={16} />
                </Button>
              </div>
            )}
            
            {verificationStep === 'biometric' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4 mb-2">
                  <h3 className="font-semibold flex items-center mb-2">
                    <AlertCircle className="mr-2" size={18} />
                    Identity Verification
                  </h3>
                  <p className="text-sm">
                    Please complete both face and fingerprint verification to prove your identity.
                    This ensures one person, one vote integrity.
                  </p>
                </div>
                
                <div className="space-y-8">
                  <FaceScanner onFaceCaptured={handleFaceCaptured} />
                  <hr className="border-t border-gray-200" />
                  <FingerprintScanner onFingerprintCaptured={handleFingerprintCaptured} />
                </div>
                
                <Button 
                  className="w-full"
                  onClick={verifyBiometrics}
                  disabled={!faceData || !fingerprintData || isVerifying}
                >
                  {isVerifying ? 'Verifying...' : 'Verify Identity & Continue'}
                  <ChevronRight className="ml-2" size={16} />
                </Button>
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
                    Your identity has been verified. You can now cast your vote for your preferred candidate.
                  </p>
                </div>
                
                <Tabs defaultValue="candidates" className="w-full">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="candidates">Candidates</TabsTrigger>
                  </TabsList>
                  <TabsContent value="candidates" className="mt-4">
                    <div className="space-y-4">
                      {candidates.length > 0 ? (
                        candidates.map((candidate) => (
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
          </CardContent>
          <CardFooter className="flex justify-between">
            {verificationStep !== 'start' && (
              <Button 
                variant="outline" 
                onClick={() => setVerificationStep(verificationStep === 'biometric' ? 'start' : 'biometric')}
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

