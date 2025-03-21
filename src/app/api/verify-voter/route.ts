import { NextResponse } from "next/server";
import { getVoterRegistration } from '@/lib/firebaseServices';

// GET method to retrieve verification data for a specific voter
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Wallet address is required" },
      { status: 400 }
    );
  }

  try {
    // Get voter verification data from Firebase
    const voter = await getVoterRegistration(address);
    
    if (!voter || voter.status !== 'approved') {
      return NextResponse.json(
        { error: "Voter verification data not found or not approved" },
        { status: 404 }
      );
    }

    // Return only the biometric data needed for verification
    return NextResponse.json({
      faceData: voter.faceData,
      fingerprintData: voter.fingerprintData
    });
  } catch (error) {
    console.error("Error retrieving voter verification data:", error);
    return NextResponse.json(
      { error: "Failed to retrieve voter verification data" },
      { status: 500 }
    );
  }
} 