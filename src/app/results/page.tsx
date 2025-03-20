"use client"

import { useState, useEffect } from "react"
import type { Candidate } from "@/lib/contract"
import { useVotingContract } from "@/hooks/useVotingContract"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function ResultsPage() {
  const { contract, totalCandidates, totalVotes } = useVotingContract()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
      } finally {
        setIsLoading(false)
      }
    }

    fetchCandidates()
  }, [contract, totalCandidates])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading results...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Election Results</h1>
        <p className="text-center text-gray-600 mb-8">Total Votes Cast: {totalVotes}</p>

        <div className="space-y-4">
          {candidates.map((candidate) => {
            const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0

            return (
              <Card key={candidate.id}>
                <CardHeader>
                  <CardTitle>{candidate.name}</CardTitle>
                  <CardDescription>Candidate #{candidate.id + 1}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Progress value={percentage} />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{candidate.voteCount} votes</span>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

