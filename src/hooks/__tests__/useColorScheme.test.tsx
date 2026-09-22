import React from 'react';
import { renderHook } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { useColorScheme } from '../useColorScheme';

const { renderToString } = jest.requireActual<{ renderToString: (element: React.ReactElement) => string }>(
  'react-dom/server'
);

const nativeScheme = jest.spyOn(ReactNative, 'useColorScheme');

const Probe = () => <>{useColorScheme()}</>;

describe('useColorScheme', () => {
  afterEach(() => {
    nativeScheme.mockReset();
  });

  it('follows the device on the client', () => {
    nativeScheme.mockReturnValue('dark');
    expect(renderHook(() => useColorScheme()).result.current).toBe('dark');

    nativeScheme.mockReturnValue('light');
    expect(renderHook(() => useColorScheme()).result.current).toBe('light');
  });

  it('falls back to light when the device has no preference', () => {
    nativeScheme.mockReturnValue('unspecified');

    expect(renderHook(() => useColorScheme()).result.current).toBe('light');
  });

  it('renders light on the server whatever the device says, so hydration matches the HTML', () => {
    nativeScheme.mockReturnValue('dark');

    expect(renderToString(<Probe />)).toBe('light');
  });
});
