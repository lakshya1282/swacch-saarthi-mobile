/**
 * Animated Components for Enhanced UX
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { DESIGN_TOKENS } from '../../constants';

// Fade In Animation
interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  duration = DESIGN_TOKENS.ANIMATION.DURATION.NORMAL,
  delay = 0,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [opacity, duration, delay]);

  return (
    <Animated.View style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  );
};

// Slide In From Bottom
interface SlideInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}

export const SlideInFromBottom: React.FC<SlideInProps> = ({
  children,
  duration = DESIGN_TOKENS.ANIMATION.DURATION.NORMAL,
  delay = 0,
  distance = 50,
  style,
}) => {
  const translateY = useRef(new Animated.Value(distance)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration * 0.8,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [translateY, opacity, duration, delay, distance]);

  return (
    <Animated.View style={[{ transform: [{ translateY }], opacity }, style]}>
      {children}
    </Animated.View>
  );
};

// Scale In Animation
interface ScaleInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  initialScale?: number;
  style?: ViewStyle;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  duration = DESIGN_TOKENS.ANIMATION.DURATION.NORMAL,
  delay = 0,
  initialScale = 0.8,
  style,
}) => {
  const scale = useRef(new Animated.Value(initialScale)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration * 0.6,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [scale, opacity, duration, delay, initialScale]);

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
      {children}
    </Animated.View>
  );
};

// Pulse Animation
interface PulseProps {
  children: React.ReactNode;
  duration?: number;
  maxScale?: number;
  style?: ViewStyle;
}

export const Pulse: React.FC<PulseProps> = ({
  children,
  duration = 1000,
  maxScale = 1.05,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const createPulseAnimation = () => {
      return Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]);
    };

    const startPulse = () => {
      Animated.loop(createPulseAnimation()).start();
    };

    startPulse();
  }, [scale, duration, maxScale]);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  );
};

// Shimmer Loading Effect
interface ShimmerProps {
  width: number;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width,
  height,
  borderRadius = DESIGN_TOKENS.BORDER_RADIUS.SM,
  style,
}) => {
  const shimmerOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createShimmerAnimation = () => {
      return Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ]);
    };

    Animated.loop(createShimmerAnimation()).start();
  }, [shimmerOpacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#E1E9EE',
          borderRadius,
          opacity: shimmerOpacity,
        },
        style,
      ]}
    />
  );
};

// Stagger Animation Container
interface StaggerProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  initialDelay?: number;
  style?: ViewStyle;
}

export const Stagger: React.FC<StaggerProps> = ({
  children,
  staggerDelay = 100,
  initialDelay = 0,
  style,
}) => {
  return (
    <Animated.View style={style}>
      {React.Children.map(children, (child, index) => (
        <FadeIn
          key={index}
          delay={initialDelay + index * staggerDelay}
          duration={DESIGN_TOKENS.ANIMATION.DURATION.NORMAL}
        >
          {child}
        </FadeIn>
      ))}
    </Animated.View>
  );
};

// Bounce Animation
interface BounceProps {
  children: React.ReactNode;
  trigger?: boolean;
  style?: ViewStyle;
}

export const Bounce: React.FC<BounceProps> = ({
  children,
  trigger = false,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (trigger) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.2,
          duration: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [trigger, scale]);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  );
};

// Typing Animation for Text
interface TypingTextProps {
  text: string;
  duration?: number;
  style?: TextStyle;
  onComplete?: () => void;
}

export const TypingText: React.FC<TypingTextProps> = ({
  text,
  duration = 50,
  style,
  onComplete,
}) => {
  const [displayText, setDisplayText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, duration);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, duration, onComplete]);

  return (
    <Animated.Text style={style}>
      {displayText}
      {currentIndex < text.length && (
        <Animated.Text style={{ opacity: 0.5 }}>|</Animated.Text>
      )}
    </Animated.Text>
  );
};