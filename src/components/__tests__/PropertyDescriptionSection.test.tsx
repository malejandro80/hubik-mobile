import React from 'react';
import { render } from '@testing-library/react-native';
import { PropertyDescriptionSection } from '../PropertyDescriptionSection';

describe('PropertyDescriptionSection', () => {
  it('renders real draft description when isRealDraft is true', () => {
    const { getByText } = render(
      <PropertyDescriptionSection
        isRealDraft={true}
        draftDescription="Mi propia descripción"
        legacyDescription={null}
        loading={false}
        hasError={false}
      />
    );

    expect(getByText('Descripción de la vivienda')).toBeTruthy();
    expect(getByText('Mi propia descripción')).toBeTruthy();
  });

  it('renders legacy description when ready', () => {
    const { getByText } = render(
      <PropertyDescriptionSection
        isRealDraft={false}
        draftDescription={undefined}
        legacyDescription="Descripción generada por IA"
        loading={false}
        hasError={false}
      />
    );

    expect(getByText('Descripción de la vivienda')).toBeTruthy();
    expect(getByText('Descripción generada por IA')).toBeTruthy();
  });

  it('renders error notice when hasError is true', () => {
    const { getByText } = render(
      <PropertyDescriptionSection
        isRealDraft={false}
        draftDescription={undefined}
        legacyDescription={null}
        loading={false}
        hasError={true}
      />
    );

    expect(
      getByText('No se pudo generar la descripción en este momento.')
    ).toBeTruthy();
  });
});
