import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

const SEPOLIA_CHAIN_ID = '0xaa36a7' // 11155111 in hex

// Network names mapping
const NETWORK_NAMES: Record<string, string> = {
  '0x1': 'Ethereum Mainnet',
  '0x5': 'Goerli Testnet',
  '0xaa36a7': 'Sepolia Testnet',
  '0x89': 'Polygon Mainnet',
  '0x13881': 'Mumbai Testnet',
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (eventName: string, callback: (...args: any[]) => void) => void
      removeListener: (eventName: string, callback: (...args: any[]) => void) => void
      isMetaMask?: boolean
    }
  }
}

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [networkName, setNetworkName] = useState<string>('Unknown Network')
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false)
  const [balance, setBalance] = useState<string>('0')
  const [isAdmin, setIsAdmin] = useState(false)

  // Admin address constant
  const ADMIN_ADDRESS = "0x1194CD63491865d684A4619b785129230F018730"

  // Update network name when chainId changes
  useEffect(() => {
    if (!chainId) return
    
    setNetworkName(NETWORK_NAMES[chainId] || `Unknown Network (${chainId})`)
    setIsCorrectNetwork(chainId === SEPOLIA_CHAIN_ID)
  }, [chainId])

  // Update balance when account changes
  useEffect(() => {
    const updateBalance = async () => {
      if (!provider || !account) {
        setBalance('0')
        return
      }

      try {
        const balance = await provider.getBalance(account)
        setBalance(ethers.utils.formatEther(balance))
      } catch (error) {
        console.error('Error fetching balance:', error)
      }
    }

    updateBalance()
    
    // Set up interval to update balance every 30 seconds
    const interval = setInterval(updateBalance, 30000)
    
    return () => clearInterval(interval)
  }, [provider, account])

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum === 'undefined') {
        setError('Please install MetaMask to use this application')
        return
      }

      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        setProvider(provider)

        // Get current chain
        const network = await provider.getNetwork()
        const chainIdHex = `0x${network.chainId.toString(16)}`
        setChainId(chainIdHex)

        // Check if already connected
        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsAdmin(accounts[0].toLowerCase() === ADMIN_ADDRESS.toLowerCase())
        }

        // Handle account changes
        if (window.ethereum) {
          const ethereum = window.ethereum
          ethereum.on('accountsChanged', (accounts: string[]) => {
            setAccount(accounts[0] || null)
            setIsAdmin(accounts[0]?.toLowerCase() === ADMIN_ADDRESS.toLowerCase())
          })

          // Handle chain changes
          ethereum.on('chainChanged', async (chainId: string) => {
            setChainId(chainId)
            
            if (chainId !== SEPOLIA_CHAIN_ID) {
              try {
                await ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: SEPOLIA_CHAIN_ID }],
                })
              } catch (switchError: any) {
                // If the chain doesn't exist, add it
                if (switchError.code === 4902) {
                  try {
                    await ethereum.request({
                      method: 'wallet_addEthereumChain',
                      params: [{
                        chainId: SEPOLIA_CHAIN_ID,
                        chainName: 'Sepolia Test Network',
                        nativeCurrency: {
                          name: 'Sepolia ETH',
                          symbol: 'SEP',
                          decimals: 18
                        },
                        rpcUrls: ['https://sepolia.infura.io/v3/'],
                        blockExplorerUrls: ['https://sepolia.etherscan.io/']
                      }]
                    })
                  } catch (addError) {
                    console.error('Error adding Sepolia network:', addError)
                    setError('Failed to add Sepolia network')
                  }
                } else {
                  console.error('Error switching to Sepolia:', switchError)
                  setError('Failed to switch to Sepolia network')
                }
              }
            }
          })
        }

        // Cleanup function
        return () => {
          if (window.ethereum) {
            const ethereum = window.ethereum
            ethereum.removeListener('accountsChanged', () => {})
            ethereum.removeListener('chainChanged', () => {})
          }
        }
      } catch (error) {
        console.error('Error initializing wallet:', error)
        setError('Failed to initialize wallet')
      }
    }

    init()
  }, [])

  const connect = async () => {
    if (!provider) {
      setError('Please install MetaMask to use this application')
      return
    }

    try {
      setError(null)
      // Request account access
      const accounts = await provider.send('eth_requestAccounts', [])
      setAccount(accounts[0])
      setIsAdmin(accounts[0].toLowerCase() === ADMIN_ADDRESS.toLowerCase())

      // Check and switch to Sepolia if needed
      const chainId = await provider.send('eth_chainId', [])
      setChainId(chainId)
      
      if (chainId !== SEPOLIA_CHAIN_ID) {
        await provider.send('wallet_switchEthereumChain', [{ chainId: SEPOLIA_CHAIN_ID }])
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      if (error.code === 4001) {
        setError('Please connect your wallet to continue')
      } else {
        setError('Failed to connect wallet')
      }
    }
  }

  const switchToSepolia = async () => {
    if (!provider) return
    
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: SEPOLIA_CHAIN_ID }])
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await provider.send('wallet_addEthereumChain', [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'SEP',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/']
            }
          ])
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError)
          setError('Failed to add Sepolia network')
        }
      } else {
        console.error('Error switching to Sepolia:', error)
        setError('Failed to switch to Sepolia network')
      }
    }
  }

  const disconnect = () => {
    setAccount(null)
    setError(null)
    setIsAdmin(false)
    setBalance('0')
  }

  return {
    account,
    provider,
    connect,
    disconnect,
    switchToSepolia,
    isConnected: !!account,
    error,
    chainId,
    networkName,
    isCorrectNetwork,
    balance,
    isAdmin
  }
} 