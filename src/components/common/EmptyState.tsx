/**
 * Empty State Component
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface EmptyStateProps {
  icon?: keyof typeof MaterialIcons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Empty state component for displaying when no data is available
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  iconSize = 80,
  iconColor = COLORS.TEXT.LIGHT,
  title,
  message,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <MaterialIcons 
        name={icon as keyof typeof MaterialIcons.glyphMap} 
        size={iconSize} 
        color={iconColor} 
      />
      
      <Text style={styles.title}>{title}</Text>
      
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
      
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT.PRIMARY,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
  },
  actionButtonText: {
    color: COLORS.TEXT.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmptyState;