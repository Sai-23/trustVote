"use client"

import type { ReactNode } from "react"
import { ThirdwebProvider as TWProvider } from "@thirdweb-dev/react"
import { Sepolia } from "@thirdweb-dev/chains"

export function ThirdwebProvider({ children }: { children: ReactNode }) {
  return (
    <TWProvider activeChain={Sepolia}>
      {children}
    </TWProvider>
  )
}