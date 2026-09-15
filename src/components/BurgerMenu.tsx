import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
  { key: 'search', title: 'Buscar Propiedades', icon: 'search-outline' },
  { key: 'register', title: 'Registrar Vivienda', icon: 'add-circle-outline', badge: 'Nuevo' },
  { key: 'new_chat', title: 'Reiniciar Chat', icon: 'refresh-outline' },
  { key: 'saved', title: 'Propiedades Guardadas', icon: 'bookmark-outline' },
  { key: 'settings', title: 'Ajustes y Accesibilidad', icon: 'settings-outline' },
  { key: 'help', title: 'Ayuda y Soporte', icon: 'help-circle-outline' },
];

const DRAWER_WIDTH = 340;

export const BurgerMenu: React.FC<BurgerMenuProps> = ({
  visible,
  onClose,
  onSelectMenuItem,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);
  const isTest = process.env.NODE_ENV === 'test';

  const animateClose = useCallback((callback?: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (isTest) {
      setModalVisible(false);
      isClosingRef.current = false;
      callback?.();
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 220,
        easing: Easing.bezier(0.4, 0, 1, 1),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      isClosingRef.current = false;
      callback?.();
    });
  }, [fadeAnim, isTest, slideAnim]);

  const handleClose = useCallback(() => {
    animateClose(onClose);
  }, [animateClose, onClose]);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setModalVisible(true);
      if (isTest) {
        slideAnim.setValue(0);
        fadeAnim.setValue(1);
        return;
      }
      slideAnim.setValue(DRAWER_WIDTH);
      fadeAnim.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalVisible && !isClosingRef.current) {
      handleClose();
    }
  }, [visible, modalVisible, handleClose, fadeAnim, slideAnim, isTest]);

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
        <TouchableWithoutFeedback onPress={handleClose} accessibilityLabel="Cerrar menú">
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawerWrapper, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={[styles.drawerPanel, { backgroundColor: theme.background, borderLeftColor: theme.outlineVariant }]}>
            {/* Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.brandRow}>
                <View style={styles.logoBadge}><Ionicons name="home" size={18} color="#FFFFFF" /></View>
                <Text style={[styles.brandTitle, { color: theme.primary }]}>Hubik</Text>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.surfaceContainerHigh }]}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar menú lateral"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* User Profile */}
            <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.avatarCircle}><Text style={styles.avatarText}>DC</Text></View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>Don Carlos</Text>
                <Text style={[styles.profileRole, { color: theme.textSecondary }]}>Inversor & Búsqueda</Text>
              </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItemsContainer}>
              {MENU_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.menuItemRow, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}
                  onPress={() => handleItemPress(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name={item.icon} size={22} color={theme.secondary} style={styles.itemIcon} />
                    <Text style={[styles.menuItemText, { color: theme.text }]}>{item.title}</Text>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.badge && (
                      <View style={styles.badge}><Text style={styles.badgeText}>{item.badge}</Text></View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer */}
            <View style={styles.drawerFooter}>
              <Text style={[styles.versionText, { color: theme.textSecondary }]}>Hubik Real Estate AI • v1.0</Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 36, 31, 0.45)' },
  drawerWrapper: { width: '82%', maxWidth: DRAWER_WIDTH, height: '100%' },
  drawerPanel: {
    flex: 1,
    borderLeftWidth: 1.5,
    paddingHorizontal: spacing.marginMobile,
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
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: shapes.default,
    backgroundColor: '#2C685A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandTitle: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: { width: 44, height: 44, borderRadius: shapes.full, alignItems: 'center', justifyContent: 'center' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: shapes.lg,
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
  avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  profileInfo: { flex: 1 },
  profileName: { ...typography.labelLG, fontSize: 17, fontWeight: '700' },
  profileRole: { fontSize: 13, marginTop: 2 },
  menuItemsContainer: { flex: 1 },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: spacing.touchMin,
    borderRadius: shapes.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { marginRight: 12 },
  menuItemText: { ...typography.bodyLG, fontSize: 16, fontWeight: '500' },
  badge: { backgroundColor: '#D2F3EA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: shapes.full, marginRight: 8 },
  badgeText: { color: '#163931', fontSize: 11, fontWeight: '700' },
  drawerFooter: { paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E5E1', alignItems: 'center' },
  versionText: { fontSize: 12, fontWeight: '500' },
});
