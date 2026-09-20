import React, { useMemo } from 'react';
import {
  Animated,
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors, hitSlop } from '../theme/colors';
import { useDrawerAnimation } from '../hooks/useDrawerAnimation';

import { MENU_ITEMS, type BurgerMenuItem, type BurgerMenuItemKey } from './BurgerMenu.items';
import { DRAWER_WIDTH, getBurgerMenuStyles } from './BurgerMenu.styles';

export type { BurgerMenuItem, BurgerMenuItemKey };
export { MENU_ITEMS, DRAWER_WIDTH };

export interface BurgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectMenuItem?: (key: BurgerMenuItemKey | string) => void;
}

export const BurgerMenu: React.FC<BurgerMenuProps> = ({
  visible,
  onClose,
  onSelectMenuItem,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const styles = useMemo(() => getBurgerMenuStyles(theme), [theme]);

  const { modalVisible, slideAnim, fadeAnim, animateClose, handleClose } =
    useDrawerAnimation({
      visible,
      onClose,
      drawerWidth: DRAWER_WIDTH,
    });

  const handleItemPress = (key: string) => {
    animateClose(() => {
      onClose();
      onSelectMenuItem?.(key);
    });
  };

  if (!modalVisible && !visible) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={handleClose} accessibilityLabel={labels.burgerMenu.backdropA11y}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawerWrapper, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={styles.drawerPanel}>
            <View style={styles.drawerHeader}>
              <View style={styles.brandRow}>
                <View style={styles.logoBadge}>
                  <Ionicons name="home" size={18} color={theme.onSecondary} />
                </View>
                <Text style={styles.brandTitle}>{labels.burgerMenu.brandTitle}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel={labels.burgerMenu.closeA11y}
                hitSlop={hitSlop.default}
              >
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{labels.burgerMenu.avatarInitials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{labels.burgerMenu.profileName}</Text>
                <Text style={styles.profileRole}>{labels.burgerMenu.profileRole}</Text>
              </View>
            </View>

            <View style={styles.menuItemsContainer}>
              {MENU_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.menuItemRow}
                  onPress={() => handleItemPress(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name={item.icon} size={22} color={theme.secondary} style={styles.itemIcon} />
                    <Text style={styles.menuItemText}>{item.title}</Text>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.drawerFooter}>
              <Text style={styles.versionText}>{labels.burgerMenu.version}</Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

