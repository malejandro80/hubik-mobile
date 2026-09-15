import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { useColorScheme } from '../src/hooks/useColorScheme';
import { colors } from '../src/theme/colors';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const [count, setCount] = useState(0);

  const handlePress = () => {
    setCount((prev) => prev + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Welcome to Hubik Mobile
      </Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>
        React Native + Expo Template
      </Text>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.countText, { color: theme.text }]}>
          Counter: {count}
        </Text>
        <Button
          title="Increment Counter"
          onPress={handlePress}
          variant="primary"
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  countText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  button: {
    width: '100%',
  },
});
