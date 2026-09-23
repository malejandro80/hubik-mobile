import React, { useMemo } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors, hitSlop } from '../theme';
import { getHeaderStyles } from './Header.styles';

export interface HeaderProps {
  title?: string;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onBackPress,
  onMenuPress,
  showBack,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const displayTitle = title ?? labels.common.hubik;

  const { styles, iconColor, homeIconColor } = useMemo(
    () => getHeaderStyles(theme),
    [theme]
  );

  const shouldShowBack =
    showBack !== undefined ? showBack : Boolean(onBackPress);

  return (
    <View style={styles.container}>
      {shouldShowBack && (
        <TouchableOpacity
          style={styles.circleButton}
          onPress={onBackPress}
          accessibilityRole="button"
          accessibilityLabel={labels.common.back}
          hitSlop={hitSlop.default}
        >
          <Ionicons name="chevron-back" size={22} color={iconColor} />
        </TouchableOpacity>
      )}

      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Ionicons name="home" size={20} color={homeIconColor} />
        </View>
        <Text style={styles.brandTitle}>
          {displayTitle}
        </Text>
        <Text style={styles.srOnly}>{labels.common.tagline}</Text>
      </View>

      <TouchableOpacity
        style={styles.circleButton}
        onPress={onMenuPress}
        accessibilityRole="button"
        accessibilityLabel={labels.common.menu}
        hitSlop={hitSlop.default}
      >
        <Ionicons name="menu" size={24} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
};
