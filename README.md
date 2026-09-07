# Step by Step

A clean and intuitive to-do list app that helps you organize your daily tasks
with custom categories. Add, complete, and manage your tasks effortlessly,
filter them by category, and stay on top of what matters — all with a fast,
native mobile experience powered by Ionic and Angular.

## Tech Stack

- **Framework:** Ionic + Angular 22 (standalone components)
- **State management:** Angular Signals (no NgRx/RxJS state — native reactivity)
- **Local persistence:** `@capacitor/preferences`
- **Native runtime:** Capacitor (see note below on Cordova)

## Key Technical Decisions

### Capacitor over Cordova

The technical test specifies Cordova as the hybrid build engine. This project
uses **Capacitor** instead, which is the current official successor
recommended by the Ionic team — Cordova is in legacy/maintenance mode.
Capacitor covers the same native build pipeline (Android/iOS project
generation, plugin ecosystem) with better long-term support and modern
tooling. Functionally equivalent for this project's requirements.

### Standalone Components (no NgModules)

The app is built entirely with Angular standalone components, aligned with
Angular's current recommended architecture — no `app.module.ts`, no
`NgModule` declarations.

### Signals-based state management

Both `TaskService` and `CategoryService` use Angular Signals as the single
source of truth:

- Private writable signal (`_tasks`, `_categories`) holds state internally.
- Public `.asReadonly()` signal is exposed — components can read but never
  mutate state directly, only through service methods.
- `computed()` signals derive filtered/sorted views (search, category
  filter, task counts) without duplicating logic in templates.

### `@capacitor/preferences` over `@ionic/storage-angular`

Chosen for being the official, lighter-weight Capacitor plugin with less
overhead for this app's simple key-value persistence needs (tasks and
categories stored as JSON).

### Async initialization via `provideAppInitializer`

Initial data loading (`TaskService.initialize()`, `CategoryService.initialize()`)
is registered as an Angular App Initializer rather than fired from each
service's constructor. This guarantees data is loaded and awaited _before_
the UI renders — avoiding unhandled promises, silent errors, and a "flash of
empty list" on startup. Also makes both services straightforward to unit
test (`initialize()` can be awaited directly).

### Data model

- `Task.order: number` — enables manual drag-and-drop reordering
  (`ion-reorder-group`), persisted independently from creation date.
- `Task.categoryId: string | null` — a task can be uncategorized.
- `Category.color` — auto-assigned from a fixed palette (round-robin) to
  keep visual consistency without requiring manual color picking.
- Deleting a category cascades through `TaskService.clearCategoryFromTasks()`,
  resetting `categoryId` to `null` on affected tasks rather than leaving
  orphaned references.

## UX Reference

UI/UX patterns are loosely inspired by Notion's task and tagging interactions:
swipe-to-delete, inline quick-add (no modal), colored category chips, grouped
views, and instant search — adapted to Ionic's native component set
(`ion-item-sliding`, `ion-reorder-group`) rather than custom-built equivalents.

## Git Workflow

This repository was created from scratch for this project (not forked from
an existing one). To mirror the requested fork + branch workflow, all
feature work happens on `feature/categories-and-firebase`, keeping `main`
limited to the initial scaffold commit.

## Project Structure

    src/app/
    ├── models/          # Task, Category interfaces
    ├── services/         # TaskService, CategoryService (signals + persistence)
    ├── components/        # Reusable UI pieces
    └── pages/            # Route-level views

## Firebase Setup

This project uses Firebase Remote Config for feature flags. Credentials are
gitignored for security reasons.

To run this project locally:

1. Create a Firebase project at https://console.firebase.google.com
2. Register a Web app inside the project (</> icon) and copy the config object
3. Copy the environment template:
   \`\`\`bash
   cp src/environments/environment.example.ts src/environments/environment.ts
   \`\`\`
4. Fill in `src/environments/environment.ts` with your Firebase config values
5. In Firebase Console → Remote Config, create a parameter named
   `enable_grouped_view` (Boolean, default: `false`)

## Challenges

We attempted to adopt Signal Forms (a stable API since Angular v17) for the app's inputs. However, we found that Ionic does not yet officially expose support for the FormValueControl interface required by [formField] on its web components (ion-input). This resulted in a runtime error (NG01914) when mounted inside overlays like ion-modal. As a workaround, we opted for a direct binding pattern using a signal combined with Ionic's native event ((ionInput)). This approach maintains the same principle of signal-based, unidirectional data flow without relying on an integration that the ecosystem does not yet support.

## Performance

We implemented Angular CDK Virtual Scroll to efficiently handle large volumes of tasks, which triggers automatically once a threshold of 50 items is reached. We evaluated using Ionic's native ion-virtual-scroll, but it has been deprecated since v7 in favor of the standard Angular CDK. Because Virtual Scroll is incompatible with ion-reorder-group drag-and-drop mechanics—as both features compete for physical element existence in the DOM—we designed a hybrid strategy. Smaller lists maintain manual reordering, while larger lists prioritize scroll performance. This approach reflects the fact that manually reordering dozens of tasks one by one ceases to be a useful user interaction at that scale anyway
