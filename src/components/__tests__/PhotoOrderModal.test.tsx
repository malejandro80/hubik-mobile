import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { PhotoOrderModal } from '../PhotoOrderModal';

let mockListProps: { onReorder: (event: { from: number; to: number }) => void } | undefined;

jest.mock('react-native-reorderable-list', () => {
  const { FlatList } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: any) => {
      mockListProps = props;
      return ReactActual.createElement(FlatList, {
        data: props.data,
        keyExtractor: props.keyExtractor,
        renderItem: props.renderItem,
      });
    },
    useReorderableDrag: () => jest.fn(),
  };
});

const PHOTOS = ['file://a.jpg', 'file://b.jpg', 'file://c.jpg'];

const renderModal = (photos = PHOTOS) => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  const utils = render(<PhotoOrderModal visible photos={photos} onConfirm={onConfirm} onClose={onClose} />);
  return { onConfirm, onClose, ...utils };
};

describe('PhotoOrderModal', () => {
  it('explains how to reorder and marks the first photo as the cover', () => {
    const { getByText, getAllByText } = renderModal();

    expect(getByText('Ordenar fotos')).toBeTruthy();
    expect(getByText(/Mantenga pulsada una foto y arrástrela/)).toBeTruthy();
    expect(getAllByText('Portada')).toHaveLength(1);
    expect(getByText('Foto 2')).toBeTruthy();
    expect(getByText('Foto 3')).toBeTruthy();
  });

  it('shows every photo as a large thumbnail', () => {
    const { getByTestId } = renderModal();

    expect(getByTestId('photo-order-thumb-0').props.source).toEqual({ uri: 'file://a.jpg' });
    expect(getByTestId('photo-order-thumb-2').props.source).toEqual({ uri: 'file://c.jpg' });
  });

  it('moves a photo down with its button and returns the new order on Listo', () => {
    const { getByLabelText, getAllByText, getByTestId, onConfirm } = renderModal();

    fireEvent.press(getByLabelText('Mover foto 1 hacia abajo'));

    expect(getByTestId('photo-order-thumb-0').props.source).toEqual({ uri: 'file://b.jpg' });
    expect(getAllByText('Portada')).toHaveLength(1);
    fireEvent.press(getByLabelText('Listo'));
    expect(onConfirm).toHaveBeenCalledWith(['file://b.jpg', 'file://a.jpg', 'file://c.jpg']);
  });

  it('moves a photo up with its button, and cannot move the ends past the list', () => {
    const { getByLabelText, onConfirm } = renderModal();

    expect(getByLabelText('Mover foto 1 hacia arriba').props.accessibilityState.disabled).toBe(true);
    expect(getByLabelText('Mover foto 3 hacia abajo').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(getByLabelText('Mover foto 3 hacia arriba'));
    fireEvent.press(getByLabelText('Listo'));

    expect(onConfirm).toHaveBeenCalledWith(['file://a.jpg', 'file://c.jpg', 'file://b.jpg']);
  });

  it('applies a drag and drop reorder', () => {
    const { getByLabelText, onConfirm } = renderModal();

    act(() => mockListProps?.onReorder({ from: 2, to: 0 }));
    fireEvent.press(getByLabelText('Listo'));

    expect(onConfirm).toHaveBeenCalledWith(['file://c.jpg', 'file://a.jpg', 'file://b.jpg']);
  });

  it('discards the changes on Cancelar', () => {
    const { getByLabelText, onConfirm, onClose } = renderModal();
    fireEvent.press(getByLabelText('Mover foto 1 hacia abajo'));

    fireEvent.press(getByLabelText('Cancelar'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('starts again from the current photos each time it opens', () => {
    const { getByLabelText, rerender, getByTestId, onConfirm, onClose } = renderModal();
    fireEvent.press(getByLabelText('Mover foto 1 hacia abajo'));

    rerender(<PhotoOrderModal visible={false} photos={PHOTOS} onConfirm={onConfirm} onClose={onClose} />);
    rerender(<PhotoOrderModal visible photos={PHOTOS} onConfirm={onConfirm} onClose={onClose} />);

    expect(getByTestId('photo-order-thumb-0').props.source).toEqual({ uri: 'file://a.jpg' });
  });

  it('shows nothing while closed', () => {
    const { queryByText } = render(
      <PhotoOrderModal visible={false} photos={PHOTOS} onConfirm={jest.fn()} onClose={jest.fn()} />
    );

    expect(queryByText('Ordenar fotos')).toBeNull();
  });
});
