import { bootstrapApplication } from '@angular/platform-browser';
import { PreloadAllModules, RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { CategoryService } from './app/services/category-service';
import { TaskService } from './app/services/task-service';

import { RemoteConfigService } from './app/services/remote-config-service';
import { registerAppIcons } from './assets/icons';
import { environment } from './environments/environment';

initializeApp(environment.firebase);

registerAppIcons();

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideZonelessChangeDetection(),
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideAppInitializer(() => {
      const categoryService = inject(CategoryService);
      const taskService = inject(TaskService);
      const remoteConfigService = inject(RemoteConfigService);

      return Promise.all([categoryService.initialize(), taskService.initialize(), remoteConfigService.initialize()]);
    }),
  ],
});
