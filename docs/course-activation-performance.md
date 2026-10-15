# Course activation / Download panel investigation

## Evidence and current changes

The complete path is: card press → hydration/onboarding/cooldown guards → persisted
selection setter → Settings context update → activation screen → prepared groups →
affected group/section → old/new memoized rows → audio panel expansion → intrinsic
content `onLayout` → target height → Reanimated timing. Persistence completion also
triggers coachmark advancement and the activation popup; these can overlap reveal.

Code inspection established unnecessary work, not the cause of dropped UI frames:

- Group partitions and continuation searches previously ran for every selection.
  They now depend on course groups only. Group/section selection props are scoped
  to membership; unrelated selections become `null`. Existing row memoization stays.
- Every marquee text-layout event previously allocated a new state object, even
  with identical text and width. Identical measurements now retain state identity.
- Hidden panel height changes previously reran the timing effect even though its
  target remained zero. The effect now depends on the derived target height.
- Download state writes previously replaced snapshots and notified all subscribers
  for identical results. Normalized, unchanged snapshots now retain identity.
  Native readiness checks and revision handling still run.

Identical numeric heights already benefit from React state equality. Installed
Reanimated also preserves an ongoing timing timeline when its target is unchanged.
Neither a measurement loop nor repeated restarts were established on a device.
The reveal still uses height, negative margin up to 15, 260 ms, cubic easing,
absolute intrinsic measurement, and Reanimated's system reduced-motion default.

Hidden panels stay mounted/subscribed, measuring translated/scaled status content
and tracking shared-pack progress. They refresh on mount, not selection. Pack
refreshes deduplicate concurrent requests. App resume rechecks initialized packs.
The activation screen loads summaries on focus, not each course selection.
The existing background flashcard and Navbar fixes remain in place.

`profiling-data.15-10-2026.12-07-20.json` predates those two fixes. Its nine selection
commits each updated two official rows; group subtree durations ranged roughly
9.6–16.2 ms. These are historical React measurements, **not current UI-frame times**.
The newer `13-42-02` recording is analyzed separately below. No Android frame
trace or manual device validation was performed for the Home subscription change.

## Background Home rendering during selection

`profiling-data.15-10-2026.13-42-02.json` contains 120 commits. The five selection
commits have the following recorded React durations (commit numbers are 1-based):

| Commit | Whole update, ms | HomeScreen subtree, ms |
| --- | --- | --- |
| 1 | 33.189 | 10.374 |
| 32 | 31.644 | 6.470 |
| 58 | 32.564 | 5.614 |
| 77 | 30.534 | 6.077 |
| 95 | 30.109 | 9.748 |

The mean whole-update duration is 31.608 ms. Home's duration is already included
in each whole update; it is neither additional cost nor Home's self duration.
Home keeps fiber ID 897 and its route keeps ID 894 throughout the recording,
with no add/remove operations for either. These are renders, not remounts.
Each selection commit identifies SettingsProvider as its updater. The Home route
also renders, while intervening navigator components do not. Render reasons were
not recorded (`changeDescriptions` is null), so the JSON alone cannot identify
individual context subscriptions.

Code inspection identifies two independent subscriptions to the broad settings
context: Home reads `fontScaleMultiplier`, and its startup route reads `colors`.
Course selection updates that context, rendering Home directly and rendering its
parent route, which creates a new Home element. Home's styles already use the
existing narrow theme/accessibility context. Both remaining broad subscriptions
now use that same narrow context. No additional memo boundary is needed.

The app enables New Architecture. The installed native-stack implementation
excludes the immediately preceding screen from freezing under Fabric; therefore
`freezeOnBlur: true` does not reliably isolate Home behind the course panel.
The existing navigator configuration is preserved.

Home has no course-data loader or course-dependent effect. Its remaining hooks
observe navigation, window dimensions, translations and theme/accessibility.
Quote selection is already focus-gated. Removing the subscriptions prevents Home's
render body, tile construction, grid calculations and tile render work on course
changes, rather than merely skipping visible output after hooks have executed.
There is no blur placeholder, saved JSX, remount or deferred course snapshot.
Current-course display and play routing remain live in Navbar's course controls.

Regression coverage uses the actual startup route, Home, SettingsProvider,
persistence, locale hook and Expo Router navigation. Native/database/notification/
backup effects unrelated to this behavior are mocked. Freezing is deliberately
disabled in the test so it cannot hide an unwanted subscription. After Home
blurs, five persisted custom/builtin selection changes cause no additional Home
render-helper calls, tile-render calls or quote normalization. Refocus retains the
same FlatList instance and measured layout, and refreshes the quote once. Separate
checks keep theme, high contrast, color-blind mode, large fonts and language live,
including a language change while blurred. Navbar coverage verifies the latest
course title, accessibility label and play destination after returning Home.
Restoring either broad subscription independently makes the render-isolation
regression fail; both fixed subscriptions are required.

