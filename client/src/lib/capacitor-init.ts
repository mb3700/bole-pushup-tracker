import { Capacitor } from '@capacitor/core';
import { healthKitService } from '../services/healthkit';

export async function initializeCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('Running on web - skipping Capacitor initialization');
    return;
  }

  console.log(`Running on ${Capacitor.getPlatform()} - initializing native features`);

  // iOS-specific initialization
  if (Capacitor.getPlatform() === 'ios') {
    try {
      // Check if HealthKit is available
      const isHealthKitAvailable = await healthKitService.isAvailable();

      if (isHealthKitAvailable) {
        console.log('HealthKit is available');

        // Check if auto-sync is enabled
        const autoSyncEnabled = await healthKitService.getAutoSyncEnabled();

        if (autoSyncEnabled) {
          // Request authorization if auto-sync is enabled
          const authorized = await healthKitService.requestAuthorization();
          console.log('HealthKit authorization:', authorized ? 'granted' : 'denied or pending');
        }
      } else {
        console.log('HealthKit is not available on this device');
      }
    } catch (error) {
      console.error('Error initializing HealthKit:', error);
    }
  }
}
