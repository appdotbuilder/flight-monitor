import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Plane, PlusCircle, User as UserIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { FlightSearchForm } from '@/components/FlightSearchForm';
import { FlightSearchList } from '@/components/FlightSearchList';
import { AlertsList } from '@/components/AlertsList';
import { UserSetup } from '@/components/UserSetup';
import { PriceChart } from '@/components/PriceChart';
import type { User, FlightSearch, Alert } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [flightSearches, setFlightSearches] = useState<FlightSearch[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedSearch, setSelectedSearch] = useState<FlightSearch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  // Load user data from localStorage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('flightMonitor_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('flightMonitor_user');
      }
    }
  }, []);

  // Load flight searches when user is available
  const loadFlightSearches = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const searches = await trpc.getFlightSearchesByUser.query({
        user_id: currentUser.id
      });
      setFlightSearches(searches);
    } catch (error) {
      console.error('Failed to load flight searches:', error);
    }
  }, [currentUser]);

  // Load alerts when user is available
  const loadAlerts = useCallback(async () => {
    if (!currentUser) return;

    try {
      const userAlerts = await trpc.getAlerts.query({
        user_id: currentUser.id
      });
      setAlerts(userAlerts);
      setUnreadAlertCount(userAlerts.filter((alert: Alert) => !alert.is_read).length);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadFlightSearches();
      loadAlerts();
    }
  }, [currentUser, loadFlightSearches, loadAlerts]);

  const handleUserCreated = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('flightMonitor_user', JSON.stringify(user));
  };

  const handleFlightSearchCreated = async (search: FlightSearch) => {
    setFlightSearches((prev: FlightSearch[]) => [search, ...prev]);
  };

  const handleSearchUpdated = (updatedSearch: FlightSearch) => {
    setFlightSearches((prev: FlightSearch[]) => 
      prev.map((search: FlightSearch) => 
        search.id === updatedSearch.id ? updatedSearch : search
      )
    );
  };

  const handleAlertRead = async (alertId: number) => {
    try {
      await trpc.markAlertRead.mutate({ alertId });
      setAlerts((prev: Alert[]) => 
        prev.map((alert: Alert) => 
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
      setUnreadAlertCount((prev: number) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <Plane className="h-12 w-12 text-blue-600 mr-3" />
                <h1 className="text-4xl font-bold text-gray-900">✈️ Flight Price Monitor</h1>
              </div>
              <p className="text-xl text-gray-600">
                Track flight prices and get alerted when they drop! 🎯
              </p>
            </div>
            
            <UserSetup onUserCreated={handleUserCreated} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Plane className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">✈️ Flight Monitor</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-600">
              <UserIcon className="h-4 w-4 mr-1" />
              {currentUser.email}
            </div>
            {unreadAlertCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {unreadAlertCount} new alerts
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Flight Search Form */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PlusCircle className="h-5 w-5 mr-2 text-green-600" />
                  Add Flight Search
                </CardTitle>
                <CardDescription>
                  Monitor a new flight route for price changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FlightSearchForm 
                  userId={currentUser.id}
                  onSearchCreated={handleFlightSearchCreated}
                />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6 shadow-lg border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">📊 Your Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Searches:</span>
                    <Badge variant="outline">
                      {flightSearches.filter((search: FlightSearch) => search.is_active).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Alerts:</span>
                    <Badge variant="outline">{alerts.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unread Alerts:</span>
                    <Badge variant={unreadAlertCount > 0 ? "destructive" : "outline"}>
                      {unreadAlertCount}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="searches" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="searches" className="flex items-center">
                  <Plane className="h-4 w-4 mr-2" />
                  My Searches
                </TabsTrigger>
                <TabsTrigger value="alerts" className="flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Alerts
                  {unreadAlertCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 text-xs">
                      {unreadAlertCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="charts">📈 Price History</TabsTrigger>
              </TabsList>

              <TabsContent value="searches" className="mt-6">
                <Card className="shadow-lg border-blue-200">
                  <CardHeader>
                    <CardTitle>Flight Searches</CardTitle>
                    <CardDescription>
                      Manage your active flight price monitoring
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FlightSearchList 
                      searches={flightSearches}
                      onSearchUpdated={handleSearchUpdated}
                      onSearchSelected={setSelectedSearch}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alerts" className="mt-6">
                <Card className="shadow-lg border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="h-5 w-5 mr-2" />
                      Price Alerts
                    </CardTitle>
                    <CardDescription>
                      Recent price change notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertsList 
                      alerts={alerts}
                      onAlertRead={handleAlertRead}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="charts" className="mt-6">
                <Card className="shadow-lg border-blue-200">
                  <CardHeader>
                    <CardTitle>📈 Price History</CardTitle>
                    <CardDescription>
                      {selectedSearch 
                        ? `Price trends for ${selectedSearch.origin_city} → ${selectedSearch.destination_city}`
                        : 'Select a flight search to view price history'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedSearch ? (
                      <PriceChart flightSearchId={selectedSearch.id} />
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Plane className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Select a flight search from the "My Searches" tab to view its price history</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;