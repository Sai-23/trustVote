"use client"

import { useState, useEffect } from "react"
import type { Candidate } from "@/lib/contract"
import { useVotingContract } from "@/hooks/useVotingContract"
import { useWallet } from "@/hooks/useWallet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function VotePage() {
  const { account } = useWallet()
  const { contract, votingActive, totalCandidates } = useVotingContract()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [voterInfo, setVoterInfo] = useState<{ isRegistered: boolean; hasVoted: boolean }>({ 
    isRegistered: false, 
    hasVoted: false 
  })

  // Fetch voter info
  useEffect(() => {
    const checkVoter = async () => {
      if (!contract || !account) return
      try {
        const voter = await contract.voters(account)
        setVoterInfo({
          isRegistered: voter.isRegistered,
          hasVoted: voter.hasVoted
        })
      } catch (err) {
        console.error("Error checking voter:", err)
      }
    }
    checkVoter()
  }, [contract, account])

  // Fetch all candidates
  useEffect(() => {
    const fetchCandidates = async () => {
      if (!contract || !totalCandidates) return

      try {
        const candidatesList: Candidate[] = []
        for (let i = 0; i < totalCandidates; i++) {
          const candidate = await contract.getCandidate(i)
          candidatesList.push({
            id: Number(candidate.id),
            name: candidate.name,
            voteCount: Number(candidate.voteCount),
          })
        }
        setCandidates(candidatesList)
      } catch (err) {
        console.error("Error fetching candidates:", err)
        setError("Failed to load candidates. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCandidates()
  }, [contract, totalCandidates])

  const handleVote = async () => {
    if (!account) {
      setError("Please connect your wallet first")
      return
    }

    if (selectedCandidate === null) {
      setError("Please select a candidate")
      return
    }

    try {
      setError(null)
      const tx = await contract?.vote(selectedCandidate)
      await tx.wait()
      setSuccess("Your vote has been cast successfully!")
      setSelectedCandidate(null)
      
      // Refresh voter info
      const voter = await contract?.voters(account)
      setVoterInfo({
        isRegistered: voter.isRegistered,
        hasVoted: voter.hasVoted
      })
    } catch (err: any) {
      console.error("Error voting:", err)
      setError(err.reason || "Failed to cast vote. Please try again.")
    }
  }

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>Please connect your wallet to access the voting page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!voterInfo.isRegistered) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Registered</AlertTitle>
          <AlertDescription>You are not registered to vote. Please contact the admin.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!votingActive) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Voting Not Active</AlertTitle>
          <AlertDescription>The voting period has not started or has ended.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (voterInfo.hasVoted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="max-w-md mx-auto bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Already Voted</AlertTitle>
          <AlertDescription className="text-green-700">You have already cast your vote.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Cast Your Vote</h1>
        <p className="text-center text-gray-600 mb-8">Select a candidate and submit your vote</p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((candidate) => (
            <Card 
              key={candidate.id} 
              className={`cursor-pointer transition-colors ${
                selectedCandidate === candidate.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setSelectedCandidate(candidate.id)}
            >
              <CardHeader>
                <CardTitle>{candidate.name}</CardTitle>
                <CardDescription>Candidate #{candidate.id + 1}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button 
            onClick={handleVote} 
            disabled={selectedCandidate === null}
            size="lg"
          >
            Submit Vote
          </Button>
        </div>
      </div>
    </div>
  )
}

