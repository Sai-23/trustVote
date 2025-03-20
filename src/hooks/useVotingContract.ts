"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/lib/contract'
import { useWallet } from './useWallet'

export function useVotingContract() {
  const { provider } = useWallet()
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [votingActive, setVotingActive] = useState(false)
  const [totalCandidates, setTotalCandidates] = useState(0)
  const [totalVotes, setTotalVotes] = useState(0)
  const [admin, setAdmin] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!provider) {
      setContract(null)
      setIsLoading(false)
      return
    }

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider.getSigner()
    )

    setContract(contract)

    const loadContractData = async () => {
      try {
        const [active, total, votes, adminAddr] = await Promise.all([
          contract.votingActive(),
          contract.totalCandidates(),
          contract.totalVotes(),
          contract.admin()
        ])
        
        setVotingActive(active)
        setTotalCandidates(Number(total))
        setTotalVotes(Number(votes))
        setAdmin(adminAddr)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading contract data:', error)
        setIsLoading(false)
      }
    }

    loadContractData()

    // Subscribe to contract events
    contract.on("VotingStarted", () => setVotingActive(true))
    contract.on("VotingEnded", () => setVotingActive(false))
    contract.on("VoteCast", () => {
      loadContractData() // Refresh data when a vote is cast
    })
    contract.on("CandidateAdded", () => {
      loadContractData() // Refresh data when a candidate is added
    })

    return () => {
      contract.removeAllListeners()
    }
  }, [provider])

  return {
    contract,
    votingActive,
    totalCandidates,
    totalVotes,
    admin,
    isLoading
  }
} 