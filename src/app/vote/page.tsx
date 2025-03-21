"use client"

import { useEffect, useState } from "react"
import { useVotingContract } from "@/hooks/useVotingContract"
import { useWallet } from "@/hooks/useWallet"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { BiometricVerification } from "@/components/BiometricVerification"

export default function VotePage() {
  const { contract, isLoading: contractLoading } = useVotingContract()
  const { account, isConnected } = useWallet()
  
  const [candidates, setCandidates] = useState<string[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [verificationData, setVerificationData] = useState<{faceData: string, fingerprintData: string} | null>(null)
  const [isFetchingVerificationData, setIsFetchingVerificationData] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [showVerification, setShowVerification] = useState(false)

  useEffect(() => {
    if (!contract || !account) return
    
    const loadVoterInfo = async () => {
      try {
        const voter = await contract.voters(account)
        setIsRegistered(voter.isRegistered)
        setHasVoted(voter.hasVoted)
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading voter info:", error)
        toast.error("Failed to load voter information")
        setIsLoading(false)
      }
    }

    loadVoterInfo()
  }, [contract, account])

  useEffect(() => {
    if (!contract) return
    
    const loadCandidates = async () => {
      try {
        const totalCandidatesCount = await contract.totalCandidates()
        const candidatePromises = []
        
        for (let i = 0; i < totalCandidatesCount; i++) {
          candidatePromises.push(contract.candidates(i))
        }
        
        const candidateResults = await Promise.all(candidatePromises)
        setCandidates(candidateResults.map(candidate => candidate.name))
      } catch (error) {
        console.error("Error loading candidates:", error)
        toast.error("Failed to load candidates")
      }
    }

    loadCandidates()
  }, [contract])

  // Fetch voter verification data when needed
  const fetchVerificationData = async () => {
    if (!account || !isRegistered) return
    
    try {
      setIsFetchingVerificationData(true)
      
      const response = await fetch(`/api/verify-voter?address=${account}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // For demo/development, if the voter is not found in our database
          // but is registered on-chain, we'll use dummy verification data
          setVerificationData({
            faceData: "0x123456789abcdef", // Dummy face data
            fingerprintData: "0x987654321fedcba" // Dummy fingerprint data
          })
          console.warn("Using dummy verification data for development")
        } else {
          throw new Error(`Failed to fetch verification data: ${response.statusText}`)
        }
      } else {
        const data = await response.json()
        setVerificationData(data)
      }
      
      setShowVerification(true)
    } catch (error) {
      console.error("Error fetching verification data:", error)
      toast.error("Failed to fetch verification data")
      // For demo purposes, use dummy data even on error
      setVerificationData({
        faceData: "0x123456789abcdef", // Dummy face data
        fingerprintData: "0x987654321fedcba" // Dummy fingerprint data
      })
      setShowVerification(true)
    } finally {
      setIsFetchingVerificationData(false)
    }
  }

  const handleStartVoting = () => {
    fetchVerificationData()
  }

  const handleVerificationComplete = (success: boolean) => {
    setIsVerified(success)
    if (success) {
      toast.success("Identity verified successfully! You can now vote.")
    }
  }

  const handleVote = async () => {
    if (!contract || selectedCandidate === null || !isVerified) return
    
    try {
      setIsVoting(true)
      const tx = await contract.vote(selectedCandidate)
      await tx.wait()
      
      setHasVoted(true)
      toast.success("Your vote has been recorded successfully!")
    } catch (error: any) {
      console.error("Error voting:", error)
      let errorMessage = "Failed to submit vote"

      if (error.message.includes("not registered")) {
        errorMessage = "You are not registered to vote"
      } else if (error.message.includes("already voted")) {
        errorMessage = "You have already voted"
      } else if (error.message.includes("Invalid candidate")) {
        errorMessage = "Invalid candidate selection"
      } else if (error.message.includes("not active")) {
        errorMessage = "Voting is not currently active"
      }

      toast.error(errorMessage)
    } finally {
      setIsVoting(false)
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

  if (hasVoted) {
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
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Cast Your Vote</h1>
          <p className="text-gray-600">Select your preferred candidate from the list below.</p>
        </div>

        {showVerification && verificationData ? (
          // Show biometric verification first
          <div className="mb-12">
            <BiometricVerification 
              faceData={verificationData.faceData}
              fingerprintData={verificationData.fingerprintData}
              onVerificationComplete={handleVerificationComplete}
            />
          </div>
        ) : !isVerified ? (
          // Show start voting button
          <div className="mb-12 text-center">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Identity Verification Required</h2>
              <p className="text-gray-600 mb-6">
                To ensure the integrity of the voting process, we need to verify your identity before you can vote.
              </p>
              <Button
                onClick={handleStartVoting}
                disabled={isFetchingVerificationData}
                className="w-full sm:w-auto"
              >
                {isFetchingVerificationData ? "Loading..." : "Start Verification"}
              </Button>
            </Card>
          </div>
        ) : null}

        {isVerified && (
          <>
            <div className="grid gap-4">
              {candidates.map((candidate, index) => (
                <Card
                  key={index}
                  className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                    selectedCandidate === index ? "ring-2 ring-indigo-500 bg-indigo-50" : ""
                  }`}
                  onClick={() => setSelectedCandidate(index)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedCandidate === index ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
                    }`}>
                      {selectedCandidate === index && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-lg font-medium text-gray-900">{candidate}</span>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleVote}
                disabled={selectedCandidate === null || isVoting}
                className="w-full sm:w-auto"
              >
                {isVoting ? "Recording Vote..." : "Submit Vote"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

