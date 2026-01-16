import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Import the HealthKit plugin
// We use dynamic import to avoid issues on web
let HealthPlugin: any = null;

async function getHealthPlugin() {
  if (HealthPlugin) return HealthPlugin;

  if (Capacitor.getPlatform() === 'ios') {
    try {
      const module = await import('@capgo/capacitor-health');
      HealthPlugin = module.Health;
      return HealthPlugin;
    } catch (error) {
      console.error('Failed to load HealthKit plugin:', error);
      return null;
    }
  }
  return null;
}

export interface HealthKitService {
  isAvailable(): Promise<boolean>;
  requestAuthorization(): Promise<boolean>;
  writePushupWorkout(count: number, date: Date): Promise<void>;
  writeWalkingDistance(miles: number, date: Date): Promise<void>;
  getAutoSyncEnabled(): Promise<boolean>;
  setAutoSyncEnabled(enabled: boolean): Promise<void>;
}

const HEALTHKIT_AUTO_SYNC_KEY = 'healthkit_auto_sync';

export const healthKitService: HealthKitService = {
  async isAvailable(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') return false;

    try {
      const Health = await getHealthPlugin();
      if (!Health) return false;

      const result = await Health.isAvailable();
      return result.available === true;
    } catch (error) {
      console.error('HealthKit availability check failed:', error);
      return false;
    }
  },

  async requestAuthorization(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') return false;

    try {
      const Health = await getHealthPlugin();
      if (!Health) return false;

      // Request permissions for the data types we need
      await Health.requestAuthorization({
        read: ['steps', 'distance'],
        write: ['distance', 'calories'],
      });

      return true;
    } catch (error) {
      console.error('HealthKit authorization failed:', error);
      return false;
    }
  },

  async writePushupWorkout(count: number, date: Date): Promise<void> {
    if (Capacitor.getPlatform() !== 'ios') return;

    try {
      const Health = await getHealthPlugin();
      if (!Health) return;

      // Estimate calories burned: ~0.4 calories per pushup
      const caloriesBurned = Math.round(count * 0.4);

      // Save as active calories burned (closest available metric)
      await Health.saveSample({
        dataType: 'calories',
        value: caloriesBurned,
        startDate: date.toISOString(),
        endDate: new Date(date.getTime() + count * 3000).toISOString(), // ~3 sec per pushup
      });
    } catch (error) {
      console.error('Failed to write pushup workout to HealthKit:', error);
      throw error;
    }
  },

  async writeWalkingDistance(miles: number, date: Date): Promise<void> {
    if (Capacitor.getPlatform() !== 'ios') return;

    try {
      const Health = await getHealthPlugin();
      if (!Health) return;

      // Convert miles to meters (HealthKit uses meters)
      const meters = miles * 1609.34;

      // Estimate duration: ~20 minutes per mile walking
      const durationMs = miles * 20 * 60 * 1000;

      await Health.saveSample({
        dataType: 'distance',
        value: meters,
        startDate: date.toISOString(),
        endDate: new Date(date.getTime() + durationMs).toISOString(),
      });
    } catch (error) {
      console.error('Failed to write walking distance to HealthKit:', error);
      throw error;
    }
  },

  async getAutoSyncEnabled(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: HEALTHKIT_AUTO_SYNC_KEY });
      return value === 'true';
    } catch {
      return false;
    }
  },

  async setAutoSyncEnabled(enabled: boolean): Promise<void> {
    await Preferences.set({
      key: HEALTHKIT_AUTO_SYNC_KEY,
      value: enabled ? 'true' : 'false',
    });
  },
};

// Hook for React components
export function useHealthKit() {
  return healthKitService;
}
