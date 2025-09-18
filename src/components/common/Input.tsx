/**
 * Reusable Input Component
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, DESIGN_TOKENS } from '../../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  required?: boolean;
}

/**
 * Reusable input component with label and error handling
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  required = false,
  secureTextEntry,
  editable = true,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const handleFocus = () => {
    setIsFocused(true);
    textInputProps.onFocus?.({} as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    textInputProps.onBlur?.({} as any);
  };

  const toggleSecureEntry = () => {
    setIsSecure(!isSecure);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          !editable && styles.inputContainerDisabled,
        ]}
      >
        {icon && (
          <MaterialIcons
            name={icon}
            size={20}
            color={error ? COLORS.ERROR : isFocused ? COLORS.PRIMARY : COLORS.TEXT.SECONDARY}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            icon && styles.inputWithLeftIcon,
            (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
            inputStyle,
          ]}
          placeholderTextColor={COLORS.TEXT.LIGHT}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isSecure}
          editable={editable}
          {...textInputProps}
        />
        
        {secureTextEntry && (
          <TouchableOpacity onPress={toggleSecureEntry} style={styles.rightIconButton}>
            <MaterialIcons
              name={isSecure ? 'visibility-off' : 'visibility'}
              size={20}
              color={COLORS.TEXT.SECONDARY}
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconButton}
            disabled={!onRightIconPress}
          >
            <MaterialIcons
              name={rightIcon}
              size={20}
              color={COLORS.TEXT.SECONDARY}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: DESIGN_TOKENS.SPACING.MD,
  },
  label: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: DESIGN_TOKENS.SPACING.SM,
    letterSpacing: 0.25,
  },
  required: {
    color: COLORS.ERROR,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: DESIGN_TOKENS.BORDER_RADIUS.MD,
    backgroundColor: COLORS.BACKGROUND.CARD,
    paddingHorizontal: DESIGN_TOKENS.SPACING.MD,
    height: 52,
    ...DESIGN_TOKENS.SHADOWS.SMALL,
  },
  inputContainerFocused: {
    borderColor: COLORS.BORDER.FOCUS,
    borderWidth: 2,
    ...DESIGN_TOKENS.SHADOWS.COLORED,
  },
  inputContainerError: {
    borderColor: COLORS.BORDER.ERROR,
    borderWidth: 2,
  },
  inputContainerDisabled: {
    backgroundColor: COLORS.BACKGROUND.SURFACE,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  input: {
    flex: 1,
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.PRIMARY,
    paddingVertical: DESIGN_TOKENS.SPACING.MD,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.NORMAL,
  },
  inputWithLeftIcon: {
    paddingLeft: DESIGN_TOKENS.SPACING.SM,
  },
  inputWithRightIcon: {
    paddingRight: DESIGN_TOKENS.SPACING.SM,
  },
  leftIcon: {
    marginRight: DESIGN_TOKENS.SPACING.SM,
  },
  rightIconButton: {
    padding: DESIGN_TOKENS.SPACING.XS,
    borderRadius: DESIGN_TOKENS.BORDER_RADIUS.SM,
  },
  error: {
    fontSize: DESIGN_TOKENS.TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.ERROR,
    marginTop: DESIGN_TOKENS.SPACING.XS,
    marginLeft: DESIGN_TOKENS.SPACING.XS,
    fontWeight: DESIGN_TOKENS.TYPOGRAPHY.FONT_WEIGHT.MEDIUM,
  },
});

export default Input;