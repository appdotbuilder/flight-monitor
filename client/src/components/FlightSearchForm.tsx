import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, MapPin, ArrowRight, Search } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { FlightSearch, CreateFlightSearchInput } from '../../../server/src/schema';

interface FlightSearchFormProps {
  userId: number;
  onSearchCreated: (search: FlightSearch) => void;
}

export function FlightSearchForm({ userId, onSearchCreated }: FlightSearchFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [formData, setFormData] = useState<CreateFlightSearchInput>({
    user_id: userId,
    origin_city: '',
    destination_city: '',
    departure_date: new Date(),
    return_date: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const searchData = {
        ...formData,
        return_date: isRoundTrip ? formData.return_date : null
      };

      const search = await trpc.createFlightSearch.mutate(searchData);
      onSearchCreated(search);
      
      // Reset form
      setFormData({
        user_id: userId,
        origin_city: '',
        destination_city: '',
        departure_date: new Date(),
        return_date: null
      });
      setIsRoundTrip(false);
    } catch (error) {
      console.error('Failed to create flight search:', error);
      alert('Failed to create flight search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const today = new Date();
  const minDate = formatDateForInput(today);
  const minReturnDate = formData.departure_date 
    ? formatDateForInput(new Date(formData.departure_date)) 
    : minDate;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Origin City */}
      <div className="space-y-2">
        <Label htmlFor="origin" className="flex items-center text-sm font-medium">
          <MapPin className="h-4 w-4 mr-2 text-green-600" />
          From (Origin City)
        </Label>
        <Input
          id="origin"
          type="text"
          placeholder="e.g., New York, London, Tokyo"
          value={formData.origin_city}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateFlightSearchInput) => ({ 
              ...prev, 
              origin_city: e.target.value 
            }))
          }
          required
        />
      </div>

      {/* Destination City */}
      <div className="space-y-2">
        <Label htmlFor="destination" className="flex items-center text-sm font-medium">
          <MapPin className="h-4 w-4 mr-2 text-red-600" />
          To (Destination City)
        </Label>
        <Input
          id="destination"
          type="text"
          placeholder="e.g., Paris, Dubai, Singapore"
          value={formData.destination_city}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateFlightSearchInput) => ({ 
              ...prev, 
              destination_city: e.target.value 
            }))
          }
          required
        />
      </div>

      {/* Trip Type Toggle */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
        <div className="flex flex-col">
          <Label htmlFor="roundtrip" className="text-sm font-medium">
            ✈️ Round Trip
          </Label>
          <p className="text-xs text-gray-600 mt-1">
            Monitor return flights as well
          </p>
        </div>
        <Switch
          id="roundtrip"
          checked={isRoundTrip}
          onCheckedChange={setIsRoundTrip}
        />
      </div>

      {/* Departure Date */}
      <div className="space-y-2">
        <Label htmlFor="departure" className="flex items-center text-sm font-medium">
          <CalendarIcon className="h-4 w-4 mr-2 text-blue-600" />
          Departure Date
        </Label>
        <Input
          id="departure"
          type="date"
          min={minDate}
          value={formatDateForInput(formData.departure_date)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateFlightSearchInput) => ({ 
              ...prev, 
              departure_date: new Date(e.target.value) 
            }))
          }
          required
        />
      </div>

      {/* Return Date (conditional) */}
      {isRoundTrip && (
        <div className="space-y-2">
          <Label htmlFor="return" className="flex items-center text-sm font-medium">
            <CalendarIcon className="h-4 w-4 mr-2 text-purple-600" />
            Return Date
          </Label>
          <Input
            id="return"
            type="date"
            min={minReturnDate}
            value={formData.return_date ? formatDateForInput(formData.return_date) : ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateFlightSearchInput) => ({ 
                ...prev, 
                return_date: e.target.value ? new Date(e.target.value) : null 
              }))
            }
            required={isRoundTrip}
          />
        </div>
      )}

      {/* Route Preview */}
      {formData.origin_city && formData.destination_city && (
        <div className="p-3 bg-gradient-to-r from-green-50 to-red-50 rounded-md border">
          <div className="flex items-center justify-center text-sm font-medium">
            <span className="text-green-700">{formData.origin_city}</span>
            <ArrowRight className="h-4 w-4 mx-3 text-gray-500" />
            <span className="text-red-700">{formData.destination_city}</span>
          </div>
          <div className="text-center text-xs text-gray-600 mt-1">
            {isRoundTrip ? 'Round Trip' : 'One Way'} • Departure: {formData.departure_date.toLocaleDateString()}
            {isRoundTrip && formData.return_date && (
              <> • Return: {formData.return_date.toLocaleDateString()}</>
            )}
          </div>
        </div>
      )}

      <Button 
        type="submit" 
        disabled={isLoading || !formData.origin_city || !formData.destination_city} 
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Starting Monitor...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Start Price Monitoring 🚀
          </>
        )}
      </Button>

      <div className="text-center text-xs text-gray-500 px-2">
        We'll check prices hourly and alert you when they change! 
        Price data is simulated for demonstration purposes.
      </div>
    </form>
  );
}