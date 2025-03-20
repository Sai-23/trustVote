"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useWallet } from "@/hooks/useWallet"
import { Button } from "./ui/button"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "./ui/alert"
import { Badge } from "./ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

export function Header() {
  const pathname = usePathname()
  const { 
    account, 
    connect, 
    disconnect, 
    isConnected, 
    networkName, 
    isCorrectNetwork,
    switchToSepolia,
    error,
    balance
  } = useWallet()

  // Format balance to 4 decimal places
  const formattedBalance = parseFloat(balance).toFixed(4)

  return (
    <TooltipProvider>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-col">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              BlockVote
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/"
                className={`font-medium ${pathname === "/" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}`}
              >
                Home
              </Link>
              <Link
                href="/vote"
                className={`font-medium ${pathname === "/vote" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}`}
              >
                Vote
              </Link>
              <Link
                href="/results"
                className={`font-medium ${pathname === "/results" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}`}
              >
                Results
              </Link>
              <Link
                href="/admin"
                className={`font-medium ${pathname === "/admin" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}`}
              >
                Admin
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              {isConnected && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="mr-2 cursor-help">
                        {formattedBalance} ETH
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Your wallet balance</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Badge 
                    variant={isCorrectNetwork ? "outline" : "destructive"}
                    className="mr-2"
                  >
                    {networkName}
                  </Badge>
                </>
              )}
              
              {isConnected && !isCorrectNetwork && (
                <Button 
                  onClick={switchToSepolia}
                  variant="secondary"
                  size="sm"
                  className="mr-2"
                >
                  Switch to Sepolia
                </Button>
              )}
              
              <Button 
                onClick={isConnected ? disconnect : connect}
                variant={isConnected ? "outline" : "default"}
              >
                {isConnected ? 
                  `${account?.slice(0, 6)}...${account?.slice(-4)}` : 
                  'Connect Wallet'
                }
              </Button>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </header>
    </TooltipProvider>
  )
}

