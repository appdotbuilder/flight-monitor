import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingDown, TrendingUp, RefreshCw, DollarSign, Calendar } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { PriceRecord } from '../../../server/src/schema';

interface PriceChartProps {
  flightSearchId: number;
}

export function PriceChart({ flightSearchId }: PriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPriceHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const history = await trpc.getPriceHistory.query({
        flight_search_id: flightSearchId,
        limit: 30 // Show last 30 price records
      });
      setPriceHistory(history);
    } catch (error) {
      console.error('Failed to load price history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [flightSearchId]);

  useEffect(() => {
    loadPriceHistory();
  }, [loadPriceHistory]);

  const formatPrice = (priceInCents: number, currency: string) => {
    const price = priceInCents / 100;
    return `${currency} ${price.toFixed(2)}`;
  };

  const calculatePriceChange = () => {
    if (priceHistory.length < 2) return null;
    
    const sortedPrices = [...priceHistory].sort((a: PriceRecord, b: PriceRecord) => 
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    
    const oldestPrice = sortedPrices[0].price;
    const latestPrice = sortedPrices[sortedPrices.length - 1].price;
    const change = latestPrice - oldestPrice;
    const percentChange = (change / oldestPrice) * 100;
    
    return {
      absolute: change,
      percent: percentChange,
      isIncrease: change > 0
    };
  };

  const getLowestAndHighest = () => {
    if (priceHistory.length === 0) return null;
    
    const prices = priceHistory.map((record: PriceRecord) => record.price);
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const currency = priceHistory[0].currency;
    
    return { lowest, highest, currency };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading price history...</p>
        </div>
      </div>
    );
  }

  if (priceHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Price Data Yet</h3>
        <p className="text-gray-500 mb-4">
          Price history will appear here once our monitoring system starts collecting data.
        </p>
        <div className="text-sm text-gray-400 space-y-1">
          <p>🕐 <strong>Hourly Checks:</strong> We monitor prices every hour</p>
          <p>📈 <strong>Trend Analysis:</strong> Track price movements over time</p>
          <p>💡 <strong>Best Time to Buy:</strong> Identify optimal booking moments</p>
        </div>
        <Button 
          onClick={loadPriceHistory}
          variant="outline"
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>
    );
  }

  const priceChange = calculatePriceChange();
  const priceRange = getLowestAndHighest();
  
  // Sort prices by date for chronological display
  const sortedPrices = [...priceHistory].sort((a: PriceRecord, b: PriceRecord) => 
    new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  const latestPrice = sortedPrices[sortedPrices.length - 1];

  return (
    <div className="space-y-6">
      {/* Price Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">Current Price</p>
            <p className="text-xl font-bold text-blue-700">
              {formatPrice(latestPrice.price, latestPrice.currency)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {latestPrice.provider} • {latestPrice.recorded_at.toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {priceRange && (
          <>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4 text-center">
                <TrendingDown className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Lowest Seen</p>
                <p className="text-xl font-bold text-green-700">
                  {formatPrice(priceRange.lowest, priceRange.currency)}
                </p>
                <Badge variant="outline" className="mt-1 text-xs border-green-300">
                  Best Deal
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Highest Seen</p>
                <p className="text-xl font-bold text-red-700">
                  {formatPrice(priceRange.highest, priceRange.currency)}
                </p>
                <Badge variant="outline" className="mt-1 text-xs border-red-300">
                  Peak Price
                </Badge>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Price Change Summary */}
      {priceChange && (
        <Card className={`border-2 ${priceChange.isIncrease ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {priceChange.isIncrease ? (
                  <TrendingUp className="h-5 w-5 text-red-600 mr-2" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-green-600 mr-2" />
                )}
                <span className="font-medium">
                  Overall Price Trend: 
                </span>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${priceChange.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                  {priceChange.isIncrease ? '+' : ''}{formatPrice(priceChange.absolute, latestPrice.currency)}
                </div>
                <div className={`text-sm ${priceChange.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                  ({priceChange.isIncrease ? '+' : ''}{priceChange.percent.toFixed(1)}%)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple Price History List */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">📈 Recent Price History</h3>
            <Button onClick={loadPriceHistory} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sortedPrices.reverse().map((record: PriceRecord, index: number) => (
              <div 
                key={record.id} 
                className={`flex items-center justify-between p-3 rounded-md border ${
                  index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="font-medium">
                      {record.recorded_at.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {record.recorded_at.toLocaleTimeString()} • {record.provider}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-bold ${index === 0 ? 'text-blue-700' : 'text-gray-900'}`}>
                    {formatPrice(record.price, record.currency)}
                  </p>
                  {index === 0 && (
                    <Badge variant="outline" className="mt-1 text-xs border-blue-300">
                      Latest
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center text-xs text-gray-500 mt-4 pt-3 border-t">
            Showing last {priceHistory.length} price records • Updated hourly
          </div>
        </CardContent>
      </Card>

      {/* Future Chart Placeholder */}
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="p-6 text-center">
          <div className="text-gray-400 mb-3">
            <div className="text-4xl mb-2">📊</div>
            <h4 className="font-medium text-gray-600">Interactive Price Chart</h4>
            <p className="text-sm mt-2">
              Coming soon: Visual price trend charts with interactive features!
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Will include: Line charts, moving averages, price prediction trends
          </div>
        </CardContent>
      </Card>
    </div>
  );
}