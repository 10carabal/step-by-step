import { bootstrapApplication } from '@angular/platform-browser';
import { PreloadAllModules, RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { inject, provideAppInitializer } from '@angular/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { CategoryService } from './app/services/category-service';
import { TaskService } from './app/services/task-service';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideAppInitializer(() => {
      const categoryService = inject(CategoryService);
      const taskService = inject(TaskService);
      return Promise.all([categoryService.initialize(), taskService.initialize()]);
    }),
  ],
});
