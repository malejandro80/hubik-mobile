import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { START_ACTION_ICONS } from '../constants/startScreen';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { StartActionKey } from '../lib/startActions';
import { colors } from '../theme/colors';
import { getStartScreenStyles } from './StartScreen.styles';

export interface StartScreenProps {
  name: string | null;
  actions: StartActionKey[];
  examples: string[];
  onAction: (key: StartActionKey) => void;
  onExample: (text: string) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ name, actions, examples, onAction, onExample }) => {
  const { startScreen } = useLabels();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const styles = useMemo(() => getStartScreenStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.greeting} accessibilityRole="header">
        {name ? startScreen.greeting(name) : startScreen.greetingAnonymous}
      </Text>
      <Text style={styles.subtitle}>{startScreen.subtitle}</Text>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{startScreen.actionsTitle}</Text>
        {actions.map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.card}
            onPress={() => onAction(key)}
            accessibilityRole="button"
            accessibilityLabel={startScreen.actionA11y(startScreen.actions[key].title, startScreen.actions[key].subtitle)}
          >
            <View style={styles.cardIcon}>
              <Ionicons name={START_ACTION_ICONS[key]} size={24} color={theme.onSecondaryContainer} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{startScreen.actions[key].title}</Text>
              <Text style={styles.cardSubtitle}>{startScreen.actions[key].subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{startScreen.examplesTitle}</Text>
        {examples.map((text) => (
          <TouchableOpacity
            key={text}
            style={styles.example}
            onPress={() => onExample(text)}
            accessibilityRole="button"
            accessibilityLabel={startScreen.exampleA11y(text)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.secondary} />
            <Text style={styles.exampleText}>{text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.micHint}>{startScreen.micHint}</Text>
    </View>
  );
};
