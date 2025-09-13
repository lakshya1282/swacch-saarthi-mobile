/**
 * Reusable Button Component
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  gradient?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Reusable button component with multiple variants and sizes
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  gradient = false,
  style,
  textStyle,
  ...touchableProps
}) => {
  const isDisabled = disabled || loading;

  // Get button styles based on variant
  const getButtonStyle = (): ViewStyle => {
    const baseStyle = styles.button;
    const sizeStyle = styles[`button_${size}`];
    const variantStyle = styles[`button_${variant}`];
    const disabledStyle = isDisabled ? styles.button_disabled : {};

    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
      ...disabledStyle,
      ...style,
    } as ViewStyle;
  };

  // Get text styles based on variant
  const getTextStyle = (): TextStyle => {
    const baseStyle = styles.text;
    const sizeStyle = styles[`text_${size}`];
    const variantStyle = styles[`text_${variant}`];

    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
      ...textStyle,
    } as TextStyle;
  };

  // Get icon size based on button size
  const getIconSize = (): number => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  // Get gradient colors based on variant
  const getGradientColors = (): string[] => {
    switch (variant) {
      case 'primary':
        return COLORS.GRADIENT.PRIMARY;
      case 'secondary':
        return COLORS.GRADIENT.SECONDARY;
      case 'danger':
        return [COLORS.ERROR, '#D32F2F'];
      case 'success':
        return [COLORS.SUCCESS, '#388E3C'];
      default:
        return COLORS.GRADIENT.PRIMARY;
    }
  };

  const renderContent = () => {
    const content = (
      <>
        {loading ? (
          <ActivityIndicator
            size={size === 'small' ? 'small' : 'small'}
            color={variant === 'outline' ? COLORS.PRIMARY : COLORS.TEXT.WHITE}
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <MaterialIcons
                name={icon}
                size={getIconSize()}
                color={getTextStyle().color}
                style={styles.iconLeft}
              />
            )}
            <Text style={getTextStyle()}>{title}</Text>
            {icon && iconPosition === 'right' && (
              <MaterialIcons
                name={icon}
                size={getIconSize()}
                color={getTextStyle().color}
                style={styles.iconRight}
              />
            )}
          </>
        )}
      </>
    );

    if (gradient && !isDisabled && variant !== 'outline') {
      return (
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[getButtonStyle(), styles.gradientButton]}
        >
          {content}
        </LinearGradient>
      );
    }

    return content;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isDisabled}
      style={gradient ? {} : getButtonStyle()}
      {...touchableProps}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  
  // Size variants
  button_small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button_medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  button_large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },

  // Color variants
  button_primary: {
    backgroundColor: COLORS.PRIMARY,
  },
  button_secondary: {
    backgroundColor: COLORS.SECONDARY,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  button_danger: {
    backgroundColor: COLORS.ERROR,
  },
  button_success: {
    backgroundColor: COLORS.SUCCESS,
  },
  button_disabled: {
    opacity: 0.6,
  },

  // Gradient button
  gradientButton: {
    borderRadius: 8,
  },

  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
  text_primary: {
    color: COLORS.TEXT.WHITE,
  },
  text_secondary: {
    color: COLORS.TEXT.WHITE,
  },
  text_outline: {
    color: COLORS.PRIMARY,
  },
  text_danger: {
    color: COLORS.TEXT.WHITE,
  },
  text_success: {
    color: COLORS.TEXT.WHITE,
  },

  // Icon styles
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;