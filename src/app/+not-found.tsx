import React, { useMemo } from 'react';
import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors } from '../theme';
import { getNotFoundStyles } from './+not-found.styles';

export default function NotFoundScreen() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const styles = useMemo(() => getNotFoundStyles(theme), [theme]);

  return (
    <>
      <Stack.Screen options={{ title: labels.notFound.pageTitle }} />
      <View style={styles.container}>
        <Text style={styles.title}>
          {labels.notFound.message}
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{labels.notFound.homeLink}</Text>
        </Link>
      </View>
    </>
  );
}
