import React from 'react';
import { render } from '@testing-library/react-native';
import { ChatMessageItem } from '../ChatMessageItem';
import { ChatMessage, Property } from '../../types/property';

describe('ChatMessageItem Component', () => {
  it('renders user message bubble correctly', () => {
    const userMessage: ChatMessage = {
      id: 'msg-1',
      sender: 'user',
      text: 'Looking for 2-bed in Austin',
      timestamp: 'Just now',
    };

    const { getByText, queryByText } = render(
      <ChatMessageItem message={userMessage} />
    );

    expect(getByText('Looking for 2-bed in Austin')).toBeTruthy();
    expect(queryByText('🤖 Asistente Hubik')).toBeNull();
  });

  it('renders assistant message with badge and properties', () => {
    const mockProperty: Property = {
      id: 'p-1',
      title: 'Sunny Austin Condo',
      property_type: 'Condo',
      price: 320000,
      bedrooms: 2,
      bathrooms: 1,
      square_meters: 84,
      city: 'Austin',
      address: '500 4th St',
      status: 'Available',
      image_url: 'https://example.com/condo.jpg',
      images: [],
    };

    const assistantMessage: ChatMessage = {
      id: 'msg-2',
      sender: 'assistant',
      text: 'Here are matching properties:',
      properties: [mockProperty],
      timestamp: 'Just now',
    };

    const { getByText } = render(
      <ChatMessageItem message={assistantMessage} />
    );

    expect(getByText('🤖 Asistente Hubik')).toBeTruthy();
    expect(getByText('Here are matching properties:')).toBeTruthy();
    expect(getByText('Propiedades Encontradas (1):')).toBeTruthy();
    expect(getByText('Sunny Austin Condo')).toBeTruthy();
  });

  it('renders editorial assistant message with title, highlighted text, and timestamp', () => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome-1',
      sender: 'assistant',
      title: 'Buenos días, Don Carlos.',
      text: '¿En qué puedo ayudarle hoy con sus propiedades o búsqueda de vivienda?\n\nPuede pulsar el **botón verde del micrófono** para hablar con tranquilidad, o escribir si lo prefiere.',
      timestamp: '10:30',
    };

    const { getByText, queryByText } = render(
      <ChatMessageItem message={welcomeMessage} />
    );

    expect(getByText('Buenos días, Don Carlos.')).toBeTruthy();
    expect(
      getByText(/¿En qué puedo ayudarle hoy con sus propiedades/)
    ).toBeTruthy();
    expect(getByText('botón verde del micrófono')).toBeTruthy();
    expect(getByText('10:30')).toBeTruthy();
    expect(queryByText('🤖 Asistente Hubik')).toBeNull();
  });
});
