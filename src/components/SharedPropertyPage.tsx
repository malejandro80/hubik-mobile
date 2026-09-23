import React, { useMemo } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InstallBar } from './InstallBar';
import { InstallSheet } from './InstallSheet';
import { SharedPropertyView } from './SharedPropertyView';
import { ANDROID_STORE_URL, IOS_STORE_URL } from '../constants/appStore';
import { useColorScheme } from '../hooks/useColorScheme';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useOpenApp } from '../hooks/useOpenApp';
import { useLabels } from '../hooks/useLabels';
import { useSharedProperty } from '../hooks/useSharedProperty';
import { buildAppLink } from '../lib/appLink';
import { resolveStoreUrl } from '../lib/storeLinks';
import { colors } from '../theme';
import { getSharedPageStyles } from './SharedPropertyPage.styles';

const APP_ICON = require('../../assets/icon.png');

const readUserAgent = (): string => (typeof navigator !== 'undefined' && navigator.userAgent) || '';

export interface SharedPropertyPageProps {
  value?: string;
}

export function SharedPropertyPage({ value }: SharedPropertyPageProps) {
  const { sharedProperty } = useLabels();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const styles = useMemo(() => getSharedPageStyles(theme), [theme]);
  const prompt = useInstallPrompt();
  const { status, property, retry } = useSharedProperty(value);
  const appLink = useMemo(() => (property ? buildAppLink(property) : null), [property]);
  const openApp = useOpenApp(appLink);
  const storeUrl = useMemo(() => resolveStoreUrl(readUserAgent(), IOS_STORE_URL, ANDROID_STORE_URL), []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Image source={APP_ICON} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.brand} accessibilityRole="header">
          {sharedProperty.brand}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {status === 'loading' && (
          <View style={styles.message}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.messageText}>{sharedProperty.loading}</Text>
          </View>
        )}
        {status === 'ready' && property && <SharedPropertyView property={property} />}
        {status === 'not_found' && (
          <View style={styles.message}>
            <Text style={styles.messageTitle} accessibilityRole="header">
              {sharedProperty.notFoundTitle}
            </Text>
            <Text style={styles.messageText}>{sharedProperty.notFoundMessage}</Text>
          </View>
        )}
        {status === 'error' && (
          <View style={styles.message}>
            <Text style={styles.messageText}>{sharedProperty.error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retry}
              accessibilityRole="button"
              accessibilityLabel={sharedProperty.retry}
            >
              <Text style={styles.retryText}>{sharedProperty.retry}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {!prompt.sheetVisible && <InstallBar onPress={prompt.reopen} />}
      <InstallSheet
        visible={prompt.sheetVisible}
        storeUrl={storeUrl}
        onDismiss={prompt.dismiss}
        appLink={appLink}
        openStatus={openApp.status}
        onOpenApp={openApp.open}
      />
    </SafeAreaView>
  );
}
