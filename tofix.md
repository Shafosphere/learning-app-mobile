qswyk@fedora:/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile$ npm run -s lint

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/components/box/boxCarouselItem.tsx
  2:27  warning  'Image' is defined but never used  @typescript-eslint/no-unused-vars

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/components/box/boxcarousel.tsx
   48:48  warning  Array type using 'Array<T>' is forbidden. Use 'T[]' instead                                                                      @typescript-eslint/array-type
  131:5   warning  React Hook useCallback has missing dependencies: 'boxH' and 'scrollToIndex'. Either include them or remove the dependency array  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/components/box/boxes.tsx
   1:10  warning  'Button' is defined but never used                                                                                                                                                                                                                                 @typescript-eslint/no-unused-vars
  37:31  warning  The ref value 'timersRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'timersRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps
  41:44  warning  Array type using 'Array<T>' is forbidden. Use 'T[]' instead                                                                                                                                                                                                        @typescript-eslint/array-type

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/components/card/card.tsx
  62:27  warning  Array type using 'Array<T>' is forbidden. Use 'T[]' instead  @typescript-eslint/array-type

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/components/carousel/RotaryStack.tsx
  151:21  error  Component definition is missing display name                                                                                                                    react/display-name
  235:33  error  React Hook "useInterpolatedStyle" cannot be called inside a callback. React Hooks must be called in a React function component or a custom React Hook function  react-hooks/rules-of-hooks

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/components/confetti/Confetti.tsx
  142:26  warning  The ref value 'pendingRemovalsRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'pendingRemovalsRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/components/stats/CourseProgressCard.tsx
    1:28  warning  'useMemo' is defined but never used                                                                              @typescript-eslint/no-unused-vars
   90:16  warning  '_' is defined but never used                                                                                    @typescript-eslint/no-unused-vars
  101:6   warning  React Hook useEffect has a missing dependency: 'activeCourse'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/components/stats/HardWordsList.tsx
  54:16  warning  '_' is defined but never used                                                                                    @typescript-eslint/no-unused-vars
  61:6   warning  React Hook useEffect has a missing dependency: 'activeCourse'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/components/stats/PinnedCoursesProgress.tsx
  99:16  warning  '_' is defined but never used  @typescript-eslint/no-unused-vars

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/constants/officialPacks.ts
  23:15  warning  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  33:15  warning  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  43:15  warning  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/contexts/SettingsContext.tsx
  378:44  warning  The ref value 'originalTextDefaultStyleRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'originalTextDefaultStyleRef.current' to a variable inside the effect, and use that variable in the cleanup function  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/db/sqlite/db.ts
   159:15  warning  Array type using 'Array<T>' is forbidden. Use 'T[]' instead  @typescript-eslint/array-type
   716:5   warning  A `require()` style import is forbidden                      @typescript-eslint/no-require-imports
   876:1   warning  Import in body of module; reorder to top                     import/first
  1075:1   warning  Import in body of module; reorder to top                     import/first
  1076:1   warning  Import in body of module; reorder to top                     import/first
  1077:1   warning  Import in body of module; reorder to top                     import/first

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/hooks/useBoxesPersistenceSnapshot.ts
   78:12  warning  '_' is defined but never used                                                                                    @typescript-eslint/no-unused-vars
  216:6   warning  React Hook useEffect has a missing dependency: 'initialWords'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  229:16  warning  '_' is defined but never used                                                                                    @typescript-eslint/no-unused-vars

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/hooks/useFlashcardsInteraction.ts
   26:19  warning  Array type using 'ReadonlyArray<T>' is forbidden. Use 'readonly T[]' instead                                          @typescript-eslint/array-type
  211:6   warning  React Hook useCallback has a missing dependency: 'questionShownAt'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/courses/activatecourse/CourseActivateScreen.tsx
  56:9  warning  The 'lang' object makes the dependencies of useCallback Hook (at line 278) change on every render. To fix this, wrap the initialization of 'lang' in its own useMemo() Hook  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/courses/editcourse/CourseEditScreen.tsx
  24:8  warning  Using exported name 'CourseIconColorSelector' as identifier for default import  import/no-named-as-default

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/courses/makenewcourse/CourseAppearanceScreen.tsx
  8:8  warning  Using exported name 'CourseIconColorSelector' as identifier for default import  import/no-named-as-default
  9:8  warning  Using exported name 'CourseNameField' as identifier for default import          import/no-named-as-default

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/courses/makenewcourse/importFlashcards.tsx
  147:36  warning  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/flashcards/FlashcardsScreen.tsx
   20:9  warning  'router' is assigned a value but never used          @typescript-eslint/no-unused-vars
   42:5  warning  'batchIndex' is assigned a value but never used      @typescript-eslint/no-unused-vars
   45:5  warning  'resetSave' is assigned a value but never used       @typescript-eslint/no-unused-vars
   49:5  warning  'progress' is assigned a value but never used        @typescript-eslint/no-unused-vars
  106:9  warning  'learnedPercent' is assigned a value but never used  @typescript-eslint/no-unused-vars

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/flashcards_custom/FlashcardsCustomScreen.tsx
   67:9  warning  'router' is assigned a value but never used                                                                      @typescript-eslint/no-unused-vars
  291:6  warning  React Hook useEffect has a missing dependency: 'downloadData'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/level/LevelScreen.tsx
   1:27  warning  'TouchableOpacity' is defined but never used                                                               @typescript-eslint/no-unused-vars
  47:16  warning  '_' is defined but never used                                                                              @typescript-eslint/no-unused-vars
  54:6   warning  React Hook useEffect has a missing dependency: 'levels'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/review/courses/CoursesReviewScreen.tsx
  83:10  warning  Array type using 'Array<T>' is forbidden. Use 'T[]' instead  @typescript-eslint/array-type

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/review/memorygame/MemoryGameScreen.tsx
  124:10  warning  '_selectedIds' is assigned a value but never used                                                                  @typescript-eslint/no-unused-vars
  316:6   warning  React Hook useEffect has a missing dependency: 'resetGameState'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/review/session/TypingReviewScreen.tsx
   58:10  warning  'correctAnswer' is assigned a value but never used                                                           @typescript-eslint/no-unused-vars
  146:6   warning  React Hook useEffect has a missing dependency: 'loadNext'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/review/temp/LegacyReviewScreen.tsx
  40:18  warning  '_' is defined but never used  @typescript-eslint/no-unused-vars

/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile/src/screens/stats/StatsScreen.tsx
   2:22  warning  'View' is defined but never used                   @typescript-eslint/no-unused-vars
  14:11  warning  'activeCourse' is assigned a value but never used  @typescript-eslint/no-unused-vars
  44:16  warning  'e' is defined but never used                      @typescript-eslint/no-unused-vars

✖ 55 problems (2 errors, 53 warnings)
  0 errors and 10 warnings potentially fixable with the `--fix` option.

qswyk@fedora:/run/media/qswyk/LinuxShare/Nowe/learning-app-mobile$ 