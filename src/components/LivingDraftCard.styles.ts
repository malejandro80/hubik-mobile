import { StyleSheet } from 'react-native';
import { shapes, spacing } from '../theme/colors';

export const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: shapes.lg,
    borderWidth: 1.5,
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  knownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  knownIcon: {
    marginRight: 8,
  },
  knownLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  knownValue: {
    fontSize: 14,
    flexShrink: 1,
  },
  missingSection: {
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spaceXS,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: shapes.full,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spaceXS,
    marginTop: 8,
    width: '100%',
  },
  pickerChip: {
    borderWidth: 1.5,
    borderRadius: shapes.full,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
