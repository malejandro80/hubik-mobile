import { Animated, Easing } from 'react-native';

export interface AnimationConfig {
  duration?: number;
  easing?: (value: number) => number;
  useNativeDriver?: boolean;
  delay?: number;
}

export interface SpringConfig {
  tension?: number;
  friction?: number;
  bounciness?: number;
  speed?: number;
  useNativeDriver?: boolean;
  delay?: number;
}

export interface DrawerAnimationOptions {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  drawerWidth?: number;
  isTest?: boolean;
  onComplete?: () => void;
}

export const animationDurations = {
  fast: 150,
  normal: 250,
  enter: 280,
  exit: 220,
  slow: 400,
} as const;

export const animationEasings = {
  linear: Easing.linear,
  easeInQuad: Easing.in(Easing.quad),
  easeOutQuad: Easing.out(Easing.quad),
  drawerEnter: Easing.bezier(0.16, 1, 0.3, 1),
  drawerExit: Easing.bezier(0.4, 0, 1, 1),
} as const;

export const timing = (
  value: Animated.Value,
  toValue: number,
  config?: AnimationConfig
): Animated.CompositeAnimation => {
  return Animated.timing(value, {
    toValue,
    duration: config?.duration ?? animationDurations.normal,
    easing: config?.easing,
    useNativeDriver: config?.useNativeDriver ?? true,
    delay: config?.delay,
  });
};

export const fade = (
  value: Animated.Value,
  toValue: number,
  config?: AnimationConfig
): Animated.CompositeAnimation => {
  return timing(value, toValue, config);
};

export const slide = (
  value: Animated.Value,
  toValue: number,
  config?: AnimationConfig
): Animated.CompositeAnimation => {
  return timing(value, toValue, config);
};

export const spring = (
  value: Animated.Value,
  toValue: number,
  config?: SpringConfig
): Animated.CompositeAnimation => {
  return Animated.spring(value, {
    toValue,
    tension: config?.tension,
    friction: config?.friction,
    bounciness: config?.bounciness,
    speed: config?.speed,
    useNativeDriver: config?.useNativeDriver ?? true,
    delay: config?.delay,
  });
};

export const parallel = (
  animationList: Animated.CompositeAnimation[],
  config?: { stopTogether?: boolean }
): Animated.CompositeAnimation => {
  return Animated.parallel(animationList, config);
};

export const sequence = (
  animationList: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.sequence(animationList);
};

export const run = (
  animation: Animated.CompositeAnimation
): Promise<Animated.EndResult> => {
  return new Promise((resolve) => {
    animation.start((result) => resolve(result));
  });
};

const drawer = {
  open: ({
    fadeAnim,
    slideAnim,
    isTest = process.env.NODE_ENV === 'test',
    onComplete,
  }: DrawerAnimationOptions): Animated.CompositeAnimation | null => {
    if (isTest) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      onComplete?.();
      return null;
    }

    const anim = parallel([
      fade(fadeAnim, 1, {
        duration: 260,
        easing: animationEasings.easeOutQuad,
      }),
      slide(slideAnim, 0, {
        duration: 280,
        easing: animationEasings.drawerEnter,
      }),
    ]);

    anim.start(() => onComplete?.());
    return anim;
  },

  close: ({
    fadeAnim,
    slideAnim,
    drawerWidth = 340,
    isTest = process.env.NODE_ENV === 'test',
    onComplete,
  }: DrawerAnimationOptions): Animated.CompositeAnimation | null => {
    if (isTest) {
      fadeAnim.setValue(0);
      slideAnim.setValue(drawerWidth);
      onComplete?.();
      return null;
    }

    const anim = parallel([
      fade(fadeAnim, 0, {
        duration: 200,
        easing: animationEasings.easeInQuad,
      }),
      slide(slideAnim, drawerWidth, {
        duration: 220,
        easing: animationEasings.drawerExit,
      }),
    ]);

    anim.start(() => onComplete?.());
    return anim;
  },
};

export const animations = {
  durations: animationDurations,
  easing: animationEasings,
  timing,
  fade,
  slide,
  spring,
  parallel,
  sequence,
  run,
  drawer,
};

export default animations;
