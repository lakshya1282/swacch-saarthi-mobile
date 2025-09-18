/**
 * Reusable Card Component
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { COLORS, DESIGN_TOKENS } from '../../constants';

interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
  shadow?: 'none' | 'small' | 'medium' | 'large' | 'colored';
  borderRadius?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
}

/**
 * Reusable card component with consistent styling
 */
export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = DESIGN_TOKENS.SPACING.MD,
  margin = 0,
  shadow = 'medium',
  borderRadius = DESIGN_TOKENS.BORDER_RADIUS.MD,
  backgroundColor = COLORS.BACKGROUND.CARD,
  borderColor,
  borderWidth = 0,
  variant = 'default',
  onPress,
  ...touchableProps
}) => {
  const getShadowStyle = () => {
    switch (shadow) {
      case 'small':
        return DESIGN_TOKENS.SHADOWS.SMALL;
      case 'medium':
        return DESIGN_TOKENS.SHADOWS.MEDIUM;
      case 'large':
        return DESIGN_TOKENS.SHADOWS.LARGE;
      case 'colored':
        return DESIGN_TOKENS.SHADOWS.COLORED;
      default:
        return {};
    }
  };
  
  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: COLORS.BACKGROUND.CARD,
          ...DESIGN_TOKENS.SHADOWS.MEDIUM,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: COLORS.BORDER.LIGHT,
        };
      case 'filled':
        return {
          backgroundColor: COLORS.BACKGROUND.SURFACE,
          borderWidth: 0,
        };
      default:
        return {};
    }
  };

  const cardStyle: ViewStyle = {
    padding,
    margin,
    borderRadius,
    backgroundColor,
    borderWidth,
    borderColor,
    ...getShadowStyle(),
    ...getVariantStyle(),
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={cardStyle}
        {...touchableProps}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  // Legacy shadow for backwards compatibility
  shadow: {
    ...DESIGN_TOKENS.SHADOWS.MEDIUM,
  },
});

export default Card;