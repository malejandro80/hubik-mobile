import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { animations } from '../lib/animations';

export interface UseDrawerAnimationOptions {
  visible: boolean;
  onClose?: () => void;
  drawerWidth?: number;
  isTest?: boolean;
}

export interface UseDrawerAnimationReturn {
  modalVisible: boolean;
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
  animateClose: (callback?: () => void) => void;
  handleClose: () => void;
}

export const useDrawerAnimation = ({
  visible,
  onClose,
  drawerWidth = 340,
  isTest = process.env.NODE_ENV === 'test',
}: UseDrawerAnimationOptions): UseDrawerAnimationReturn => {
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useMemo(() => new Animated.Value(drawerWidth), [drawerWidth]);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const isClosingRef = useRef(false);

  const animateClose = useCallback(
    (callback?: () => void) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      animations.drawer.close({
        fadeAnim,
        slideAnim,
        drawerWidth,
        isTest,
        onComplete: () => {
          setModalVisible(false);
          isClosingRef.current = false;
          callback?.();
        },
      });
    },
    [fadeAnim, slideAnim, drawerWidth, isTest]
  );

  const handleClose = useCallback(() => {
    animateClose(onClose);
  }, [animateClose, onClose]);

  const prevVisibleRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setModalVisible(true);
      animations.drawer.open({
        fadeAnim,
        slideAnim,
        isTest,
      });
    } else if (prevVisibleRef.current === true && !isClosingRef.current) {
      handleClose();
    }
    prevVisibleRef.current = visible;
  }, [visible, handleClose, fadeAnim, slideAnim, isTest]);

  return {
    modalVisible,
    slideAnim,
    fadeAnim,
    animateClose,
    handleClose,
  };
};

export default useDrawerAnimation;
