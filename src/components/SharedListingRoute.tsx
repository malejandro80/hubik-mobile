import React from 'react';
import { Platform } from 'react-native';
import { SharedListingRedirect } from './SharedListingRedirect';
import { SharedPropertyPage } from './SharedPropertyPage';

export interface SharedListingRouteProps {
  value?: string;
  opaque?: boolean;
}

export function SharedListingRoute({ value, opaque = false }: SharedListingRouteProps) {
  return Platform.OS === 'web' ? (
    <SharedPropertyPage value={value} opaque={opaque} />
  ) : (
    <SharedListingRedirect value={value} opaque={opaque} />
  );
}
