import React, { createContext, useContext, useState } from 'react';

export type DemoDonation = {
  id: string;
  food: string;
  quantity: string;
  location: string;
  donorName: string;
  status: 'Available' | 'Picked';
  pickedBy?: string;
  donorId: string;
};

interface DonationContextType {
  donations: DemoDonation[];
  addDonation: (donation: DemoDonation) => void;
  pickupDonation: (id: string, volunteerName: string) => void;
}

const DonationContext = createContext<DonationContextType | undefined>(undefined);

export const DonationProvider = ({ children }: { children: React.ReactNode }) => {
  const [donations, setDonations] = useState<DemoDonation[]>([
    {
      id: "demo-1",
      food: "Leftover Catering (Rice/Curry)",
      quantity: "50 Servings",
      location: "Anna Nagar, Chennai",
      donorName: "Saraswathi Caterers",
      status: "Available",
      donorId: "all"
    },
    {
      id: "demo-2",
      food: "Fresh Bakery Bread",
      quantity: "20 Loaves",
      location: "T-Nagar, Chennai",
      donorName: "BakeHouse",
      status: "Available",
      donorId: "all"
    }
  ]);

  const addDonation = (donation: DemoDonation) => {
    setDonations(prev => [donation, ...prev]);
  };

  const pickupDonation = (id: string, volunteerName: string) => {
    setDonations(prev => 
      prev.map(d => d.id === id ? { ...d, status: 'Picked', pickedBy: volunteerName } : d)
    );
  };

  return (
    <DonationContext.Provider value={{ donations, addDonation, pickupDonation }}>
      {children}
    </DonationContext.Provider>
  );
};

export const useDonations = () => {
  const context = useContext(DonationContext);
  if (context === undefined) {
    throw new Error('useDonations must be used within a DonationProvider');
  }
  return context;
};
