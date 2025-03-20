"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/useWallet"
import { useVotingContract } from "@/hooks/useVotingContract"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, Play, Square, UserPlus } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Candidate } from "@/lib/contract"

export default function AdminPage() {
  const { account } = useWallet()
  const { contract, admin, votingActive, totalCandidates, totalVotes } = useVotingContract()

  const [newCandidateName, setNewCandidateName] = useState("")
  const [voterAddress, setVoterAddress] = useState("")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
      }
    }

    fetchCandidates()
  }, [contract, totalCandidates])

  // Check if user is admin
  const isAdmin = account && admin && account.toLowerCase() === admin.toLowerCase()

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>Please connect your wallet to access the admin page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Only the admin can access this page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleAddCandidate = async () => {
    if (!newCandidateName.trim()) {
      setError("Please enter a candidate name")
      return
    }

    try {
      setError(null)
      const tx = await contract?.addCandidate(newCandidateName)
      await tx.wait()
      setSuccess(`Candidate "${newCandidateName}" added successfully!`)
      setNewCandidateName("")
    } catch (err: any) {
      console.error("Error adding candidate:", err)
      setError(err.reason || "Failed to add candidate. Please try again.")
    }
  }

  const handleRegisterVoter = async () => {
    if (!voterAddress.trim()) {
      setError("Please enter a voter address")
      return
    }

    try {
      setError(null)
      const tx = await contract?.registerVoter(voterAddress)
      await tx.wait()
      setSuccess(`Voter ${voterAddress} registered successfully!`)
      setVoterAddress("")
    } catch (err: any) {
      console.error("Error registering voter:", err)
      setError(err.reason || "Failed to register voter. Please try again.")
    }
  }

  const handleStartVoting = async () => {
    try {
      setError(null)
      const tx = await contract?.startVoting()
      await tx.wait()
      setSuccess("Voting started successfully!")
    } catch (err: any) {
      console.error("Error starting voting:", err)
      setError(err.reason || "Failed to start voting. Please try again.")
    }
  }

  const handleEndVoting = async () => {
    try {
      setError(null)
      const tx = await contract?.endVoting()
      await tx.wait()
      setSuccess("Voting ended successfully!")
    } catch (err: any) {
      console.error("Error ending voting:", err)
      setError(err.reason || "Failed to end voting. Please try again.")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Admin Dashboard</h1>
        <p className="text-center text-gray-600 mb-8">Manage your blockchain voting system</p>

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

        <Tabs defaultValue="voting" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="voting">Voting Control</TabsTrigger>
            <TabsTrigger value="voters">Voter Management</TabsTrigger>
          </TabsList>

          <TabsContent value="voting">
            <Card>
              <CardHeader>
                <CardTitle>Voting Status</CardTitle>
                <CardDescription>Control the voting process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Voting Status</p>
                      <p className="text-sm text-gray-500">{votingActive ? "Active" : "Inactive"}</p>
                    </div>
                    <div className="space-x-2">
                      <Button onClick={handleStartVoting} disabled={votingActive}>
                        <Play className="mr-2 h-4 w-4" />
                        Start Voting
                      </Button>
                      <Button onClick={handleEndVoting} disabled={!votingActive} variant="destructive">
                        <Square className="mr-2 h-4 w-4" />
                        End Voting
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Total Votes</p>
                    <p className="text-sm text-gray-500">{totalVotes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Add Candidate</CardTitle>
                <CardDescription>Add a new candidate to the election</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="candidateName">Candidate Name</Label>
                    <Input
                      id="candidateName"
                      placeholder="Enter candidate name"
                      value={newCandidateName}
                      onChange={(e) => setNewCandidateName(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleAddCandidate} disabled={!newCandidateName.trim()}>
                  Add Candidate
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="voters">
            <Card>
              <CardHeader>
                <CardTitle>Register Voter</CardTitle>
                <CardDescription>Add a new voter to the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="voterAddress">Voter Wallet Address</Label>
                    <Input
                      id="voterAddress"
                      placeholder="0x..."
                      value={voterAddress}
                      onChange={(e) => setVoterAddress(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleRegisterVoter} disabled={!voterAddress.trim()}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register Voter
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