### Repeat profiling for the Home change

1. Use the same device, build configuration, locale, system/app font scale,
   course data and download states for before/after recordings. For a current
   baseline use a saved build containing the other ongoing fixes; do not reset
   the working tree or compare against HEAD if it lacks those fixes.
2. Open Home. On a small screen, scroll its grid and note the position. Open
   `/coursepanel`, then wait for summary loading, native checks and navigation
   transitions to settle.
3. Enable render reasons where available in React Native DevTools. Start React
   profiling and tap five different course tiles approximately one second apart,
   remaining on `/coursepanel`. Stop and export the recording.
4. Identify selection commits. Expect no selection-driven renders of the Home
   route, HomeScreen or its tile subtree. Attribute unrelated theme, language,
   window or download events separately; compare subtree durations without
   summing nested measurements.
5. Return Home. Check preserved scroll position/layout, the latest Navbar course
   title and accessibility label, correct play destination, and quote refresh.
   Repeat after theme/high-contrast/large-font/language changes while Home is
   blurred. Keep these deliberate updates separate from selection-only profiling.
6. Report the fresh recording's measured React durations with device/build
   details. No post-fix device timing or FPS has been measured here. Jest verifies
   render/effect isolation and retained component state; native scroll position,
   transition appearance and UI-frame performance still require device checks.

## Opt-in developer diagnostics

Start Metro with:

```bash
EXPO_PUBLIC_COURSE_ACTIVATION_DIAGNOSTICS=1 npx expo start --dev-client
```

The flag is read when the module loads; reload after changing it. Diagnostics also
require `__DEV__`; production builds stay inactive even with the flag set.
In React Native DevTools Console:

```js
globalThis.__courseActivationDiagnostics.reset()
// Perform one short scenario, then export/copy this result:
JSON.stringify(globalThis.__courseActivationDiagnostics.read(), null, 2)
```

The buffer holds the latest 500 events, with monotonic `performance.now()` timestamps
and sequence numbers. `dropped` reports overwritten events. Reset and export each
short scenario separately. No diagnostic console, AsyncStorage, per-frame callback,
or UI-frame listener runs during a transition. Existing PAD logs are separate and
still have their existing behavior.

Event interpretation:

| Event | Meaning |
| --- | --- |
| `selection.request` / `selection.accept` | Tap handler entry / passed activation guards |
| `selection.commit` | Effect observing selected ID after React commit; not paint completion |
| `selection.persisted` / `selection.effects` | Setter promise resolved / popup and coachmark requested |
| `courses.load.start/end` | Focus-triggered course summary load |
| `groups.prepare` | Group partition calculation; should not recur on ordinary selection |
| `group.render` / `section.render` | Render attempts, possibly retried; not commit counts |
| `react.commit` | React Profiler callback for screen, group, row, or panel subtree |
| `marquee.layout` / `marquee.textLayout` | Measurement callback delivery, including unchanged results; stable `measurementId` distinguishes title instances |
| `panel.layout` / `panel.target` | Intrinsic content height / scheduled animation target |
| `panel.state` | Committed panel phase/expansion change |
| `course.refresh.start/end` | Course-level refresh boundaries |
| `pack.refresh.start/join/end` | Native pack refresh / existing request reused / completion |
| `pack.state` | Changed pack snapshot; identical writes omitted |

Profiler durations are subtree-inclusive: do not sum nested screen/group/row/panel
durations. Diagnostic timestamps and React start/commit times use the JS performance
clock; Android traces have a separate clock. Align scenario boundaries and visible
input events, rather than subtracting timestamps across tools. A `panel.target` event
records scheduling, not UI-thread animation start/end or a rendered frame.

## Android recording procedure

1. Record device/model, Android version, screen refresh rate, app version/build,
   Hermes/New Architecture configuration, build type, locale, system font scale,
   app large-font setting, reduced motion, pinned course IDs, and pack states.
   Use an Android development client with native PAD for audio investigation.
   Expo Go's simulated download states cannot validate native delivery costs.
2. Compare a saved build containing both earlier fixes against this change using
   the same device/build configuration and data. `HEAD` alone may omit existing
   uncommitted fixes. If no such baseline build/copy exists, collect a new current
   trace and state that before/after device comparison is unavailable; do not use
   the historical JSON as the current baseline.
3. For cold entry, begin React profiling before entering course activation and
   record initial summary loading, panel refreshes, and measurements. Export this
   separately from warm interaction. Enable “record why each component rendered”
   where available in the installed React Native DevTools.
4. For warm interaction, wait for summary/native checks to settle. Reset the
   diagnostic buffer and start React profiling. Switch A↔B ten times, approximately
   500 ms apart, first within a section, then across sections/groups. Export profile
   and buffer after each short run. Expect only old/new official rows to update
   from selection alone; separate download/context changes from those updates.
