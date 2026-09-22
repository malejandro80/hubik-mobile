import React from 'react';
import { Platform } from 'react-native';
import { SharedListingRedirect } from './SharedListingRedirect';
import { SharedPropertyPage } from './SharedPropertyPage';

export interface SharedListingRouteProps {
  value?: string;
}

export function SharedListingRoute({ value }: SharedListingRouteProps) {
  return Platform.OS === 'web' ? <SharedPropertyPage value={value} /> : <SharedListingRedirect value={value} />;
}
