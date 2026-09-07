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
- **Backend:** Firebase Remote Config (feature flags)
- **CI/CD:** Codemagic (iOS build, given no compatible Mac available locally)

---

## Getting Started

### Prerequisites

- Node.js 22+
- Ionic CLI (`npm install -g @ionic/cli`)
- For Android builds: Android Studio + JDK 21 (8–24 range)
- For iOS builds: see [iOS Build](#ios-build) section below

### Local development

```bash
git clone https://github.com/YOUR_USERNAME/step-by-step.git
cd step-by-step
npm install
```

Set up Firebase credentials (see [Firebase Setup](#firebase-setup) below), then:

```bash
ionic serve
```

The app opens at `http://localhost:8100`.

---

## Firebase Setup

This project uses Firebase Remote Config for feature flags. Credentials are
gitignored for security reasons.

1. Create a Firebase project at https://console.firebase.google.com
2. Register a Web app inside the project (`</>` icon) and copy the config object
3. Copy the environment template:

```bash
   cp src/environments/environment.example.ts src/environments/environment.ts
```

4. Fill in `src/environments/environment.ts` with your Firebase config values
5. In Firebase Console → Remote Config, create a parameter named
   `enable_grouped_view` (Boolean, default: `false`) and **publish** it

### Demoing the feature flag

1. Run the app with `enable_grouped_view = false` — tasks display as a flat,
   reorderable list.
2. In Firebase Console, toggle the parameter to `true` and publish.
3. Within ~10 seconds (or on next app fetch), the same tasks reorganize into
   sections grouped by category — with no rebuild or app restart required.

---

## Building for Android

```bash
npm run build
npm install @capacitor/android
npx cap add android
npx cap sync
npx cap open android
```

In Android Studio: `Build → Build Bundle(s) / APK(s) → Build APK(s)`.

Or via command line, from the `android/` folder:

```bash
./gradlew assembleDebug
```

The APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## iOS Build

Building for iOS requires macOS + Xcode. Development for this project
happened primarily on Windows; the only available Mac (2012, Intel) cannot
run a compatible Xcode version (Apple now requires macOS 26+ and Apple
Silicon). **[Codemagic](https://codemagic.io)** was used instead to compile
iOS in the cloud.

### Reproducing the iOS build

1. Connect your repository to Codemagic
2. Add a `firebase_credentials` environment variable group (Secure) with:
   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`,
   `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
3. The included `codemagic.yaml` at the repo root defines the full pipeline:
   install dependencies → generate environment files → build Angular →
   add/sync iOS platform → compile with `xcodebuild`
4. Trigger a build from the Codemagic dashboard

See [iOS Build — Signing Limitation](#ios-build--signing-limitation) below
for why the output is an unsigned `.app` rather than a signed `.ipa`.

---

## Key Technical Decisions

### Capacitor over Cordova

The technical test specifies Cordova as the hybrid build engine. This project
uses **Capacitor** instead, the current official successor recommended by
the Ionic team — Cordova is in legacy/maintenance mode. Capacitor covers the
same native build pipeline (Android/iOS project generation, plugin
ecosystem) with better long-term support and modern tooling. Functionally
equivalent for this project's requirements.

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

Initial data loading (`TaskService.initialize()`, `CategoryService.initialize()`,
`RemoteConfigService.initialize()`) is registered as an Angular App
Initializer rather than fired from each service's constructor. This
guarantees data is loaded and awaited _before_ the UI renders — avoiding
unhandled promises, silent errors, and a "flash of empty list" on startup.
Also makes all three services straightforward to unit test (`initialize()`
can be awaited directly).

### Data model

- `Task.order: number` — enables manual drag-and-drop reordering
  (`ion-reorder-group`), persisted independently from creation date.
- `Task.categoryId: string | null` — a task can be uncategorized.
- `Category.color` — auto-assigned from a fixed palette (round-robin) to
  keep visual consistency without requiring manual color picking.
- Deleting a category cascades through `TaskService.clearCategoryFromTasks()`,
  resetting `categoryId` to `null` on affected tasks rather than leaving
  orphaned references.

### UX Reference

UI/UX patterns are loosely inspired by Notion's task and tagging
interactions: swipe-to-delete, inline quick-add (no modal), colored category
chips, grouped views, and instant search — adapted to Ionic's native
component set (`ion-item-sliding`, `ion-reorder-group`) rather than
custom-built equivalents.

### Git Workflow

This repository was created from scratch for this project (not forked from
an existing one). To mirror the requested fork + branch workflow, all
feature work happened on `feature/categories-and-firebase`, keeping `main`
limited to the initial scaffold commit before merging.

---

## Performance Optimizations

- **Zoneless Change Detection:** Since all application state is managed
  through Angular Signals (no RxJS/Observable-driven state), Zone.js became
  unnecessary overhead. Removing it (`provideZonelessChangeDetection()`)
  eliminates its runtime cost and reduces the initial JS bundle size.

- **Virtual Scroll (Angular CDK) for large task lists:** Rendering every
  task in the DOM doesn't scale. A hybrid strategy is used: lists under 50
  items use `ion-reorder-group` for manual drag-and-drop reordering; lists
  above that threshold switch to `cdk-virtual-scroll-viewport`, rendering
  only visible items. Virtual Scroll and native reorder gestures aren't
  natively compatible (both require every item to physically exist in the
  DOM) — and manually reordering dozens of tasks stops being a useful
  interaction at that scale anyway. Ionic's native `ion-virtual-scroll` was
  considered but is deprecated since v7 in favor of the Angular CDK.

- **Code-splitting for non-critical UI:** The category management modal is
  loaded via a dynamic `import()` inside its trigger handler rather than a
  static import, keeping it out of the initial bundle. Angular's `@defer`
  block was considered, but that syntax applies to components declared
  inline in a template — for components opened programmatically via
  `ModalController`, a dynamic import is the correct equivalent technique.

- **Deferred, awaited initial data load:** see _Async initialization_ above.

---

## Challenges & Trade-offs

### Signal Forms vs. Ionic Web Components

Signal Forms (Angular's new form API, stable since v22) was evaluated for
input binding via `[formField]`. Ionic's `ion-input` doesn't yet implement
the `FormValueControl` interface this API requires, producing a runtime
error (`NG01914`) specifically when mounted inside an `ion-modal`. Reverted
to direct signal + `(ionInput)` event binding — preserving the same
unidirectional, signals-based state management without depending on an
integration the ecosystem doesn't yet support.

### Swift Package Manager instead of CocoaPods

The current version of Capacitor manages native iOS dependencies via Swift
Package Manager rather than CocoaPods, evidenced by the `CapApp-SPM` folder
generated automatically by `cap add ios`. This simplifies the CI pipeline
by eliminating an extra installation step (and its associated failure
surface).

### SPM package identity conflict

`@capacitor/app` (a core plugin, not actively used in this app's logic) and
`@capacitor-firebase/app` (required for Remote Config) both expose a Swift
target with the same identity ("app"), breaking dependency resolution.
Resolved by removing the unused `@capacitor/app` dependency.

### iOS build without a compatible Mac

Development happened primarily on Windows; the available Mac (2012, Intel,
macOS Monterey 12.7.6) cannot run a modern Xcode version — Apple now
requires macOS 26+ and Apple Silicon. A Codemagic CI pipeline was set up to
compile natively in the cloud instead, requiring debugging of: Node version
mismatches (Angular 22 requires Node 22+), secure environment variable
injection for gitignored Firebase credentials, and the SPM conflict above.

### iOS Build — Signing Limitation

An unsigned iOS build (`App.app.zip`) is provided, successfully compiled via
Codemagic CI targeting a real macOS/Xcode environment. A fully signed `.ipa`
was not produced: Apple requires code signing for any installable iOS
build, and both signing methods available without an active Apple Developer
Program membership ($99/year) — Development signing (free account) and Ad
Hoc distribution (paid account) — require registering the UDID of at least
one physical iOS device. No physical iPhone/iPad was available to complete
this step; this is a hardware/access constraint, not a configuration gap.

As explicitly anticipated in the test instructions ("No entregar el .IPA...
aunque eso bajaría puntos"), we prioritized demonstrating full technical
capability instead: a working macOS/Xcode CI pipeline, successful native
iOS compilation, and complete Android APK generation locally — while being
transparent about this specific limitation rather than leaving it
unaddressed.

---

## Project Structure

    src/app/
    ├── models/            # Task, Category interfaces
    ├── services/          # TaskService, CategoryService, RemoteConfigService
    ├── components/        # Reusable UI pieces (category manager, etc.)
    └── pages/             # Route-level views (home)

---

## Deliverable Answers

### 1. What were the main challenges you faced implementing the new features?

See the [Challenges & Trade-offs](#challenges--trade-offs) section above —
each challenge there reflects a real technical obstacle encountered during
development (Signal Forms/Ionic incompatibility, SPM conflicts, building
iOS without a compatible Mac, and code signing without a physical device),
along with the reasoning behind each resolution.

### 2. What performance optimization techniques did you apply and why?

See the [Performance Optimizations](#performance-optimizations) section
above: Zoneless Change Detection, hybrid Virtual Scroll / manual reorder
strategy, and code-splitting via dynamic imports for non-critical UI.

### 3. How did you ensure code quality and maintainability?

- **Single source of truth per domain:** `TaskService` and `CategoryService`
  each hold a private writable signal and expose only a `.asReadonly()`
  view — components can read state reactively but can only mutate it
  through explicit, named service methods.
- **Derived state via `computed()`:** Filtering (search + category),
  sorting, and grouping are all `computed()` signals rather than logic
  duplicated inside templates or components.
- **Type-safe environment configuration:** A shared `Environment` interface
  is used across `environment.ts` and `environment.prod.ts`, catching
  missing configuration (like the Firebase config) at compile time rather
  than failing silently, or only at runtime in production.
- **Cross-service orchestration kept explicit:** Deleting a category calls
  `CategoryService.deleteCategory()`, which in turn calls
  `TaskService.clearCategoryFromTasks()` — preventing orphaned
  `categoryId` references — while keeping each service focused on a single
  responsibility.
- **Git workflow discipline:** All feature work happened on a dedicated
  branch (`feature/categories-and-firebase`), separate from `main`,
  mirroring the fork + branch workflow the test requests.
- **Documented technical trade-offs:** Every non-trivial decision is
  documented in this README as it was made, keeping the reasoning
  auditable for anyone reviewing or extending the codebase later.

---

## Demo & Downloads

- 🎥 **Demo video:** https://youtu.be/b4hDhFCH_EM
- 📦 **Android APK:** [Download](https://github.com/10carabal/step-by-step/releases/download/v1.0.0/app-debug.apk)
- 🍎 **iOS build (unsigned):** [Download](https://github.com/10carabal/step-by-step/releases/download/v1.0.0/App.app.zip)
