import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { describeAuthError } from '../lib/authProviders';
import { createAgency } from '../services/authApi';
import { colors } from '../theme/colors';
import { getCreateAgencyStyles } from './create-agency.styles';

export default function CreateAgencyScreen() {
  const router = useRouter();
  const { status, capabilities, refreshProfile } = useAuth();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const styles = useMemo(() => getCreateAgencyStyles(theme), [theme]);
  const [agencyName, setAgencyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await createAgency(agencyName);
      await refreshProfile();
      router.replace('/agency');
    } catch (error) {
      setErrorMessage(labels.auth.createAgencyError(describeAuthError(error)));
    } finally {
      setSubmitting(false);
    }
  }, [agencyName, refreshProfile, router, labels]);

  const handleOpenSignIn = useCallback(() => router.push('/sign-in'), [router]);

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'signedIn' && !capabilities.canCreateAgency) {
    return <Redirect href="/" />;
  }

  if (status === 'signedOut') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>{labels.auth.signInRequiredForAgency}</Text>
          <Button
            testID="create-agency-sign-in"
            title={labels.burgerMenu.menuItems.signIn}
            onPress={handleOpenSignIn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {labels.auth.createAgencyTitle}
        </Text>
        <Text style={styles.subtitle}>{labels.auth.createAgencySubtitle}</Text>

        <Text style={styles.fieldLabel}>{labels.auth.agencyNameLabel}</Text>
        <TextInput
          style={styles.input}
          value={agencyName}
          onChangeText={setAgencyName}
          placeholder={labels.auth.agencyNamePlaceholder}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={labels.auth.agencyNameLabel}
          editable={!submitting}
          maxLength={100}
          returnKeyType="done"
        />

        {errorMessage && (
          <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {errorMessage}
          </Text>
        )}

        <Button
          testID="create-agency-submit"
          title={submitting ? labels.auth.createAgencySubmitting : labels.auth.createAgencySubmit}
          accessibilityLabel={labels.auth.createAgencySubmit}
          onPress={handleSubmit}
          loading={submitting}
        />
      </View>
    </SafeAreaView>
  );
}
