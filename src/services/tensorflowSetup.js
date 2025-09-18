/**
 * TensorFlow.js Setup for React Native
 * Handles platform initialization and polyfills
 */

// Import polyfill for fetch API if not available globally
import 'react-native-get-random-values';

// Platform setup for React Native
let tfInitialized = false;

/**
 * Initialize TensorFlow.js for React Native
 * Must be called before any TensorFlow operations
 */
export async function initializeTensorFlowPlatform() {
  if (tfInitialized) {
    return true;
  }

  try {
    console.log('🔧 Setting up TensorFlow.js for React Native...');

    // Ensure fetch is available globally (React Native provides fetch by default)
    if (typeof fetch === 'undefined') {
      console.log('🌐 Setting up fetch polyfill...');
      // In React Native/Expo, fetch should already be available
      // If for some reason it's not, we'll throw an error rather than use node-fetch
      throw new Error('Fetch is not available in this React Native environment. Please check your setup.');
    } else {
      console.log('✅ Fetch is available globally');
    }

    // Import TensorFlow.js core first
    console.log('📜 Loading TensorFlow.js...');
    const tf = await import('@tensorflow/tfjs');
    
    // For Expo/React Native environments, we'll use a simpler approach
    // The platform should auto-detect React Native environment
    console.log('📱 Setting up TensorFlow.js for React Native/Expo...');
    
    try {
      // Import React Native platform components if available
      await import('@tensorflow/tfjs-react-native');
      console.log('✅ TensorFlow.js React Native platform loaded');
    } catch (rnError) {
      console.log('⚠️ TensorFlow.js React Native platform not available, using default setup');
      console.log('This might still work for basic operations...');
    }
    
    // Wait for TensorFlow.js to be ready
    console.log('🚀 Waiting for TensorFlow.js to be ready...');
    await tf.ready();
    
    tfInitialized = true;
    console.log('✅ TensorFlow.js React Native platform initialized successfully!');
    
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