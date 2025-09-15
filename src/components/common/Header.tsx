/**
 * Header Component
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Reusable header component
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBackPress,
  rightIcon,
  onRightPress,
  backgroundColor = COLORS.PRIMARY,
  textColor = COLORS.TEXT.WHITE,
}) => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <>
      <StatusBar
        barStyle={backgroundColor === COLORS.TEXT.WHITE ? 'dark-content' : 'light-content'}
        backgroundColor={backgroundColor}
      />
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.content}>
          {showBack && navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.leftButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
          )}

          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: textColor }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          {rightIcon && (
            <TouchableOpacity
              style={styles.rightButton}
              onPress={onRightPress}
              activeOpacity={0.7}
            >
              <MaterialIcons name={rightIcon} size={24} color={textColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
  },
  leftButton: {
    padding: 8,
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  rightButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default Header;