import { renderHook } from '@testing-library/react-native';
import { useChatRouteParams } from '../useChatRouteParams';
import { REGISTER_COMMAND } from '../../lib/chatRegistration';
import { MAX_ASK_LENGTH } from '../../constants/chatRoute';

type Params = { startRegistration?: string; ask?: string; askAt?: string };

describe('useChatRouteParams', () => {
  it('starts the registration once', () => {
    const send = jest.fn();
    const { rerender } = renderHook(({ params }) => useChatRouteParams(params, send), {
      initialProps: { params: { startRegistration: '1' } as Params },
    });

    rerender({ params: { startRegistration: '1' } });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(REGISTER_COMMAND);
  });

  it('sends a question asked from another screen once per request, trimmed', () => {
    const send = jest.fn();
    const { rerender } = renderHook(({ params }) => useChatRouteParams(params, send), {
      initialProps: { params: { ask: '  ¿Tiene garaje?  ', askAt: '1' } as Params },
    });

    rerender({ params: { ask: '  ¿Tiene garaje?  ', askAt: '1' } });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('¿Tiene garaje?');

    rerender({ params: { ask: '¿Tiene garaje?', askAt: '2' } });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('ignores empty and oversized questions', () => {
    const send = jest.fn();
    renderHook(() => useChatRouteParams({ ask: '   ', askAt: '1' }, send));
    renderHook(() => useChatRouteParams({ ask: 'x'.repeat(MAX_ASK_LENGTH + 1), askAt: '2' }, send));

    expect(send).not.toHaveBeenCalled();
  });
});
