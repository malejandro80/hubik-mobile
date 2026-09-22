import React from 'react';
import { Dimensions, Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhotoGallery } from '../PhotoGallery';

const IMAGES = ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg', 'https://cdn.example.com/3.jpg'];

const renderGallery = (overrides: Partial<React.ComponentProps<typeof PhotoGallery>> = {}) => {
  const onClose = jest.fn();
  const utils = render(<PhotoGallery visible images={IMAGES} onClose={onClose} {...overrides} />);
  return { onClose, ...utils };
};

const swipeTo = (utils: ReturnType<typeof render>, page: number) =>
  fireEvent(utils.getByTestId('photo-gallery-pager'), 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { x: Dimensions.get('window').width * page, y: 0 } },
  });

describe('PhotoGallery', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders nothing while closed', () => {
    const { queryByText, queryByTestId } = renderGallery({ visible: false });

    expect(queryByText('1 de 3')).toBeNull();
    expect(queryByTestId('photo-gallery-pager')).toBeNull();
  });

  it('opens on the first photo with a counter', () => {
    const { getByText, getByTestId } = renderGallery();

    expect(getByText('1 de 3')).toBeTruthy();
    expect(getByTestId('photo-gallery-image-0').props.source).toEqual({ uri: IMAGES[0] });
  });

  it('opens on the requested photo', () => {
    const { getByText } = renderGallery({ initialIndex: 2 });

    expect(getByText('3 de 3')).toBeTruthy();
  });

  it('starts again from the requested photo every time it opens', () => {
    const utils = renderGallery({ initialIndex: 0 });
    swipeTo(utils, 2);
    expect(utils.getByText('3 de 3')).toBeTruthy();

    utils.rerender(<PhotoGallery visible={false} images={IMAGES} onClose={jest.fn()} />);
    utils.rerender(<PhotoGallery visible images={IMAGES} onClose={jest.fn()} />);

    expect(utils.getByText('1 de 3')).toBeTruthy();
  });

  it('labels every photo for screen readers', () => {
    const { getByLabelText } = renderGallery();

    expect(getByLabelText('Foto 1 de 3')).toBeTruthy();
    expect(getByLabelText('Foto 2 de 3')).toBeTruthy();
    expect(getByLabelText('Foto 3 de 3')).toBeTruthy();
  });

  it('updates the counter when the visitor swipes to another photo', () => {
    const utils = renderGallery();

    swipeTo(utils, 1);
    expect(utils.getByText('2 de 3')).toBeTruthy();

    swipeTo(utils, 2);
    expect(utils.getByText('3 de 3')).toBeTruthy();
  });

  it('shows a thumbnail per photo, highlights the current one and jumps when one is tapped', () => {
    const { getByLabelText, getByText } = renderGallery();
    expect(getByLabelText('Ir a la foto 1 de 3').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('Ir a la foto 3 de 3').props.accessibilityState.selected).toBe(false);

    fireEvent.press(getByLabelText('Ir a la foto 3 de 3'));

    expect(getByText('3 de 3')).toBeTruthy();
    expect(getByLabelText('Ir a la foto 3 de 3').props.accessibilityState.selected).toBe(true);
  });

  it('brings its own safe area, so the close button is never drawn under the status bar or notch', () => {
    const { UNSAFE_getByType } = renderGallery();

    const provider = UNSAFE_getByType(SafeAreaProvider);

    expect(provider.props.initialMetrics).toEqual(
      expect.objectContaining({ insets: expect.objectContaining({ top: expect.any(Number) }) })
    );
  });

  it('closes from the close button', () => {
    const { onClose, getByLabelText } = renderGallery();

    fireEvent.press(getByLabelText('Cerrar las fotos'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a single photo without a counter, strip or arrows', () => {
    const { queryByText, queryByLabelText, getByTestId } = renderGallery({ images: [IMAGES[0]] });

    expect(getByTestId('photo-gallery-image-0')).toBeTruthy();
    expect(queryByText('1 de 1')).toBeNull();
    expect(queryByLabelText('Ir a la foto 1 de 1')).toBeNull();
    expect(queryByLabelText('Foto siguiente')).toBeNull();
  });

  it('has no arrow buttons on phones', () => {
    const { queryByLabelText } = renderGallery();

    expect(queryByLabelText('Foto anterior')).toBeNull();
    expect(queryByLabelText('Foto siguiente')).toBeNull();
  });

  describe('on the web', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'web');
    });

    it('moves with the previous and next buttons and disables them at the ends', () => {
      const { getByLabelText, getByText } = renderGallery();
      expect(getByLabelText('Foto anterior').props.accessibilityState.disabled).toBe(true);

      fireEvent.press(getByLabelText('Foto siguiente'));
      expect(getByText('2 de 3')).toBeTruthy();
      expect(getByLabelText('Foto anterior').props.accessibilityState.disabled).toBe(false);

      fireEvent.press(getByLabelText('Foto siguiente'));
      expect(getByText('3 de 3')).toBeTruthy();
      expect(getByLabelText('Foto siguiente').props.accessibilityState.disabled).toBe(true);

      fireEvent.press(getByLabelText('Foto anterior'));
      expect(getByText('2 de 3')).toBeTruthy();
    });

    it('never goes past the first or last photo', () => {
      const { getByLabelText, getByText } = renderGallery();

      fireEvent.press(getByLabelText('Foto anterior'));

      expect(getByText('1 de 3')).toBeTruthy();
    });
  });
});
