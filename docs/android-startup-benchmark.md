# Android startup benchmark

Use a disposable emulator or test installation. This process clears only app data
for `com.memicard.app` on selected device.

## Build with timing enabled

Set `EXPO_PUBLIC_STARTUP_TIMING=1` before creating Android build. Do not set
`EXPO_PUBLIC_SIMULATE_STARTUP_PROGRESS`; simulated progress distorts results.

```bash
EXPO_PUBLIC_STARTUP_TIMING=1 npx expo run:android
```

Use same APK, Android version, device/emulator, and available storage for every
measurement. Open only Memicard during run.

## Collect five paired runs

First run means database/image files absent. Second run follows force-stop and
keeps app data.

```bash
adb logcat -c
adb shell pm clear com.memicard.app
adb shell monkey -p com.memicard.app 1
adb logcat -d -s ReactNativeJS:V ReactNative:V '*:S' | grep StartupTiming

adb shell am force-stop com.memicard.app
adb shell monkey -p com.memicard.app 1
adb logcat -d -s ReactNativeJS:V ReactNative:V '*:S' | grep StartupTiming
```

Repeat five times. Before each pair, run `adb logcat -c` and `adb shell pm clear`.
Do not clear app data between first and second run in pair.

Each DB line begins `[StartupTiming]` and contains JSON. Compare `totalMs` across
first/second runs; then compare `stages`. `imageHydration` shows unresolved image
references and worker-time totals for asset resolution, file copies, and SQLite
updates. Worker times overlap when copies run in parallel; use
`stages.imageHydration.durationMs` for elapsed user-visible time.
`app-shell-ready.totalMs` begins at JS entry and ends after app shell commits.
It excludes native process/splash startup; use Android profiler for native time.

Record each pair in table:

| Pair | First DB total | Second DB total | First image hydration | Slowest stage |
| --- | ---: | ---: | ---: | --- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

Use median and min/max for each column. If first-run image hydration reports
zero references, image copying is not startup cause. If second-run sync database
import remains largest, bundled DB copying is likely cause.
