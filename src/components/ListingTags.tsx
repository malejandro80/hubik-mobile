import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { pricePerSquareMeterLabel, publishedAgoLabel } from '../lib/listingTags';
import { colors } from '../theme';
import { getListingTagsStyles } from './ListingTags.styles';

export interface ListingTagsProps {
  price?: string;
  squareMeters?: string;
  currency?: string;
  operationType?: string;
  publishedAt?: string;
}

export const ListingTags: React.FC<ListingTagsProps> = ({ price, squareMeters, currency, operationType, publishedAt }) => {
  const labels = useLabels();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const styles = useMemo(() => getListingTagsStyles(theme), [theme]);

  const pricePerSquareMeter = pricePerSquareMeterLabel(price, squareMeters, currency, operationType, labels);
  const publishedAgo = publishedAgoLabel(publishedAt, new Date(), labels);
  if (!pricePerSquareMeter && !publishedAgo) return null;

  return (
    <View style={styles.row}>
      {pricePerSquareMeter && (
        <View style={styles.highlightTag}>
          <Ionicons name="pricetag-outline" size={14} color={theme.onSecondaryContainer} />
          <Text style={styles.highlightTagText}>{pricePerSquareMeter}</Text>
        </View>
      )}
      {publishedAgo && (
        <View style={styles.tag}>
          <Ionicons name="time-outline" size={14} color={theme.text} />
          <Text style={styles.tagText}>{publishedAgo}</Text>
        </View>
      )}
    </View>
  );
};
