import React from 'react';
import {
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors, shapes, spacing, typography } from '../theme/colors';

export interface BurgerMenuItem {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
}

export interface BurgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectMenuItem?: (key: string) => void;
}

const MENU_ITEMS: BurgerMenuItem[] = [
  {
    key: 'search',
    title: 'Buscar Propiedades',
    icon: 'search-outline',
  },
  {
    key: 'new_chat',
    title: 'Reiniciar Chat',
    icon: 'refresh-outline',
  },
  {
    key: 'saved',
    title: 'Propiedades Guardadas',
    icon: 'bookmark-outline',
  },
  {
    key: 'settings',
    title: 'Ajustes y Accesibilidad',
    icon: 'settings-outline',
  },
  {
    key: 'help',
    title: 'Ayuda y Soporte',
    icon: 'help-circle-outline',
  },
];

export const BurgerMenu: React.FC<BurgerMenuProps> = ({
  visible,
  onClose,
  onSelectMenuItem,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const handleItemPress = (key: string) => {
    onClose();
    if (onSelectMenuItem) {
      onSelectMenuItem(key);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop Tap to Dismiss */}
        <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Cerrar menú">
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Drawer Panel Sliding in from Right */}
        <SafeAreaView
          style={[
            styles.drawerPanel,
            {
              backgroundColor: theme.background,
              borderLeftColor: theme.outlineVariant,
            },
          ]}
        >
          {/* Drawer Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Ionicons name="home" size={18} color="#FFFFFF" />
              </View>
              <Text style={[styles.brandTitle, { color: theme.primary }]}>
                Hubik
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: theme.surfaceContainerHigh },
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar menú lateral"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* User Profile Card for Don Carlos */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>DC</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                Don Carlos
              </Text>
              <Text
                style={[styles.profileRole, { color: theme.textSecondary }]}
              >
                Inversor & Búsqueda
              </Text>
            </View>
          </View>

          {/* Menu Items List */}
          <View style={styles.menuItemsContainer}>
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItemRow,
                  {
                    backgroundColor: theme.surfaceContainerLow,
                    borderColor: theme.outlineVariant,
                  },
                ]}
                onPress={() => handleItemPress(item.key)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={theme.secondary}
                    style={styles.itemIcon}
                  />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>
                    {item.title}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Drawer Footer */}
          <View style={styles.drawerFooter}>
            <Text
              style={[styles.versionText, { color: theme.textSecondary }]}
            >
              Hubik Real Estate AI • v1.0
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 36, 31, 0.45)', // Tinted forest backdrop
  },
  drawerPanel: {
    width: '82%',
    maxWidth: 340,
    height: '100%',
    borderLeftWidth: 1.5,
    paddingHorizontal: spacing.marginMobile, // 20px
    paddingVertical: 16,
    justifyContent: 'space-between',
    elevation: 16,
    shadowColor: '#02241F',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E5E1',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: shapes.default, // 8px
    backgroundColor: '#2C685A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandTitle: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: shapes.full, // 9999
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: shapes.lg, // 16px
    borderWidth: 1.5,
    marginVertical: 18,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: shapes.full,
    backgroundColor: '#163931',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.labelLG,
    fontSize: 17,
    fontWeight: '700',
  },
  profileRole: {
    fontSize: 13,
    marginTop: 2,
  },
  menuItemsContainer: {
    flex: 1,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: spacing.touchMin, // 52px
    borderRadius: shapes.md, // 12px
    borderWidth: 1,
    marginBottom: 10,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 12,
  },
  menuItemText: {
    ...typography.bodyLG,
    fontSize: 16,
    fontWeight: '500',
  },
  drawerFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E5E1',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
