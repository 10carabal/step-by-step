import { Service, signal } from '@angular/core';
import { FirebaseRemoteConfig } from '@capacitor-firebase/remote-config';


const GROUPED_VIEW_KEY = 'enable_grouped_view';

@Service()
export class RemoteConfigService {
  private readonly _enableGroupedView = signal<boolean>(false);
  readonly enableGroupedView = this._enableGroupedView.asReadonly();

  async initialize(): Promise<void> {
    try {
      await FirebaseRemoteConfig.setSettings({
        minimumFetchIntervalInSeconds: 10,
      });

      await FirebaseRemoteConfig.setDefaults({
        defaults: {
          [GROUPED_VIEW_KEY]: false,
        },
      });

      await FirebaseRemoteConfig.fetchAndActivate();

      const { value } = await FirebaseRemoteConfig.getBoolean({
        key: GROUPED_VIEW_KEY,
      });

      this._enableGroupedView.set(value);
    } catch (error) {
      console.error('[RemoteConfigService] Failed to fetch remote config:', error);
    }
  }
  async refresh(): Promise<void> {
    await this.initialize();
  }
}
