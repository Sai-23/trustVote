import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAddress, useChainId, useDisconnect, useSwitchChain, useBalance } from '@thirdweb-dev/react'
import { Sepolia } from '@thirdweb-dev/chains'

// Network names mapping
const NETWORK_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  11155111: 'Sepolia Testnet',
  137: 'Polygon Mainnet',
  80001: 'Mumbai Testnet',
}

export function useWallet() {
  const address = useAddress()
  const chainId = useChainId()
  const { data: balance } = useBalance()
  const disconnect = useDisconnect()
  const switchChain = useSwitchChain()
  
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Admin address constant
  const ADMIN_ADDRESS = "0x1194CD63491865d684A4619b785129230F018730"
  
  // Network name and correct network check
  const networkName = NETWORK_NAMES[chainId || 0] || `Unknown Network (${chainId})`
  const isCorrectNetwork = chainId === Sepolia.chainId

  // Initialize provider
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      setProvider(provider)
    } catch (error) {
      console.error('Error initializing provider:', error)
      setError('Failed to initialize provider')
    }
  }, [])

  // Check if user is admin
  useEffect(() => {
    if (address) {
      setIsAdmin(address.toLowerCase() === ADMIN_ADDRESS.toLowerCase())
    } else {
      setIsAdmin(false)
    }
  }, [address])

  // Switch to Sepolia
  const switchToSepolia = async () => {
    try {
      await switchChain(Sepolia.chainId)
    } catch (error) {
      console.error('Error switching to Sepolia:', error)
      setError('Failed to switch to Sepolia network')
    }
  }

  return {
    account: address,
    provider,
    disconnect,
    switchToSepolia,
    isConnected: !!address,
    error,
    chainId: chainId?.toString(),
    networkName,
    isCorrectNetwork,
    balance: balance ? balance.displayValue : '0',
    isAdmin
  }
} 