5. Record a short A→B→A sequence with roughly 80–120 ms gaps, then a separate run
   scrolling adjacent tiles while reveal/collapse is underway. Existing 30 ms tap
   cooldown stays intact. Check final selected course and panel state, not just
   animation appearance.
6. Repeat warm scenarios for missing, active download, and ready states, including
   two courses sharing audio packs. Do not start downloads except through explicit
   button taps. Also test blur/refocus and background/resume; keep these separate
   from ordinary switching because they intentionally trigger refreshes.
7. Capture a **separate Android Studio System Trace** (or device System Tracing
   opened in Perfetto) around the same short scenarios. Include app threads,
   scheduling, graphics/frame tracks, and FrameTimeline when supported. Inspect
   missed frame deadlines, main/UI and JS thread work, layout/mount activity,
   RenderThread, SurfaceFlinger, GC, and native delivery callbacks. Determine
   whether stalls overlap React work, native refreshes, or sustained reveal layout.
   React Profiler alone cannot establish full UI-frame cost.
8. Repeat system tracing with diagnostics disabled and a representative
   release/profileable build. Keep device, course data, download state, thermal
   conditions, and workload comparable. Record build/profiling differences. Capture
   screen video separately where possible because recording adds overhead.
9. Report observed traces and real frame/deadline statistics with build/device
   metadata. Do not infer FPS from React render duration or Jest timing.

Optional supplementary frame statistics, on a connected device:

```bash
adb shell dumpsys gfxinfo com.memicard.app reset
# Perform one scenario.
adb shell dumpsys gfxinfo com.memicard.app framestats > course-activation-framestats.txt
```

These window statistics supplement the system trace; their coverage depends on
Android/rendering configuration. They are not standalone proof of all RN UI frames.

## Acceptance and remaining hypotheses

- Adjacent tiles move continuously with the original reveal; no final clipping,
  scroll jumps, or stale panel after rapid switching. Dynamic height responds to
  loading/status changes, rotation/narrow width, long translations, and large fonts.
- Hidden controls remain inaccessible and noninteractive. Visible controls retain
  labels, disabled/loading states, and live status announcements. Check TalkBack,
  high contrast, reduced motion, ordinary navigation, and onboarding coachmarks.
- Repeated identical measurements do not update marquee state. Changing collapsed
  content height does not reschedule zero-target timing. A real expanded-height
  change still retargets the reveal; no fixed-height shortcut is used.
- Shared pack updates still reach both panels. No automatic downloads, extra
  selection-triggered refreshes, duplicate confirmation dialogs, or revived
  background flashcard loading.

Still unconfirmed: native layout/render cost of height and margin animation,
frequency of device measurement callbacks, PAD refresh/progress fan-out, marquee
library measurement work, and popup/coachmark overlap. Change the animation
mechanism only if fresh traces isolate its cost; preserve appearance and layout.
A temporary no-animation build can isolate costs but is not an accepted fix.

Unit tests verify render isolation, state/measurement guards, target scheduling,
and download behavior. Reanimated's stock Jest mock creates shared values on each
render; the scheduling regression test stabilizes that mock to match the native
hook's lifetime. Jest cannot verify animation smoothness or native frame deadlines.

## Synchronized audio panel reveal

The activation screen now supplies a stable `CourseAudioRevealProvider`. Panels
submit accepted target heights in layout effects. One microtask collects the
latest target per shared height value and sends the batch in one Reanimated UI
worklet, starting the closing and opening animations together. Retargeting assigns
only the destination, preserving the current animated height. Cleanup removes
superseded/unmounted targets before dispatch. Other uses of the audio row retain
immediate independent scheduling without requiring a provider.

The 0.5-layout-unit measurement tolerance remains, as do the 260 ms cubic easing,
height/negative-margin geometry, intrinsic sizing, and system reduced-motion
default. No download or settings subscription is added by the coordinator.
`panel.target` remains a JS scheduling request, not proof of a displayed frame.

Regression tests cover paired scheduling in either list direction, A→B→A/C
before dispatch, interruption from intermediate heights, dynamic heights,
unmounted targets, stable provider identity, and actual audio rows rejecting the
observed measurement jitter. Existing accessibility/download tests remain.

For device validation, reset diagnostics immediately before a short A↔B run and
export before the 500-event buffer wraps. Check same-group and cross-group
switches in both list directions, plus rapid reversal during the transition.
Raw `panel.layout` callbacks may repeat; unchanged/jittering heights should not
produce repeated `panel.target` requests. Record slow-motion video to verify that
old/new panels begin moving together and keep their final state without clipping
or scroll jumps. Repeat with different panel statuses, long translations, large
fonts, width changes, and reduced motion. Jest establishes scheduling only;
simultaneous visible motion and smoothness have not been validated on a device.
