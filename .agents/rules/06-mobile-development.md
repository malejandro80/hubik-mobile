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

## 5. Accessibility (a11y)
- Every interactive element MUST define:
  - `accessibilityRole` (e.g. `'button'`, `'link'`, `'header'`, `'checkbox'`).
  - `accessibilityLabel` (short, descriptive text for screen readers).
  - `accessibilityState` (e.g. `{ disabled: true, selected: true }`).
