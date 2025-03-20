"use client"

import { ethers } from "ethers"
import type { ReactNode } from "react"
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract"

export function ThirdwebProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}