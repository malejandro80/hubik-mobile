import { Platform, TextStyle } from 'react-native';

export type TypeRole = 'display' | 'title' | 'headline' | 'body' | 'bodyStrong' | 'label' | 'caption';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

export const typography: Record<TypeRole, TextStyle> = {
  display: { fontFamily: SERIF, fontSize: 30, lineHeight: 38, fontWeight: '600' },
  title: { fontFamily: SERIF, fontSize: 22, lineHeight: 30, fontWeight: '600' },
  headline: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
};
