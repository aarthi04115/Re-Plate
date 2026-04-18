import type { User, Listing } from '../types';

const USERS_KEY = 'replate_users';
const LISTINGS_KEY = 'replate_listings';

// Helper to delay response for realism
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockDb = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(USERS_KEY) || '[]'),
  
  saveUsers: (users: User[]) => localStorage.setItem(USERS_KEY, JSON.stringify(users)),
  
  getListings: (): Listing[] => JSON.parse(localStorage.getItem(LISTINGS_KEY) || '[]'),
  
  saveListings: (listings: Listing[]) => localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings)),
  
  // Auth
  async registerUser(user: Omit<User, 'id'>): Promise<User> {
    await delay(500);
    const users = this.getUsers();
    if (users.find(u => u.email === user.email)) {
      throw new Error('Email already in use');
    }
    const newUser: User = { ...user, id: Math.random().toString(36).substr(2, 9) };
    this.saveUsers([...users, newUser]);
    return newUser;
  },

  async loginUser(email: string): Promise<User> {
    await delay(300);
    const users = this.getUsers();
    const user = users.find(u => u.email === email);
    if (!user) throw new Error('Invalid email or password');
    return user;
  },

  // Listings
  async createListing(listing: Omit<Listing, 'id' | 'status' | 'createdAt'>): Promise<Listing> {
    await delay(300);
    const newListing: Listing = {
      ...listing,
      id: Math.random().toString(36).substr(2, 9),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    const listings = this.getListings();
    this.saveListings([...listings, newListing]);
    return newListing;
  },

  async updateListingStatus(
    id: string, 
    updates: Partial<Listing>
  ): Promise<void> {
    await delay(300);
    const listings = this.getListings();
    const index = listings.findIndex(l => l.id === id);
    if (index !== -1) {
      listings[index] = { ...listings[index], ...updates };
      this.saveListings(listings);
    }
  }
};
