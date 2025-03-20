"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useWallet } from "@/hooks/useWallet"
import { Button } from "./ui/button"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "./ui/alert"
import { Badge } from "./ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { ConnectWallet } from "@thirdweb-dev/react"

export function Header() {
  const pathname = usePathname()
  const { 
    account, 
    isConnected, 
    networkName, 
    isCorrectNetwork,
    switchToSepolia,
    error,
    balance,
    isAdmin
  } = useWallet()

  // Format balance to 4 decimal places
  const formattedBalance = parseFloat(balance).toFixed(4)

  return (
    <TooltipProvider>
      <header className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-col">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-2xl font-bold">TrustVote</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className={`font-medium transition-colors ${pathname === "/" ? "text-white" : "text-blue-100 hover:text-white"}`}
              >
                Home
              </Link>
              <Link
                href="/vote"
                className={`font-medium transition-colors ${pathname === "/vote" ? "text-white" : "text-blue-100 hover:text-white"}`}
              >
                Vote
              </Link>
              <Link
                href="/results"
                className={`font-medium transition-colors ${pathname === "/results" ? "text-white" : "text-blue-100 hover:text-white"}`}
              >
                Results
              </Link>
              <Link
                href="/request-voter"
                className={`font-medium transition-colors ${pathname === "/request-voter" ? "text-white" : "text-blue-100 hover:text-white"}`}
              >
                Request to Vote
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`font-medium transition-colors ${pathname === "/admin" ? "text-white" : "text-blue-100 hover:text-white"}`}
                >
                  Admin
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {isConnected && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-white/10 text-white hover:bg-white/20 transition-colors cursor-help">
                        {formattedBalance} ETH
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Your wallet balance</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Badge 
                    variant={isCorrectNetwork ? "outline" : "destructive"}
                    className={isCorrectNetwork ? "border-white/20 text-white" : ""}
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
                  className="bg-white/10 hover:bg-white/20 text-white"
                >
                  Switch to Sepolia
                </Button>
              )}
              
              <ConnectWallet
                theme="dark"
                btnTitle="Connect Wallet"
              />
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-2 bg-red-500/10 border-red-500/20 text-white">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </header>
    </TooltipProvider>
  )
}

