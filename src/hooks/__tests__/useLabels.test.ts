import { renderHook } from '@testing-library/react-native';
import { useLabels, labels } from '../useLabels';

describe('useLabels Hook', () => {
  it('returns the centralized labels object', () => {
    const { result } = renderHook(() => useLabels());
    expect(result.current).toBe(labels);
    expect(result.current.common.hubik).toBe('Hubik');
    expect(result.current.chat.inputPlaceholder).toBe('Escriba su consulta aquí...');
    expect(result.current.chat.accessibilityInput).toBe('Campo de consulta inmobiliaria');
  });
});
