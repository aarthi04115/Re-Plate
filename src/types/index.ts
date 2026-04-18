export type Role = 'donor' | 'volunteer' | 'ngo';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: Role;
}

export type ListingStatus = 'available' | 'active' | 'pending_receiver' | 'in_delivery' | 'completed';

export interface Listing {
  id: string;
  donorId: string;
  foodType: string;
  quantity: string;
  servings: number;
  freshnessHours: number;
  pickupLocation: string;
  description?: string;
  status: ListingStatus;
  createdAt: string;

  claimedByVolunteerId?: string;
  claimedAt?: string;
  acceptedByReceiverId?: string;
  acceptedAt?: string;
}

export interface Review {
  id: string;
  targetId: string;      // The person being reviewed (Donor, Volunteer, or NGO)
  reviewerId: string;
  targetType: 'donor' | 'volunteer' | 'ngo';
  donationId: string;
  rating: number;        // 1–5
  feedback?: string;
  createdAt: string;
}

export interface DonorRating {
  avg: number;           // average of all ratings
  count: number;         // total number of reviews
  recents: { rating: number; feedback: string }[]; // up to 3 latest
}

// Global context state for auth
export interface AuthState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

