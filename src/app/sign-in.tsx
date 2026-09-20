import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { AUTH_PROVIDER_OPTIONS, describeAuthError } from '../lib/authProviders';
import { colors } from '../theme/colors';
import { AuthProviderName } from '../types/auth';
import { getSignInStyles } from './sign-in.styles';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const styles = useMemo(() => getSignInStyles(theme), [theme]);
  const [busyProvider, setBusyProvider] = useState<AuthProviderName | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = useCallback(
    async (provider: AuthProviderName) => {
      setBusyProvider(provider);
      setErrorMessage(null);
      try {
        const outcome = await signIn(provider);
        if (outcome === 'signedIn') router.replace('/');
      } catch (error) {
        setErrorMessage(labels.auth.signInError(describeAuthError(error)));
      } finally {
        setBusyProvider(null);
      }
    },
    [signIn, router, labels]
  );

  const handleContinueWithoutAccount = useCallback(() => router.replace('/'), [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {labels.auth.signInTitle}
        </Text>
        <Text style={styles.subtitle}>{labels.auth.signInSubtitle}</Text>

        {AUTH_PROVIDER_OPTIONS.map(({ provider, label }) => (
          <Button
            key={provider}
            testID={`sign-in-${provider}`}
            title={label}
            onPress={() => handleSignIn(provider)}
            disabled={busyProvider !== null}
            loading={busyProvider === provider}
          />
        ))}

        {errorMessage && (
          <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {errorMessage}
          </Text>
        )}

        <Button
          testID="sign-in-continue-without-account"
          title={labels.auth.continueWithoutAccount}
          variant="secondary"
          onPress={handleContinueWithoutAccount}
          disabled={busyProvider !== null}
        />
      </View>
    </SafeAreaView>
  );
}
