import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MapPin, Calendar, ArrowRight, Eye, Pause, Play, BarChart3 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { FlightSearch } from '../../../server/src/schema';

interface FlightSearchListProps {
  searches: FlightSearch[];
  onSearchUpdated: (search: FlightSearch) => void;
  onSearchSelected: (search: FlightSearch) => void;
}

export function FlightSearchList({ searches, onSearchUpdated, onSearchSelected }: FlightSearchListProps) {
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});

  const handleToggleActive = async (search: FlightSearch) => {
    setLoadingStates((prev: Record<number, boolean>) => ({ ...prev, [search.id]: true }));

    try {
      const updatedSearch = await trpc.updateFlightSearch.mutate({
        id: search.id,
        is_active: !search.is_active
      });
      onSearchUpdated(updatedSearch);
    } catch (error) {
      console.error('Failed to update search:', error);
      alert('Failed to update search. Please try again.');
    } finally {
      setLoadingStates((prev: Record<number, boolean>) => ({ ...prev, [search.id]: false }));
    }
  };

  if (searches.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✈️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Flight Searches Yet</h3>
        <p className="text-gray-500 mb-4">
          Add your first flight search using the form on the left to start monitoring prices!
        </p>
        <div className="text-sm text-gray-400">
          💡 Tip: We'll check prices every hour and send you alerts when they change
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {searches.map((search: FlightSearch) => (
        <Card key={search.id} className={`transition-all duration-200 ${
          search.is_active 
            ? 'border-green-200 bg-green-50/30' 
            : 'border-gray-200 bg-gray-50/50 opacity-75'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Route Info */}
                <div className="flex items-center mb-2">
                  <div className="flex items-center text-lg font-medium">
                    <MapPin className="h-4 w-4 mr-1 text-green-600" />
                    <span>{search.origin_city}</span>
                    <ArrowRight className="h-4 w-4 mx-3 text-gray-400" />
                    <MapPin className="h-4 w-4 mr-1 text-red-600" />
                    <span>{search.destination_city}</span>
                  </div>
                  <Badge 
                    variant={search.is_active ? "default" : "secondary"}
                    className="ml-3"
                  >
                    {search.is_active ? "🟢 Active" : "⏸️ Paused"}
                  </Badge>
                </div>

                {/* Date Info */}
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Departure: {search.departure_date.toLocaleDateString()}</span>
                  {search.return_date && (
                    <>
                      <span className="mx-2">•</span>
                      <span>Return: {search.return_date.toLocaleDateString()}</span>
                    </>
                  )}
                </div>

                {/* Meta Info */}
                <div className="text-xs text-gray-500">
                  Created: {search.created_at.toLocaleDateString()} • 
                  Last updated: {search.updated_at.toLocaleDateString()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSearchSelected(search)}
                  className="flex items-center"
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  View Chart
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant={search.is_active ? "outline" : "default"}
                      size="sm"
                      disabled={loadingStates[search.id]}
                      className="flex items-center min-w-[100px]"
                    >
                      {loadingStates[search.id] ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>
                      ) : search.is_active ? (
                        <Pause className="h-4 w-4 mr-1" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      {search.is_active ? 'Pause' : 'Resume'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {search.is_active ? 'Pause' : 'Resume'} Flight Monitoring?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {search.is_active ? (
                          <>
                            This will stop monitoring prices for <strong>{search.origin_city} → {search.destination_city}</strong>.
                            You won't receive any new price alerts until you resume monitoring.
                          </>
                        ) : (
                          <>
                            This will resume monitoring prices for <strong>{search.origin_city} → {search.destination_city}</strong>.
                            You'll start receiving price alerts again.
                          </>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleToggleActive(search)}>
                        {search.is_active ? 'Pause Monitoring' : 'Resume Monitoring'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="text-center text-sm text-gray-500 pt-4 border-t">
        <p className="mb-2">🤖 <strong>Automated Monitoring:</strong> Active searches are checked every hour</p>
        <p>💰 <strong>Smart Alerts:</strong> You'll be notified when prices drop, increase, or hit your targets</p>
      </div>
    </div>
  );
}