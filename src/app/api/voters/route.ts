import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define the path to our JSON database file
const DATA_FILE_PATH = path.join(process.cwd(), "data", "voter-requests.json");

// Ensure the data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Read voter requests from the JSON file
const readVoterRequests = () => {
  ensureDataDirectory();

  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading voter requests:", error);
    return [];
  }
};

// Write voter requests to the JSON file
const writeVoterRequests = (requests: any[]) => {
  ensureDataDirectory();

  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(requests, null, 2));
  } catch (error) {
    console.error("Error writing voter requests:", error);
  }
};

// GET method to retrieve all voter requests
export async function GET() {
  const requests = readVoterRequests();
  return NextResponse.json(requests);
}

// POST method to create a new voter request
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (
      !body.address ||
      !body.faceData ||
      !body.fingerprintData ||
      !body.aadharNumber ||
      !body.phoneNumber
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create new voter request
    const newRequest = {
      address: body.address,
      timestamp: Date.now(),
      faceData: body.faceData,
      fingerprintData: body.fingerprintData,
      aadharNumber: body.aadharNumber,
      phoneNumber: body.phoneNumber,
      status: "pending", // pending, approved, rejected
    };

    // Read existing requests
    const requests = readVoterRequests();

    // Check if this address already has a request
    const existingRequestIndex = requests.findIndex(
      (request: any) =>
        request.address.toLowerCase() === body.address.toLowerCase()
    );

    if (existingRequestIndex !== -1) {
      return NextResponse.json(
        { error: "A request for this address already exists" },
        { status: 400 }
      );
    }

    // Add new request
    requests.push(newRequest);

    // Save updated requests
    writeVoterRequests(requests);

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating voter request:", error);
    return NextResponse.json(
      { error: "Failed to create voter request" },
      { status: 500 }
    );
  }
}

// DELETE method to remove a voter request (used when admin approves/rejects)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    // Read existing requests
    const requests = readVoterRequests();

    // Filter out the request to delete
    const updatedRequests = requests.filter(
      (request: any) => request.address.toLowerCase() !== address.toLowerCase()
    );

    // Check if any request was removed
    if (requests.length === updatedRequests.length) {
      return NextResponse.json(
        { error: "Voter request not found" },
        { status: 404 }
      );
    }

    // Save updated requests
    writeVoterRequests(updatedRequests);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting voter request:", error);
    return NextResponse.json(
      { error: "Failed to delete voter request" },
      { status: 500 }
    );
  }
}

// PATCH method to update voter request status
export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    if (!body.address || !body.status) {
      return NextResponse.json(
        { error: "Address and status parameters are required" },
        { status: 400 }
      );
    }

    // Validate status value
    if (!["pending", "approved", "rejected"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Read existing requests
    const requests = readVoterRequests();

    // Find the request to update
    const requestIndex = requests.findIndex(
      (request: any) =>
        request.address.toLowerCase() === body.address.toLowerCase()
    );

    if (requestIndex === -1) {
      return NextResponse.json(
        { error: "Voter request not found" },
        { status: 404 }
      );
    }

    // Update the status
    requests[requestIndex].status = body.status;

    // If approved or rejected, update the approval timestamp
    if (body.status === "approved" || body.status === "rejected") {
      requests[requestIndex].statusTimestamp = Date.now();
    }

    // Save updated requests
    writeVoterRequests(requests);

    return NextResponse.json(requests[requestIndex]);
  } catch (error) {
    console.error("Error updating voter request:", error);
    return NextResponse.json(
      { error: "Failed to update voter request" },
      { status: 500 }
    );
  }
}
