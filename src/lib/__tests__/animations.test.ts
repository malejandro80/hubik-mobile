import { Animated } from 'react-native';
import {
  animations,
  animationDurations,
  animationEasings,
} from '../animations';

describe('Animation Facade (animations)', () => {
  let value: Animated.Value;

  beforeEach(() => {
    value = new Animated.Value(0);
  });

  describe('Tokens', () => {
    it('defines standard animation durations', () => {
      expect(animationDurations.fast).toBe(150);
      expect(animationDurations.normal).toBe(250);
      expect(animationDurations.enter).toBe(280);
      expect(animationDurations.exit).toBe(220);
    });

    it('defines standard animation easing curves', () => {
      expect(typeof animationEasings.linear).toBe('function');
      expect(typeof animationEasings.easeInQuad).toBe('function');
      expect(typeof animationEasings.easeOutQuad).toBe('function');
      expect(typeof animationEasings.drawerEnter).toBe('function');
      expect(typeof animationEasings.drawerExit).toBe('function');
    });
  });

  describe('Primitives', () => {
    it('creates a timing animation with default native driver', () => {
      const anim = animations.timing(value, 1, { duration: 300 });
      expect(anim).toBeDefined();
      expect(typeof anim.start).toBe('function');
    });

    it('creates a fade animation targeting opacity', () => {
      const anim = animations.fade(value, 1, { duration: 200 });
      expect(anim).toBeDefined();
      expect(typeof anim.start).toBe('function');
    });

    it('creates a slide animation targeting position', () => {
      const anim = animations.slide(value, 300, { duration: 250 });
      expect(anim).toBeDefined();
      expect(typeof anim.start).toBe('function');
    });

    it('creates a spring animation', () => {
      const anim = animations.spring(value, 1, { tension: 40, friction: 7 });
      expect(anim).toBeDefined();
      expect(typeof anim.start).toBe('function');
    });

    it('composes animations in parallel and sequence', () => {
      const anim1 = animations.fade(value, 1);
      const anim2 = animations.slide(value, 100);

      const parallelAnim = animations.parallel([anim1, anim2]);
      expect(parallelAnim).toBeDefined();
      expect(typeof parallelAnim.start).toBe('function');

      const sequenceAnim = animations.sequence([anim1, anim2]);
      expect(sequenceAnim).toBeDefined();
      expect(typeof sequenceAnim.start).toBe('function');
    });

    it('executes animations as a Promise via animations.run', async () => {
      const anim = animations.timing(value, 1, { duration: 10 });
      const result = await animations.run(anim);
      expect(result.finished).toBe(true);
    });
  });

  describe('Drawer Presets', () => {
    it('opens drawer in test mode immediately and invokes onComplete', () => {
      const fadeAnim = new Animated.Value(0);
      const slideAnim = new Animated.Value(340);
      const onComplete = jest.fn();

      animations.drawer.open({
        fadeAnim,
        slideAnim,
        isTest: true,
        onComplete,
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('closes drawer in test mode immediately and invokes onComplete', () => {
      const fadeAnim = new Animated.Value(1);
      const slideAnim = new Animated.Value(0);
      const onComplete = jest.fn();

      animations.drawer.close({
        fadeAnim,
        slideAnim,
        drawerWidth: 340,
        isTest: true,
        onComplete,
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('creates composite animation in standard mode when isTest is false', () => {
      const fadeAnim = new Animated.Value(0);
      const slideAnim = new Animated.Value(340);
      const onComplete = jest.fn();

      const anim = animations.drawer.open({
        fadeAnim,
        slideAnim,
        isTest: false,
        onComplete,
      });

      expect(anim).toBeDefined();
      expect(typeof anim?.start).toBe('function');
    });
  });
});
