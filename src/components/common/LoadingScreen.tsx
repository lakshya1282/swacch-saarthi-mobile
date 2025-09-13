/**
 * Loading Screen Component
 */

import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { COLORS } from '../../constants';

interface LoadingScreenProps {
  visible?: boolean;
  message?: string;
  overlay?: boolean;
  size?: 'small' | 'large';
  color?: string;
}

/**
 * Loading screen component for displaying loading states
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  visible = true,
  message = 'Loading...',
  overlay = false,
  size = 'large',
  color = COLORS.PRIMARY,
}) => {
  const content = (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );

  if (overlay) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>{content}</View>
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
    padding: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
  },
});

export default LoadingScreen;