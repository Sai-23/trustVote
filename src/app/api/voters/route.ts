import { NextResponse } from "next/server";
import { 
  saveVoterRegistration, 
  getVoterRegistration, 
  getAllVoterRegistrations, 
  updateVoterRegistrationStatus,
  getVoterRegistrationsByStatus
} from '@/lib/firebaseServices';

// GET method to retrieve voter requests
export async function GET() {
  try {
    // Get all voter registrations from Firebase
    const voterRequests = await getAllVoterRegistrations();
    return NextResponse.json(voterRequests);
  } catch (error) {
    console.error("Error retrieving voter requests:", error);
    return NextResponse.json(
      { error: "Failed to retrieve voter requests" },
      { status: 500 }
    );
  }
}

// POST method to add a new voter request
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate required fields
    const requiredFields = ['address', 'faceData', 'fingerprintData', 'aadharNumber', 'phoneNumber'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Save voter registration to Firebase
    const result = await saveVoterRegistration({
      address: body.address,
      faceData: body.faceData,
      fingerprintData: body.fingerprintData,
      aadharNumber: body.aadharNumber,
      phoneNumber: body.phoneNumber,
    });

    return NextResponse.json(
      { message: result.message },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error adding voter request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add voter request" },
      { status: 500 }
    );
  }
}

// DELETE method to remove a voter request
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Not implementing full deletion for security reasons
    // Instead, mark as rejected
    await updateVoterRegistrationStatus(address, 'rejected');

    return NextResponse.json(
      { message: "Voter request deleted successfully" }
    );
  } catch (error) {
    console.error("Error deleting voter request:", error);
    return NextResponse.json(
      { error: "Failed to delete voter request" },
      { status: 500 }
    );
  }
}

// PATCH method to update a voter request status
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { address, status } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: "Valid status (approved/rejected) is required" },
        { status: 400 }
      );
    }

    // Update voter registration status in Firebase
    await updateVoterRegistrationStatus(address, status as 'approved' | 'rejected');

    return NextResponse.json(
      { message: `Voter request ${status} successfully` }
    );
  } catch (error) {
    console.error("Error updating voter request:", error);
    return NextResponse.json(
      { error: "Failed to update voter request" },
      { status: 500 }
    );
  }
}
