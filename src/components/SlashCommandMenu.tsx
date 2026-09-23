import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { SlashMenuState } from '../lib/slashCommands';
import { colors } from '../theme';
import { getSlashCommandMenuStyles } from './SlashCommandMenu.styles';

export interface SlashCommandMenuProps {
  state: SlashMenuState;
  onSelect: (command: string) => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({ state, onSelect }) => {
  const { slashMenu } = useLabels();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getSlashCommandMenuStyles(colors[colorScheme]), [colorScheme]);

  if (state.kind === 'hidden') return null;

  if (state.kind === 'note') {
    return (
      <View style={styles.container}>
        <Text style={styles.note}>{slashMenu.noCommandsNote}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {state.commands.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.row}
          onPress={() => onSelect(item.command)}
          accessibilityRole="button"
          accessibilityLabel={slashMenu.commandA11y(item.command, slashMenu.hints[item.key])}
        >
          <Text style={styles.command}>{item.command}</Text>
          <Text style={styles.hint}>{slashMenu.hints[item.key]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
