import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Mail, MessageCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput } from '../../../server/src/schema';

interface UserSetupProps {
  onUserCreated: (user: User) => void;
}

export function UserSetup({ onUserCreated }: UserSetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    telegram_chat_id: null,
    notification_enabled: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await trpc.createUser.mutate(formData);
      onUserCreated(user);
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-blue-200">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center text-2xl">
          <UserPlus className="h-6 w-6 mr-2 text-blue-600" />
          Welcome! Set Up Your Account
        </CardTitle>
        <CardDescription className="text-base">
          Create your account to start monitoring flight prices and receive alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
              }
              required
              className="text-base"
            />
            <p className="text-sm text-gray-500">
              We'll use this to identify your account and send important notifications
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram_chat_id" className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              Telegram Chat ID (Optional)
            </Label>
            <Input
              id="telegram_chat_id"
              type="text"
              placeholder="123456789 (leave empty if you don't use Telegram)"
              value={formData.telegram_chat_id || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateUserInput) => ({
                  ...prev,
                  telegram_chat_id: e.target.value || null
                }))
              }
              className="text-base"
            />
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>🤖 Future Feature:</strong> We're working on a Telegram bot that will send you 
                instant price alerts! To get your Chat ID, message <code>@userinfobot</code> on Telegram.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
            <div className="flex flex-col">
              <Label htmlFor="notifications" className="text-base font-medium">
                🔔 Enable Notifications
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Receive in-app alerts when flight prices change
              </p>
            </div>
            <Switch
              id="notifications"
              checked={formData.notification_enabled}
              onCheckedChange={(checked: boolean) =>
                setFormData((prev: CreateUserInput) => ({ ...prev, notification_enabled: checked }))
              }
            />
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !formData.email} 
            className="w-full text-base py-6"
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                Create Account & Start Monitoring
              </>
            )}
          </Button>

          <div className="text-center text-sm text-gray-500 pt-2">
            Your account will be saved locally. No passwords required! 🎉
          </div>
        </form>
      </CardContent>
    </Card>
  );
}