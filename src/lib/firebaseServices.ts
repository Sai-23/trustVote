import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  serverTimestamp, 
  Timestamp, 
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';

// Voter registration interface
export interface VoterRegistration {
  address: string;
  faceData: string;
  fingerprintData: string;
  aadharNumber: string;
  phoneNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Collection reference
const VOTERS_COLLECTION = 'voters';

// Save voter registration to Firestore
export const saveVoterRegistration = async (data: Omit<VoterRegistration, 'createdAt' | 'updatedAt' | 'status'>) => {
  try {
    // Check if a registration for this address already exists
    const voterRef = doc(db, VOTERS_COLLECTION, data.address.toLowerCase());
    const voterDoc = await getDoc(voterRef);
    
    if (voterDoc.exists()) {
      // Registration already exists
      const existingData = voterDoc.data() as VoterRegistration;
      if (existingData.status === 'pending') {
        throw new Error('A registration request for this address is already pending');
      } else if (existingData.status === 'approved') {
        throw new Error('This address is already registered as a voter');
      } else {
        // If rejected, allow to resubmit
        await setDoc(voterRef, {
          ...data,
          address: data.address.toLowerCase(),
          status: 'pending',
          createdAt: existingData.createdAt,
          updatedAt: serverTimestamp()
        });
        return { success: true, message: 'Registration request resubmitted!' };
      }
    } else {
      // Create new registration
      await setDoc(voterRef, {
        ...data,
        address: data.address.toLowerCase(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, message: 'Registration request submitted successfully!' };
    }
  } catch (error) {
    console.error('Error saving voter registration:', error);
    throw error;
  }
};

// Get voter registration by address
export const getVoterRegistration = async (address: string) => {
  try {
    const voterRef = doc(db, VOTERS_COLLECTION, address.toLowerCase());
    const voterDoc = await getDoc(voterRef);
    
    if (voterDoc.exists()) {
      return voterDoc.data() as VoterRegistration;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching voter registration:', error);
    throw error;
  }
};

// Get all voter registrations
export const getAllVoterRegistrations = async () => {
  try {
    const votersRef = collection(db, VOTERS_COLLECTION);
    const snapshot = await getDocs(votersRef);
    return mapQuerySnapshot(snapshot);
  } catch (error) {
    console.error('Error fetching all voter registrations:', error);
    throw error;
  }
};

// Get voter registrations by status
export const getVoterRegistrationsByStatus = async (status: 'pending' | 'approved' | 'rejected') => {
  try {
    const votersRef = collection(db, VOTERS_COLLECTION);
    const q = query(votersRef, where('status', '==', status));
    const snapshot = await getDocs(q);
    return mapQuerySnapshot(snapshot);
  } catch (error) {
    console.error(`Error fetching ${status} voter registrations:`, error);
    throw error;
  }
};

// Update voter registration status
export const updateVoterRegistrationStatus = async (address: string, status: 'approved' | 'rejected') => {
  try {
    const voterRef = doc(db, VOTERS_COLLECTION, address.toLowerCase());
    await updateDoc(voterRef, {
      status,
      updatedAt: serverTimestamp()
    });
    return { success: true, message: `Voter registration ${status} successfully` };
  } catch (error) {
    console.error('Error updating voter registration status:', error);
    throw error;
  }
};

// Helper function to map Firestore query snapshot to array
const mapQuerySnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (VoterRegistration & { id: string })[];
}; 