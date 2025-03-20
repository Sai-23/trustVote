"use client"

import { useEffect, useState } from "react"
import { useVotingContract } from "@/hooks/useVotingContract"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Candidate {
  name: string
  voteCount: number
}

export default function ResultsPage() {
  const { contract, isLoading: contractLoading } = useVotingContract()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [totalVotes, setTotalVotes] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!contract) return

    const loadResults = async () => {
      try {
        const totalCandidatesCount = await contract.totalCandidates()
        const candidatePromises = []
        
        for (let i = 0; i < totalCandidatesCount; i++) {
          candidatePromises.push(contract.candidates(i))
        }
        
        const candidateResults = await Promise.all(candidatePromises)
        const totalVotesCount = await contract.totalVotes()
        
        setCandidates(candidateResults.map(candidate => ({
          name: candidate.name,
          voteCount: Number(candidate.voteCount)
        })))
        setTotalVotes(Number(totalVotesCount))
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading results:", error)
        toast.error("Failed to load election results")
        setIsLoading(false)
      }
    }

    loadResults()
  }, [contract])

  if (isLoading || contractLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
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

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Election Results</h1>
          <p className="text-gray-600">Total Votes Cast: {totalVotes}</p>
        </div>

        <div className="grid gap-6">
          {candidates.map((candidate, index) => {
            const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0
            
            return (
              <Card key={index} className="p-6">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{candidate.name}</h3>
                    <span className="text-sm font-medium text-gray-600">
                      {candidate.voteCount} votes ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

