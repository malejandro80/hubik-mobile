import React, { useMemo, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { getInitials } from '../lib/userDisplay';
import { updateMyWhatsApp } from '../services/authApi';
import { colors } from '../theme';
import { AVATAR_SIZE, getDrawerProfileCardStyles } from './DrawerProfileCard.styles';
import { WhatsAppField } from './WhatsAppField';

export interface DrawerProfileCardProps {
  onSignInPress: () => void;
}

export const DrawerProfileCard: React.FC<DrawerProfileCardProps> = ({ onSignInPress }) => {
  const { status, profile, refreshProfile } = useAuth();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const styles = useMemo(() => getDrawerProfileCardStyles(theme), [theme]);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  if (status === 'loading') return null;

  if (status === 'signedOut' || !profile) {
    return (
      <TouchableOpacity
        testID="profile-card"
        style={styles.profileCard}
        onPress={onSignInPress}
        accessibilityRole="button"
        accessibilityLabel={labels.burgerMenu.guestA11y}
      >
        <View style={styles.avatarCircle}>
          <Ionicons name="home-outline" size={20} color={theme.onPrimary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{labels.burgerMenu.guestTitle}</Text>
          <Text style={styles.guestCta}>{labels.burgerMenu.guestCta}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const name = profile.displayName?.trim() || labels.burgerMenu.unnamedUser;
  const roleLabel = labels.burgerMenu.roleLabels[profile.role];
  const avatarUrl = profile.avatarUrl ?? null;
  const showPhoto = avatarUrl !== null && failedAvatarUrl !== avatarUrl;
  const initials = getInitials(profile.displayName);

  const saveWhatsApp = async (phone: string | null) => {
    await updateMyWhatsApp(profile.userId, phone);
    await refreshProfile();
  };

  return (
    <>
      <View
        testID="profile-card"
        style={styles.profileCard}
        accessible
        accessibilityLabel={labels.burgerMenu.profileA11y(name, roleLabel)}
      >
        <View style={styles.avatarCircle}>
          {showPhoto ? (
            <Image
              testID="profile-avatar-image"
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              onError={() => setFailedAvatarUrl(avatarUrl)}
              accessibilityIgnoresInvertColors
            />
          ) : initials ? (
            <Text style={styles.avatarText}>{initials}</Text>
          ) : (
            <Ionicons name="person" size={AVATAR_SIZE / 2} color={theme.onPrimary} />
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileRole}>{roleLabel}</Text>
        </View>
      </View>
      {profile.role === 'agent' && (
        <WhatsAppField title={labels.whatsapp.profileTitle} value={profile.whatsapp} onSave={saveWhatsApp} />
      )}
    </>
  );
};
