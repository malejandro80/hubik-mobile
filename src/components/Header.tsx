import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors, shapes, spacing } from '../theme/colors';

export interface HeaderProps {
  title?: string;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Hubik',
  onBackPress,
  onMenuPress,
  showBack,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const shouldShowBack =
    showBack !== undefined ? showBack : Boolean(onBackPress);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.outlineVariant,
        },
      ]}
    >
      {/* Left Action Button (Back) */}
      {shouldShowBack && (
        <TouchableOpacity
          style={[
            styles.circleButton,
            { backgroundColor: theme.surfaceContainerHigh },
          ]}
          onPress={onBackPress}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
      )}

      {/* Center Brand Identity (Badge + Name) */}
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Ionicons name="home" size={20} color="#FFFFFF" />
        </View>
        <Text style={[styles.brandTitle, { color: theme.primary }]}>
          {title}
        </Text>
        {/* Hidden screen-reader context */}
        <Text style={styles.srOnly}>Hubik Real Estate AI</Text>
      </View>

      {/* Right Action Button (Menu) */}
      <TouchableOpacity
        style={[
          styles.circleButton,
          { backgroundColor: theme.surfaceContainerHigh },
        ]}
        onPress={onMenuPress}
        accessibilityRole="button"
        accessibilityLabel="Menú de opciones"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="menu" size={24} color={theme.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile, // 20px
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  circleButton: {
    width: 48,
    height: 48,
    borderRadius: shapes.full, // 9999
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: shapes.md, // 12px
    backgroundColor: '#2C685A', // Sage forest green matching mockup
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
