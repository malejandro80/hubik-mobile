import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Image, Linking, Pressable, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { INSTALL_SHEET_SLIDE_MS } from '../constants/share';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { OpenAppStatus } from '../hooks/useOpenApp';
import { colors } from '../theme/colors';
import { getInstallSheetStyles } from './InstallSheet.styles';

export interface InstallSheetProps {
  visible: boolean;
  storeUrl: string | null;
  onDismiss: () => void;
  appLink?: string | null;
  openStatus?: OpenAppStatus;
  onOpenApp?: () => void;
}

const APP_ICON = require('../../assets/icon.png');

export const InstallSheet: React.FC<InstallSheetProps> = ({
  visible,
  storeUrl,
  onDismiss,
  appLink = null,
  openStatus = 'idle',
  onOpenApp,
}) => {
  const { sharedProperty } = useLabels();
  const copy = sharedProperty.sheet;
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getInstallSheetStyles(colors[colorScheme]), [colorScheme]);
  const { height } = useWindowDimensions();
  const [translateY] = useState(() => new Animated.Value(height));

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(height);
    Animated.timing(translateY, { toValue: 0, duration: INSTALL_SHEET_SLIDE_MS, useNativeDriver: false }).start();
  }, [visible, height, translateY]);

  if (!visible) return null;

  const available = storeUrl !== null;
  const canOpenApp = appLink !== null && onOpenApp !== undefined;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityRole="button" accessibilityLabel={copy.closeA11y} />
      <Animated.View
        testID="install-sheet"
        style={[styles.sheet, { transform: [{ translateY }] }]}
        accessibilityViewIsModal
      >
        <View style={styles.grabber} />
        <Image source={APP_ICON} style={styles.icon} accessibilityIgnoresInvertColors />
        <Text style={styles.title} accessibilityRole="header">
          {copy.title}
        </Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        {canOpenApp && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onOpenApp}
            accessibilityRole="button"
            accessibilityLabel={copy.openAppA11y}
          >
            <Text style={styles.primaryText}>{copy.openApp}</Text>
          </TouchableOpacity>
        )}

        {canOpenApp && openStatus === 'not_opened' && (
          <Text style={styles.openHint} accessibilityLiveRegion="polite">
            {copy.openFailed}
          </Text>
        )}

        <TouchableOpacity
          style={[
            canOpenApp ? styles.outlineButton : styles.primaryButton,
            !available && (canOpenApp ? styles.outlineButtonDisabled : styles.primaryButtonDisabled),
          ]}
          onPress={() => storeUrl && void Linking.openURL(storeUrl)}
          disabled={!available}
          accessibilityRole="button"
          accessibilityLabel={available ? copy.downloadA11y : copy.comingSoonA11y}
          accessibilityState={{ disabled: !available }}
        >
          <Text style={canOpenApp ? styles.outlineText : styles.primaryText}>
            {available ? copy.download : copy.comingSoon}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onDismiss} accessibilityRole="button">
          <Text style={styles.secondaryText}>{copy.continue}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};
