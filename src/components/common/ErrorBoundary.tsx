/**
 * Error Boundary Component
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component to catch and display errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <MaterialIcons name="error-outline" size={80} color={COLORS.ERROR} />
            
            <Text style={styles.title}>Oops! Something went wrong</Text>
            
            <Text style={styles.message}>
              We're sorry for the inconvenience. Please try restarting the app.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                
                {this.state.errorInfo && (
                  <Text style={styles.stackTrace}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
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
    marginBottom: 30,
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.ERROR,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  stackTrace: {
    fontSize: 10,
    color: COLORS.TEXT.SECONDARY,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.TEXT.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;