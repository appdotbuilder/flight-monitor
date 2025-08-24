import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, TrendingDown, TrendingUp, Target, Check, MapPin, ArrowRight } from 'lucide-react';
import type { Alert } from '../../../server/src/schema';

interface AlertsListProps {
  alerts: Alert[];
  onAlertRead: (alertId: number) => void;
}

export function AlertsList({ alerts, onAlertRead }: AlertsListProps) {
  const getAlertIcon = (alertType: Alert['alert_type']) => {
    switch (alertType) {
      case 'price_drop':
        return <TrendingDown className="h-5 w-5 text-green-600" />;
      case 'price_increase':
        return <TrendingUp className="h-5 w-5 text-red-600" />;
      case 'price_target_reached':
        return <Target className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAlertColor = (alertType: Alert['alert_type']) => {
    switch (alertType) {
      case 'price_drop':
        return 'border-green-200 bg-green-50/50';
      case 'price_increase':
        return 'border-red-200 bg-red-50/50';
      case 'price_target_reached':
        return 'border-blue-200 bg-blue-50/50';
      default:
        return 'border-gray-200 bg-gray-50/50';
    }
  };

  const getAlertEmoji = (alertType: Alert['alert_type']) => {
    switch (alertType) {
      case 'price_drop':
        return '📉🎉';
      case 'price_increase':
        return '📈⚠️';
      case 'price_target_reached':
        return '🎯✅';
      default:
        return '🔔';
    }
  };

  const formatPrice = (priceInCents: number, currency: string) => {
    const price = priceInCents / 100;
    return `${currency} ${price.toFixed(2)}`;
  };

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔔</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts Yet</h3>
        <p className="text-gray-500 mb-4">
          Once you start monitoring flights, price change alerts will appear here.
        </p>
        <div className="text-sm text-gray-400 space-y-1">
          <p>💡 <strong>Price Drop:</strong> Get excited when prices fall!</p>
          <p>📈 <strong>Price Increase:</strong> Stay informed about rising prices</p>
          <p>🎯 <strong>Target Reached:</strong> Know when your price target is hit</p>
        </div>
      </div>
    );
  }

  const sortedAlerts = [...alerts].sort((a: Alert, b: Alert) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedAlerts.map((alert: Alert) => (
        <Card 
          key={alert.id} 
          className={`transition-all duration-200 ${getAlertColor(alert.alert_type)} ${
            alert.is_read ? 'opacity-75' : 'shadow-md'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="flex-shrink-0 mt-1">
                  {getAlertIcon(alert.alert_type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-lg mr-2">{getAlertEmoji(alert.alert_type)}</span>
                    <Badge variant={alert.is_read ? "secondary" : "default"}>
                      {alert.alert_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </Badge>
                    {!alert.is_read && (
                      <Badge variant="destructive" className="ml-2 animate-pulse">
                        New
                      </Badge>
                    )}
                  </div>

                  <p className="text-gray-900 mb-3 leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium">New Price:</span>
                        <span className="ml-2 font-bold text-green-700">
                          {formatPrice(alert.new_price, alert.currency)}
                        </span>
                      </div>
                      {alert.old_price && (
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium">Previous:</span>
                          <span className="ml-2 line-through text-red-600">
                            {formatPrice(alert.old_price, alert.currency)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      {alert.created_at.toLocaleDateString()} at {alert.created_at.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>

              {!alert.is_read && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAlertRead(alert.id)}
                  className="flex items-center ml-4 flex-shrink-0"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Read
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="text-center text-sm text-gray-500 pt-4 border-t">
        <p className="mb-2">📱 <strong>Real-time Alerts:</strong> Stay updated on price changes as they happen</p>
        <p>🚀 <strong>Coming Soon:</strong> Telegram bot notifications for instant alerts on your phone!</p>
      </div>
    </div>
  );
}