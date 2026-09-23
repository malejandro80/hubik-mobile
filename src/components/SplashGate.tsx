import { useAuth } from '../hooks/useAuth';
import { useSplashHandoff } from '../hooks/useSplashHandoff';

export function SplashGate() {
  const { status } = useAuth();
  useSplashHandoff(status !== 'loading');
  return null;
}
