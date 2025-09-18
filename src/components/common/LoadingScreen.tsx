/**
 * Enhanced Loading Screen Component with Modern Animations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, DESIGN_TOKENS } from '../../constants';
import { FadeIn, Pulse } from './AnimatedComponents';

interface LoadingScreenProps {
  visible?: boolean;
  message?: string;
  overlay?: boolean;
  size?: 'small' | 'large';
  color?: string;
  type?: 'default' | 'gradient' | 'minimal';
}

/**
 * Enhanced loading screen component with modern animations
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  visible = true,
  message = 'Loading...',
  overlay = false,
  size = 'large',
  color = COLORS.PRIMARY,
  type = 'gradient',
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Spinning animation
      const spin = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.1,
            duration: 800,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ])
      );

      spin.start();
      pulse.start();

      return () => {
        spin.stop();
        pulse.stop();
      };
    }
  }, [visible, spinValue, pulseValue]);

  const spinRotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderModernContent = () => {
    if (type === 'gradient') {
      return (
        <LinearGradient
          colors={COLORS.GRADIENT.OCEAN}
          style={styles.gradientContent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            style={[
              styles.spinnerContainer,
              {
                transform: [{ rotate: spinRotation }, { scale: pulseValue }],
              },
            ]}
          >
            <View style={styles.modernSpinner}>
              <View style={styles.spinnerDot} />
              <View style={[styles.spinnerDot, { backgroundColor: COLORS.SECONDARY }]} />
              <View style={[styles.spinnerDot, { backgroundColor: COLORS.ACCENT }]} />
            </View>
          </Animated.View>
          
          <FadeIn delay={500}>
            <Text style={styles.gradientMessage}>{message}</Text>
          </FadeIn>
        </LinearGradient>
      );
    }
    
    if (type === 'minimal') {
      return (
        <View style={styles.minimalContent}>
          <ActivityIndicator size={size} color={color} />
          <FadeIn delay={300}>
            <Text style={styles.minimalMessage}>{message}</Text>
          </FadeIn>
        </View>
      );
    }
    
    // Default modern style
    return (
      <Pulse>
        <View style={styles.defaultContent}>
          <View style={styles.loaderContainer}>
            <Animated.View
              style={[
                styles.customLoader,
                { transform: [{ rotate: spinRotation }] },
              ]}
            >
              <View style={[styles.loaderInner, { borderTopColor: color }]} />
            </Animated.View>
          </View>
          
          <FadeIn delay={400}>
            <Text style={styles.defaultMessage}>{message}</Text>
          </FadeIn>
        </View>
      </Pulse>
    );
  };

  const content = (
    <View style={styles.container}>
      {renderModernContent()}
    </View>
  );

  if (overlay) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>
          <FadeIn duration={300}>
            {renderModernContent()}
          </FadeIn>
        </View>
      </Modal>
    );
  }

  if (!visible) return null;

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DESIGN_TOKENS.SPACING.LG,
  },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.MODAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Gradient variant
  gradientContent: {
    padding: DESIGN_TOKENS.SPACING.XXL,
    borderRadius: DESIGN_TOKENS.BORDER_RADIUS.XL,
    alignItems: 'center',
    minWidth: 250,
    ...DESIGN_TOKENS.SHADOWS.LARGE,
  },
  spinnerContainer: {
    marginBottom: DESIGN_TOKENS.SPACING.LG,
  },
  modernSpinner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 60,
  },
  spinnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.TEXT.WHITE,
  },
  gradientMessage: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.WHITE,
    textAlign: 'center',
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  
  // Default variant
  defaultContent: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: DESIGN_TOKENS.SPACING.XL,
    borderRadius: DESIGN_TOKENS.BORDER_RADIUS.LG,
    alignItems: 'center',
    minWidth: 220,
    ...DESIGN_TOKENS.SHADOWS.MEDIUM,
  },
  loaderContainer: {
    marginBottom: DESIGN_TOKENS.SPACING.LG,
  },
  customLoader: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: COLORS.NEUTRAL[200],
    borderTopColor: COLORS.PRIMARY,
  },
  defaultMessage: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
  
  // Minimal variant
  minimalContent: {
    alignItems: 'center',
  },
  minimalMessage: {
    marginTop: DESIGN_TOKENS.SPACING.MD,
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
});

export default LoadingScreen;
