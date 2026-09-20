import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItem, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { PropertyCard } from '../components/PropertyCard';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { buildPropertyRouteParams } from '../lib/chatRegistration';
import { fetchAgencyListings } from '../services/authApi';
import { colors } from '../theme/colors';
import { Property } from '../types/property';
import { getAgencyStyles } from './agency.styles';

type ListingsState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; listings: Property[] };

const keyExtractor = (property: Property) => property.id;

export default function AgencyScreen() {
  const router = useRouter();
  const { status, profile, capabilities } = useAuth();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const styles = useMemo(() => getAgencyStyles(theme), [theme]);
  const [state, setState] = useState<ListingsState>({ phase: 'loading' });
  const agencyId = profile?.agencyId ?? null;
  const canView = capabilities.canViewAgencyListings;

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!canView || !agencyId) return;
    let active = true;

    fetchAgencyListings(agencyId)
      .then((listings) => {
        if (active) setState({ phase: 'ready', listings });
      })
      .catch(() => {
        if (active) setState({ phase: 'error' });
      });

    return () => {
      active = false;
    };
  }, [canView, agencyId, reloadKey]);

  const handleRetry = useCallback(() => {
    setState({ phase: 'loading' });
    setReloadKey((key) => key + 1);
  }, []);

  const handlePropertyPress = useCallback(
    (property: Property) =>
      router.push({ pathname: '/property/[id]', params: buildPropertyRouteParams(property) }),
    [router]
  );

  const renderItem: ListRenderItem<Property> = useCallback(
    ({ item }) => <PropertyCard property={item} onPress={handlePropertyPress} />,
    [handlePropertyPress]
  );

  if (status === 'signedIn' && !canView) return <Redirect href="/" />;
  if (status === 'signedOut') return <Redirect href="/" />;

  const isLoading = status === 'loading' || state.phase === 'loading';

  return (
    <SafeAreaView style={styles.container}>
      <Header title={labels.auth.myAgencyTitle} showBack onBackPress={router.back} />
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      )}
      {!isLoading && state.phase === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.message}>{labels.auth.myAgencyLoadError}</Text>
          <Button testID="agency-retry" title={labels.auth.retry} onPress={handleRetry} />
        </View>
      )}
      {!isLoading && state.phase === 'ready' && state.listings.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.message}>{labels.auth.myAgencyEmpty}</Text>
        </View>
      )}
      {!isLoading && state.phase === 'ready' && state.listings.length > 0 && (
        <FlatList
          data={state.listings}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}
