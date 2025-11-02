/**
 * TensorFlow.js Setup for React Native and Web
 * Handles platform initialization and polyfills
 */

import { Platform } from 'react-native';

// Only import this polyfill on native platforms
if (Platform.OS !== 'web') {
  require('react-native-get-random-values');
}

// Platform setup
let tfInitialized = false;

/**
 * Initialize TensorFlow.js for the current platform
 * Must be called before any TensorFlow operations
 */
export async function initializeTensorFlowPlatform() {
  if (tfInitialized) {
    return true;
  }

  try {
    console.log('🔧 Setting up TensorFlow.js...');

    // Import TensorFlow.js core first
    console.log('📜 Loading TensorFlow.js...');
    const tf = await import('@tensorflow/tfjs');
    
    // Platform-specific setup
    if (Platform.OS === 'web') {
      console.log('🌐 Setting up TensorFlow.js for Web...');
      // On web, TensorFlow.js works out of the box
      // No need to import tfjs-react-native
    } else {
      console.log('📱 Setting up TensorFlow.js for React Native...');
      
      try {
        // Import React Native platform components only on native
        await import('@tensorflow/tfjs-react-native');
        console.log('✅ TensorFlow.js React Native platform loaded');
      } catch (rnError) {
        console.log('⚠️ TensorFlow.js React Native platform not available, using default setup');
        console.log('This might still work for basic operations...');
      }
    }
    
    // Wait for TensorFlow.js to be ready
    console.log('🚀 Waiting for TensorFlow.js to be ready...');
    await tf.ready();
    
    tfInitialized = true;
    console.log('✅ TensorFlow.js platform initialized successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize TensorFlow.js platform:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

/**
 * Get TensorFlow.js instance (only call after platform is initialized)
 */
export async function getTensorFlow() {
  if (!tfInitialized) {
    const success = await initializeTensorFlowPlatform();
    if (!success) {
      throw new Error('Failed to initialize TensorFlow.js platform');
    }
  }
  
  const tf = await import('@tensorflow/tfjs');
  return tf;
}

/**
 * Check if TensorFlow.js is ready
 */
export function isTensorFlowReady() {
  return tfInitialized;
}