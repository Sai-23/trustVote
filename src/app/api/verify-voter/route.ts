import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Path to the JSON data file
const DATA_FILE_PATH = path.join(process.cwd(), "data", "voter-verification.json");

// Helper function to read voter verification data
function readVoterVerificationData() {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading voter verification data:", error);
    return [];
  }
}

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
    // Read the voter verification data
    const voterData = readVoterVerificationData();
    
    // Find the voter with the matching address
    const voter = voterData.find(
      (voter: any) => voter.address.toLowerCase() === address.toLowerCase()
    );

    if (!voter) {
      return NextResponse.json(
        { error: "Voter verification data not found" },
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