# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Step by Step" — an Ionic + Angular to-do list app with categories, built as a technical test. Tasks can be filtered/searched, reordered via drag-and-drop, and grouped by category (behind a Firebase Remote Config flag).

## Commands

```bash
npm start              # ng serve — dev server
npm run build           # ng build — production build to www/
npm run watch            # ng build --watch --configuration development
npm test               # ng test (runs vitest)
npm run lint             # ng lint (eslint via angular-eslint)
```

Run a single test file: `npx vitest run src/app/services/task.service.spec.ts`

## Firebase setup (required to run locally)

`src/environments/environment.ts` is gitignored. Copy `src/environments/environment.example.ts` to `environment.ts` and fill in Firebase Web config. In Firebase Console → Remote Config, create a boolean parameter `enable_grouped_view` (default `false`). Without this file present, the app fails at bootstrap (`initializeApp(environment.firebase)` in `src/main.ts`).

## Architecture

- **Standalone components only** — no `NgModule`, no `app.module.ts`. Routes lazy-load standalone components via `loadComponent` (`src/app/app.routes.ts`).
- **State management: Angular Signals, not NgRx/RxJS.** Each domain has a service (not `@Injectable`, uses the `@Service()` decorator from `@angular/core`) holding a private writable signal (`_tasks`, `_categories`) with a public `.asReadonly()` signal exposed. Components read signals and call service methods to mutate — never patch state directly. Derived views (`filteredTasks`, `sortedTasks`, `totalTasks`, etc.) are `computed()` signals, not recomputed in templates.
- **Persistence:** `@capacitor/preferences`, storing tasks/categories as JSON strings under fixed keys (`STORAGE_KEY` per service). Every mutation method (`addTask`, `toggleComplete`, `deleteTask`, ...) calls a private `persist()` after updating the signal — keep this pattern when adding new mutations.
- **Cross-service dependency:** `CategoryService.deleteCategory()` calls `TaskService.clearCategoryFromTasks()` to null out `categoryId` on affected tasks rather than leaving orphaned references — `TaskService` is injected directly into `CategoryService`.
- **Async init via `provideAppInitializer`** (`src/main.ts`): `CategoryService.initialize()`, `TaskService.initialize()`, and `RemoteConfigService.initialize()` all run and are awaited before the UI renders (avoids "flash of empty list" and unhandled init promises). When adding a new service with async startup data, wire its `initialize()` into this same `Promise.all`.
- **`RemoteConfigService`** wraps `@capacitor-firebase/remote-config`, exposes flags as readonly signals (e.g. `enableGroupedView`). Fetch failures are caught and logged, not thrown — the app must still boot if Remote Config is unreachable.
- **Models** (`src/app/models/`): `Task` has `order: number` for drag-and-drop persistence (`ion-reorder-group`) independent of `createdAt`, and `categoryId: string | null` for uncategorized tasks. `Category.color` is auto-assigned round-robin from the fixed `CATEGORY_COLORS` palette in `category-service.ts`.
- **UX patterns** are Notion-inspired, built on Ionic's native components rather than custom equivalents: `ion-item-sliding` for swipe-to-delete, `ion-reorder-group` for reordering, inline quick-add instead of modals, colored category chips.

## File naming

Files here use `*-service.ts` / `*.page.ts` (not the Angular-CLI-default `*.service.ts` in some existing files — inconsistent, check the target directory before creating a new file). ESLint enforces class-name suffixes `Page`/`Component` (`@angular-eslint/component-class-suffix`) and `app` selector prefix, kebab-case for components / camelCase for directives (`eslint.config.js`).

## Notes

- Capacitor is used instead of Cordova (the original test spec named Cordova); Capacitor is Ionic's current recommended successor.
- `CategoryService` currently has a stray `CATEGORY_COLORS: any;` instance field shadowing the module-level `CATEGORY_COLORS` const it actually uses — be aware of this when editing that file.
