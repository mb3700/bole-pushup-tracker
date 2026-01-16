import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { healthKitService } from '@/services/healthkit';
import { Heart, RefreshCw } from 'lucide-react';

export function HealthKitSettings() {
  const [autoSync, setAutoSync] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Just check if auto-sync was previously enabled
    async function loadSyncState() {
      if (Capacitor.getPlatform() === 'ios') {
        try {
          const syncEnabled = await healthKitService.getAutoSyncEnabled();
          setAutoSync(syncEnabled);
        } catch (error) {
          console.error('Error loading sync state:', error);
        }
      }
      setIsLoading(false);
    }
    loadSyncState();
  }, []);

  async function handleConnectHealthKit() {
    setIsConnecting(true);

    // Add timeout to prevent infinite connecting
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10000)
    );

    try {
      const authorized = await Promise.race([
        healthKitService.requestAuthorization(),
        timeoutPromise
      ]);

      if (authorized) {
        toast({
          title: "Connected to Apple Health",
          description: "Your workouts will now sync to the Health app",
        });
        setAutoSync(true);
        await healthKitService.setAutoSyncEnabled(true);
      } else {
        // Still enable sync - user may have granted permissions
        toast({
          title: "Apple Health enabled",
          description: "Workouts will sync when permissions are granted",
        });
        setAutoSync(true);
        await healthKitService.setAutoSyncEnabled(true);
      }
    } catch (error) {
      console.error('HealthKit connect error:', error);
      // Even on error/timeout, enable sync - it may work later
      toast({
        title: "Apple Health enabled",
        description: "Sync enabled. Grant permissions in Settings > Health if needed.",
      });
      setAutoSync(true);
      await healthKitService.setAutoSyncEnabled(true);
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleAutoSyncChange(enabled: boolean) {
    setAutoSync(enabled);
    await healthKitService.setAutoSyncEnabled(enabled);

    if (enabled) {
      // Request authorization when enabling
      await healthKitService.requestAuthorization();
    }

    toast({
      title: enabled ? "Auto-sync enabled" : "Auto-sync disabled",
      description: enabled
        ? "Workouts will automatically sync to Apple Health"
        : "Workouts will no longer sync to Apple Health",
    });
  }

  // Don't render on non-iOS platforms
  if (Capacitor.getPlatform() !== 'ios') {
    return null;
  }

  // Show brief loading state
  if (isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-red-500" />
          Apple Health
        </CardTitle>
        <CardDescription>
          Sync your workouts with the Apple Health app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!autoSync ? (
          <Button
            onClick={handleConnectHealthKit}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Connect to Apple Health
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync" className="text-base">Auto-sync workouts</Label>
              <p className="text-sm text-muted-foreground">
                Automatically log pushups and walks to Health
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={autoSync}
              onCheckedChange={handleAutoSyncChange}
            />
          </div>
        )}

        {autoSync && (
          <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950 p-3 rounded-lg">
            <p className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              Connected to Apple Health
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
