import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '../hooks/useColorScheme';
import { useSharedListing } from '../hooks/useSharedProperty';
import { buildPropertyRouteParams } from '../lib/chatRegistration';
import { buildOpaqueRouteParams } from '../lib/opaqueRouteParams';
import { colors } from '../theme';

export interface SharedListingRedirectProps {
  value?: string;
  opaque?: boolean;
}

export function SharedListingRedirect({ value, opaque = false }: SharedListingRedirectProps) {
  const router = useRouter();
  const { status, property } = useSharedListing(value, opaque);
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const styles = useMemo(
    () => StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background } }),
    [theme]
  );

  useEffect(() => {
    if (status === 'ready' && property) {
      router.replace({
        pathname: '/property/[id]',
        params: opaque ? buildOpaqueRouteParams(property) : buildPropertyRouteParams(property),
      });
    } else if (status === 'not_found' || status === 'error') {
      router.replace('/');
    }
  }, [status, property, router, opaque]);

  return (
    <View style={styles.container} testID="shared-listing-loading">
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}
