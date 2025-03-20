"use client"

import { useEffect, useState } from "react"
import { useVotingContract } from "@/hooks/useVotingContract"
import { useWallet } from "@/hooks/useWallet"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

interface VoterRequest {
  address: string
  timestamp: number
}

export default function AdminPage() {
  const { contract, isLoading: contractLoading } = useVotingContract()
  const { account, isConnected, isAdmin } = useWallet()
  
  const [votingActive, setVotingActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [voterRequests, setVoterRequests] = useState<VoterRequest[]>([])
  const [selectedVoters, setSelectedVoters] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!contract) return

    const loadVotingStatus = async () => {
      try {
        const status = await contract.votingActive()
        setVotingActive(status)
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading voting status:", error)
        toast.error("Failed to load voting status")
        setIsLoading(false)
      }
    }

    loadVotingStatus()
  }, [contract])

  useEffect(() => {
    // Load voter requests from localStorage
    const storedVoters = localStorage.getItem("voter_requests")
    if (storedVoters) {
      const parsedData: VoterRequest[] = JSON.parse(storedVoters)
      setVoterRequests(parsedData)
    }
  }, [])

  const handleToggleVoting = async () => {
    if (!contract) return
    
    try {
      setIsProcessing(true)
      const tx = votingActive ? 
        await contract.endVoting() : 
        await contract.startVoting()
      await tx.wait()
      
      setVotingActive(!votingActive)
      toast.success(`Voting has been ${votingActive ? "ended" : "started"}`)
    } catch (error: any) {
      console.error("Error toggling voting:", error)
      let errorMessage = "Failed to toggle voting status"
      
      if (error.message.includes("Only admin")) {
        errorMessage = "Only admin can perform this action"
      } else if (error.message.includes("already active")) {
        errorMessage = "Voting is already active"
      } else if (error.message.includes("not active")) {
        errorMessage = "Voting is not active"
      }
      
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveVoters = async () => {
    if (!contract || selectedVoters.length === 0) return

    try {
      setIsProcessing(true)
      
      // Process each selected voter
      for (const address of selectedVoters) {
        try {
          const tx = await contract.registerVoter(address)
          await tx.wait()
          toast.success(`Registered voter: ${address}`)
        } catch (error: any) {
          console.error(`Error registering voter ${address}:`, error)
          let errorMessage = `Failed to register voter: ${address}`
          
          if (error.message.includes("Only admin")) {
            errorMessage = "Only admin can register voters"
          }
          
          toast.error(errorMessage)
        }
      }

      // Remove processed voter requests from localStorage
      const updatedRequests = voterRequests.filter(
        r => !selectedVoters.includes(r.address)
      )
      localStorage.setItem("voter_requests", JSON.stringify(updatedRequests))
      setVoterRequests(updatedRequests)
      setSelectedVoters([])
      
    } catch (error) {
      console.error("Error processing voters:", error)
      toast.error("Failed to process voters")
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleVoter = (address: string) => {
    setSelectedVoters(prev => 
      prev.includes(address)
        ? prev.filter(a => a !== address)
        : [...prev, address]
    )
  }

  if (!isConnected || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-full bg-red-100 p-3 w-12 h-12 mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-2">Only the admin can access this page.</p>
          {account && (
            <p className="text-sm text-gray-500">Current address: {account}</p>
          )}
        </div>
      </div>
    )
  }

  if (isLoading || contractLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid gap-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
          <p className="text-gray-600">Manage voters and voting process</p>
        </div>

        <Tabs defaultValue="voters" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="voters">Voter Registration</TabsTrigger>
            <TabsTrigger value="voting">Voting Control</TabsTrigger>
          </TabsList>

          <TabsContent value="voters">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Pending Voter Requests</h2>
              
              {voterRequests.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No pending voter requests</p>
              ) : (
                <div className="space-y-4">
                  {voterRequests.map((request) => (
                    <div
                      key={request.address}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <Checkbox
                        checked={selectedVoters.includes(request.address)}
                        onCheckedChange={() => toggleVoter(request.address)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{request.address}</p>
                        <p className="text-xs text-gray-500">
                          Requested: {new Date(request.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  <Button
                    onClick={handleApproveVoters}
                    disabled={isProcessing || selectedVoters.length === 0}
                    className="w-full mt-4"
                  >
                    {isProcessing ? "Processing..." : `Approve Selected Voters (${selectedVoters.length})`}
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="voting">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Voting Status</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Current Status</p>
                  <p className={`text-lg font-semibold ${votingActive ? "text-green-600" : "text-red-600"}`}>
                    {votingActive ? "Voting is Active" : "Voting is Inactive"}
                  </p>
                </div>
                <Button
                  onClick={handleToggleVoting}
                  disabled={isProcessing}
                  variant={votingActive ? "destructive" : "default"}
                >
                  {isProcessing ? "Processing..." : votingActive ? "End Voting" : "Start Voting"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

