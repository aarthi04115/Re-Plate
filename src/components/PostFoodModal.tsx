import { useState } from 'react';
import { X } from '../components/Icons';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';

interface PostFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PostFoodModal = ({ isOpen, onClose, onSuccess }: PostFoodModalProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocationState] = useState<{lat?: number, lng?: number}>({});
  const [formData, setFormData] = useState({
    foodType: '',
    quantity: '',
    servings: '',
    freshnessHours: '',
    pickupLocation: user?.address || '',
    description: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Please enter your location manually.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocationState({ lat, lng });

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            setFormData(prev => ({ ...prev, pickupLocation: data.display_name }));
          } else {
            setFormData(prev => ({ ...prev, pickupLocation: `Lat: ${lat}, Lng: ${lng}` }));
          }
        } catch (err) {
          setFormData(prev => ({ ...prev, pickupLocation: `Lat: ${lat}, Lng: ${lng}` }));
        }
      },
      () => {
        alert("Please enter your location manually");
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('donations').insert([{
        donor_id: user.id,
        food_type: formData.foodType,
        quantity: formData.quantity,
        servings: parseInt(formData.servings, 10),
        freshness_hours: parseInt(formData.freshnessHours, 10),
        pickup_location: formData.pickupLocation,
        location: formData.pickupLocation,
        phone: user.phone || 'N/A',
        description: formData.description,
        status: 'available'
      }]);
      
      if (insertError) {
        toast('Failed to post food: ' + insertError.message, 'error');
        throw insertError;
      }
      toast('🎉 Food posted successfully! Receivers can now claim it.', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[24px] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-[22px] font-bold text-[var(--color-text-main)] tracking-tight">Post Surplus Food</h2>
            <p className="text-[var(--color-text-muted)] text-[12px] mt-1 uppercase tracking-wider font-bold">Share details below</p>
          </div>
          <button 
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-[var(--color-bg)] hover:bg-[var(--color-border)] p-2.5 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-2 mb-1.5">Food Type</label>
              <input required name="foodType" onChange={handleChange} className="input-field h-[50px]" placeholder="e.g., Rice & Curry" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-2 mb-1.5">Quantity</label>
              <input required name="quantity" onChange={handleChange} className="input-field h-[50px]" placeholder="e.g., 2 large trays" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-2 mb-1.5">Est. Servings</label>
              <input required type="number" min="1" name="servings" onChange={handleChange} className="input-field h-[50px]" placeholder="10" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-2 mb-1.5">Freshness (hrs)</label>
              <input required type="number" min="1" name="freshnessHours" onChange={handleChange} className="input-field h-[50px]" placeholder="4" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 ml-2">
              <label className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Pickup Location</label>
              <button 
                type="button" 
                onClick={handleGetLocation}
                className="text-[10px] font-bold text-[var(--color-primary)] hover:opacity-80 transition-opacity flex items-center gap-1"
              >
                📍 Get Location
              </button>
            </div>
            <input required name="pickupLocation" value={formData.pickupLocation} onChange={handleChange} className="input-field h-[50px]" placeholder="Full address" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-2 mb-1.5">Description</label>
            <textarea 
              name="description" 
              onChange={handleChange} 
              className="input-field min-h-[80px] resize-none rounded-2xl" 
              placeholder="Any specific instructions for pickup?" 
            />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full shadow-[0_4px_14px_rgba(0, 140, 68,0.3)]">
              ✨ {isSubmitting ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


