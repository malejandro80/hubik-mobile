import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, ListRenderItem, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { AgentsSection } from '../components/AgentsSection';
import { BurgerMenu } from '../components/BurgerMenu';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { PropertyCard } from '../components/PropertyCard';
import { ScreenChatBar } from '../components/ScreenChatBar';
import { useAgencyAgents } from '../hooks/useAgencyAgents';
import { useAgencyChat } from '../hooks/useAgencyChat';
import { useAppMenu } from '../hooks/useAppMenu';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { buildPropertyRouteParams } from '../lib/chatRegistration';
import { fetchAgencyListings } from '../services/authApi';
import { colors } from '../theme';
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
  const menu = useAppMenu();
  const styles = useMemo(() => getAgencyStyles(theme), [theme]);
  const [state, setState] = useState<ListingsState>({ phase: 'loading' });
  const agencyId = profile?.agencyId ?? null;
  const canView = capabilities.canViewAgencyListings;
  const agents = useAgencyAgents(agencyId);
  const chat = useAgencyChat(agents);

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

  const renderStatus = () => {
    if (isLoading) {
      return (
        <View style={styles.statusBlock}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      );
    }
    if (state.phase === 'error') {
      return (
        <View style={styles.statusBlock}>
          <Text style={styles.message}>{labels.auth.myAgencyLoadError}</Text>
          <Button testID="agency-retry" title={labels.auth.retry} onPress={handleRetry} />
        </View>
      );
    }
    return (
      <View style={styles.statusBlock}>
        <Text style={styles.message}>{labels.auth.myAgencyEmpty}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={labels.auth.myAgencyTitle} showBack onBackPress={router.back} onMenuPress={menu.open} />
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <FlatList
          data={state.phase === 'ready' ? state.listings : []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={agencyId ? <AgentsSection agents={agents} /> : null}
          ListEmptyComponent={renderStatus}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
        <ScreenChatBar chat={chat} onOpenConversation={() => router.push('/')} />
      </KeyboardAvoidingView>
      <BurgerMenu {...menu.menuProps} />
    </SafeAreaView>
  );
}
