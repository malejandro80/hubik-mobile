import React from 'react';
import { render } from '@testing-library/react-native';
import { PropertyAgentCard } from '../PropertyAgentCard';

describe('PropertyAgentCard', () => {
  it('renders agency and agent attribution with initial avatar', () => {
    const { getByText, getByTestId } = render(
      <PropertyAgentCard agencyName="Casa Norte" agentName="Ana" />
    );

    expect(getByTestId('listing-attribution')).toBeTruthy();
    expect(getByText('Casa Norte · Ana')).toBeTruthy();
    expect(getByText('C')).toBeTruthy();
  });

  it('renders with agency only when agent is not provided', () => {
    const { getByText, getByTestId } = render(
      <PropertyAgentCard agencyName="Inmobiliaria Madrid" />
    );

    expect(getByTestId('listing-attribution')).toBeTruthy();
    expect(getByText('Inmobiliaria Madrid')).toBeTruthy();
    expect(getByText('I')).toBeTruthy();
  });

  it('renders nothing when agencyName and agentName are absent', () => {
    const { queryByTestId } = render(<PropertyAgentCard />);

    expect(queryByTestId('listing-attribution')).toBeNull();
  });
});
