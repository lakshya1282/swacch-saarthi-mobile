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
import { COLORS } from '../../constants';

interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
  shadow?: boolean;
  borderRadius?: number;
  backgroundColor?: string;
  onPress?: () => void;
}

/**
 * Reusable card component with consistent styling
 */
export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 16,
  margin = 0,
  shadow = true,
  borderRadius = 12,
  backgroundColor = COLORS.BACKGROUND.SECONDARY,
  onPress,
  ...touchableProps
}) => {
  const cardStyle: ViewStyle = {
    padding,
    margin,
    borderRadius,
    backgroundColor,
    ...(shadow ? styles.shadow : {}),
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
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default Card;