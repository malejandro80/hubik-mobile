import { Platform } from 'react-native';
import { colors } from '../colors';
import { elevation } from '../elevation';

describe('elevation', () => {
  const theme = colors.light;

  it('adds no shadow for the none level', () => {
    const style = elevation('none', theme);
    expect(style.shadowOpacity).toBeUndefined();
    expect(style.elevation).toBeUndefined();
    expect(style.boxShadow).toBeUndefined();
  });

  it('makes overlay stronger than raised on the current platform', () => {
    const raised = elevation('raised', theme);
    const overlay = elevation('overlay', theme);
    if (Platform.OS === 'android') {
      expect(Number(overlay.elevation)).toBeGreaterThan(Number(raised.elevation));
    } else {
      expect(Number(overlay.shadowRadius)).toBeGreaterThan(Number(raised.shadowRadius));
    }
  });

  it('outlines raised surfaces with the hairline border role', () => {
    expect(elevation('raised', theme).borderColor).toBe(theme.border);
  });
});
