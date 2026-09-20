# Workspace Rule: Mobile Development Standards (React Native & Expo)

This rule establishes mandatory standards for all mobile application code built using React Native and Expo in this repository.

## 1. UI & Layout Discipline
- **Safe Area Integration**: All screen entry points must handle top/bottom safe areas using `SafeAreaView` from `react-native-safe-area-context` or appropriate insets via `useSafeAreaInsets()`.
- **Dynamic Sizing & Flexbox**: Never use fixed layout heights or widths that break across different phone/tablet screen dimensions. Rely on Flexbox (`flex: 1`, `flexDirection`, `alignItems`, `justifyContent`) and relative percentage/gap spacing.
- **Touch Bounds**: Interactive elements (`Pressable`, `TouchableOpacity`, `Button`) must maintain a minimum physical touch target of **44x44pt (iOS)** / **48x48dp (Android)**.

## 2. Performance & Re-render Prevention
- **Virtualised Lists**: Always use `FlatList`, `SectionList`, or `FlashList` for scrollable list content. Never render `.map()` over large arrays inside a `<ScrollView>`.
- **List Item Stability**: Provide explicit `keyExtractor` returning unique IDs. Keep render items modular and wrap them in `React.memo()` if lists are frequently updated.
- **Offloading JS Thread**: Keep costly animations on the UI thread using `react-native-reanimated` worklets or native driver capabilities.

## 3. Platform Branching & Adaptability
- **Platform Parity**: Code must function identically on both iOS and Android unless a platform-specific API design requires conditional logic.
- **Platform Files**: Prefer `.ios.tsx` and `.android.tsx` over sprawling `Platform.OS === 'ios'` conditionals in single large files.
- **Dark & Light Mode**: Support light and dark color schemes via unified design tokens (`src/theme/colors.ts`) and `useColorScheme()`.

## 4. Mobile Security & Storage
- **Encrypted Vaults**: Use `expo-secure-store` for sensitive state, JWT auth tokens, or private user credentials. Never write credentials to unencrypted `AsyncStorage` or global state.
- **Secret Quarantine**: Do not embed private backend secrets, master private keys, or write tokens in the client JavaScript bundle. Keep client configs public-key or API gateway scoped.

## 5. Mandatory Style Isolation (All Components & Screens)
- **Zero Inline Stylesheets**: All components and screens across the entire project MUST host their `StyleSheet.create({...})` block in an adjacent, dedicated `<Name>.styles.ts` file (e.g., `Button.tsx` → `Button.styles.ts`, `index.tsx` → `index.styles.ts`).
- **No Embedded `StyleSheet.create` in `.tsx`**: Defining or embedding `StyleSheet.create` inside any `.tsx` component or screen file is strictly prohibited.
- **Theme-Aware Styles**: For stylesheets requiring theme tokens directly, export a factory function (e.g. `get<Name>Styles(theme)`) or export a static `styles` sheet with clean dynamic style composition.
- **Separation of Concerns**: `.tsx` files must strictly focus on structure, layout composition, a11y, and behavior, while all styling rules and metrics remain modular and isolated in `.styles.ts`.

## 6. Accessibility (a11y)
- Every interactive element MUST define:
  - `accessibilityRole` (e.g. `'button'`, `'link'`, `'header'`, `'checkbox'`).
  - `accessibilityLabel` (short, descriptive text for screen readers).
  - `accessibilityState` (e.g. `{ disabled: true, selected: true }`).

## 7. Centralized Text & Copy Management (`useLabels`)
- **Zero Hardcoded User-Facing Copy**: All user-facing strings, input placeholders, screen reader accessibility labels, alert messages, and button labels must be defined in `src/constants/labels.ts`.
- **Consumption Via Hook or Direct Import**:
  - React components and screens consume labels using `const labels = useLabels();` from `src/hooks/useLabels`.
  - Top-level module definitions and fixtures can import `labels` directly from `src/constants/labels`.
- **String Integrity**: Centralized labels must maintain a consistent, typed hierarchy (`common`, `chat`, `propertyCard`, `photoGrid`, `mapPicker`, `livingDraft`, `burgerMenu`, `propertyDetail`, `notFound`, `suggestionChips`).

## 8. Dictionary of Options Pattern (Zero Nested Ternaries)
- **Eliminate Nested Ternaries**: Nested ternary operators (`a ? b : c ? d : e`) are strictly prohibited across components, screens, and style factories for resolving variants, icons, accessibility labels, states, or styles.
- **Dictionary / Lookup Map Pattern**: Whenever a component or style factory handles multiple discrete states or variants (e.g. button variants, action buttons with recording/send/mic states, status chips, or multi-option templates), define a typed dictionary/lookup map (`Record<StateKey, OptionConfig>` or `const OPTIONS = { ... } as const`).
- **Clean State Resolution**: Derive the active state key explicitly via a helper or clear conditional, then look up the configuration directly (`options[stateKey]`).
- **Performance**: For dictionaries defined inside components that depend on themes or labels, memoize them via `useMemo` with appropriate dependencies to avoid redundant object allocations on re-renders.

## 9. Pure Logic Extraction Outside Components
- **Zero Heavy Logic in Components**: Complex procedural logic, regex parsing, markdown/string splitting, and array manipulations must NEVER be embedded inside component bodies or JSX render loops.
- **Top-Level Pure Functions**: Extract data transformations, formatting, and text parsing into pure functions declared outside the component or in helper modules.
- **Memoization**: In components, pass pure helper results via `useMemo([input])` to avoid recalculations on re-render. Keep the JSX strictly declarative.

## 10. Dedicated Library Extraction for Dictionaries & Secondary Functions (`src/lib/`)
- **Zero Embedded Dictionaries & Secondary Logic**: Dictionaries of options, string formatters, parsing routines, intent recognizers, and secondary helper functions must NEVER reside inside `.tsx` screen or component files.
- **Dedicated Library Modules**: Extract these pure functions and lookup dictionaries into dedicated library files under `src/lib/` (e.g., `src/lib/livingDraft.ts`, `src/lib/messageParser.ts`, `src/lib/chatRegistration.ts`).
- **Independent Testability**: Every library module under `src/lib/` must have an associated test suite under `src/lib/__tests__/`. React view files consume these tested libraries via clean imports.
- **Declarative Views**: Screens and components remain strictly lean and declarative, focusing purely on UI composition, theme consumption, and user interactions.

## 11. Self-Documenting Code & Zero-Comment Discipline
- **Zero Explanatory Comments**: Comments explaining component props, hooks, render blocks, or stylesheet metrics are strictly forbidden.
- **Expressive Semantic Identifiers**: All component props, interfaces, event handlers, and constants must possess clear, unmistakable semantic names that render comments redundant.
- **Clean JSX**: JSX markup must remain pristine and uncluttered by inline comment delimiters.


