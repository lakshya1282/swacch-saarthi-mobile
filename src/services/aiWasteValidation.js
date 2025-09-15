/**
 * AI Waste Validation Service
 * Integrates multiple free AI models for waste classification
 */

const AI_SERVICES = {
  TENSORFLOW_JS: 'tensorflow',
  HUGGING_FACE: 'huggingface',
  ROBOFLOW: 'roboflow',
  GOOGLE_VISION: 'google_vision'
};

class AIWasteValidationService {
  constructor() {
    this.currentService = AI_SERVICES.TENSORFLOW_JS; // Default free option
    this.models = {};
  }

  // 1. TensorFlow.js Browser-based Classification (Completely Free)
  async initTensorFlowModel() {
    if (!this.models.tensorflow) {
      try {
        // Load MobileNet model (runs in browser, no API costs)
        const tf = await import('@tensorflow/tfjs');
        const mobilenet = await import('@tensorflow-models/mobilenet');
        this.models.tensorflow = await mobilenet.load();
        console.log('TensorFlow.js model loaded successfully');
      } catch (error) {
        console.error('Failed to load TensorFlow.js model:', error);
      }
    }
    return this.models.tensorflow;
  }

  async classifyWithTensorFlow(imageUri) {
    const model = await this.initTensorFlowModel();
    if (!model) throw new Error('TensorFlow model not loaded');

    try {
      // Convert image to tensor with better error handling
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const imageLoadPromise = new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('TensorFlow.js: Image loaded successfully', {
            width: img.width,
            height: img.height,
            src: imageUri.substring(0, 50) + '...'
          });
          resolve();
        };
        img.onerror = (error) => {
          console.error('TensorFlow.js: Failed to load image', error);
          reject(new Error('Failed to load image for TensorFlow analysis'));
        };
      });
      
      img.src = imageUri;
      await imageLoadPromise;

      // Classify image with error handling
      console.log('TensorFlow.js: Starting image classification...');
      const predictions = await model.classify(img);
      console.log('TensorFlow.js: Classification results:', predictions);
      
      // Check if we got meaningful predictions
      if (!predictions || predictions.length === 0) {
        console.warn('TensorFlow.js: No predictions returned');
        return this.createLowConfidenceResult('TensorFlow.js could not analyze this image');
      }
      
      // Filter out very low confidence predictions
      const filteredPredictions = predictions.filter(pred => pred.probability > 0.1);
      if (filteredPredictions.length === 0) {
        console.warn('TensorFlow.js: All predictions below confidence threshold');
        return this.createLowConfidenceResult('Image analysis returned low confidence results');
      }
      
      return this.processWasteClassification(filteredPredictions);
    } catch (error) {
      console.error('TensorFlow classification failed:', error);
      return this.createLowConfidenceResult(`TensorFlow.js error: ${error.message}`);
    }
  }

  // 2. Hugging Face Inference API (Free tier: 30,000 requests/month)
  async classifyWithHuggingFace(imageUri) {
    const API_URL = "https://api-inference.huggingface.co/models/microsoft/resnet-50";
    const HF_TOKEN = process.env.REACT_APP_HUGGINGFACE_TOKEN; // Get free token from huggingface.co

    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: imageUri
        }),
      });

      const result = await response.json();
      return this.processWasteClassification(result);
    } catch (error) {
      console.error('Hugging Face classification failed:', error);
      throw error;
    }
  }

  // 3. Roboflow API (Free: 1000 requests/month)
  async classifyWithRoboflow(imageUri) {
    const API_KEY = process.env.REACT_APP_ROBOFLOW_API_KEY; // Free API key
    const MODEL_ENDPOINT = process.env.REACT_APP_ROBOFLOW_MODEL_URL;

    try {
      const base64Image = await this.convertImageToBase64(imageUri);
      
      const response = await fetch(MODEL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `api_key=${API_KEY}&image=${encodeURIComponent(base64Image)}`
      });

      const result = await response.json();
      return this.processRoboflowResults(result);
    } catch (error) {
      console.error('Roboflow classification failed:', error);
      throw error;
    }
  }

  // 4. Google Vision API (Free: 1000 requests/month) - Enhanced for waste detection
  async classifyWithGoogleVision(imageUri) {
    const API_KEY = process.env.REACT_APP_GOOGLE_VISION_API_KEY;
    const API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`;

    if (!API_KEY || API_KEY === 'your_google_vision_api_key_here') {
      throw new Error('Google Vision API key not configured. Please add your API key to the .env file.');
    }

    try {
      const base64Image = await this.convertImageToBase64(imageUri);
      
      // Enhanced request with multiple detection features for better waste classification
      const requestBody = {
        requests: [{
          image: { content: base64Image },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 15 }, // Increased for more context
            { type: 'OBJECT_LOCALIZATION', maxResults: 15 }, // More objects detected
            { type: 'TEXT_DETECTION', maxResults: 5 }, // Detect text on packaging
            { type: 'LOGO_DETECTION', maxResults: 5 } // Brand logos for better identification
          ]
        }]
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Vision API HTTP Error:', response.status, errorData);
        throw new Error(`Google Vision API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      // Check for API errors in response
      if (result.responses?.[0]?.error) {
        console.error('Google Vision API Response Error:', result.responses[0].error);
        throw new Error(`Vision API error: ${result.responses[0].error.message}`);
      }
      
      return this.processGoogleVisionResults(result);
    } catch (error) {
      console.error('Google Vision classification failed:', error);
      
      // Provide helpful error messages
      if (error.message.includes('API key')) {
        throw new Error('Google Vision API key error. Please check your API key configuration.');
      } else if (error.message.includes('403')) {
        throw new Error('Google Vision API access denied. Please check your API key permissions.');
      } else if (error.message.includes('429')) {
        throw new Error('Google Vision API rate limit exceeded. Try again later.');
      }
      
      throw error;
    }
  }

  // Main validation method with fallback
  async validateWaste(imageUri, preferredService = null) {
    const service = preferredService || this.currentService;
    
    try {
      let result;
      
      switch (service) {
        case AI_SERVICES.TENSORFLOW_JS:
          result = await this.classifyWithTensorFlow(imageUri);
          break;
        case AI_SERVICES.HUGGING_FACE:
          result = await this.classifyWithHuggingFace(imageUri);
          break;
        case AI_SERVICES.ROBOFLOW:
          result = await this.classifyWithRoboflow(imageUri);
          break;
        case AI_SERVICES.GOOGLE_VISION:
          result = await this.classifyWithGoogleVision(imageUri);
          break;
        default:
          result = await this.classifyWithTensorFlow(imageUri);
      }

      return result;
    } catch (error) {
      console.error(`AI validation failed with ${service}:`, error);
      
      // Fallback to offline classification
      return this.fallbackClassification();
    }
  }

  // Process Roboflow API results
  processRoboflowResults(result) {
    const predictions = result.predictions || [];
    const formattedPredictions = predictions.map(pred => ({
      className: pred.class,
      probability: pred.confidence,
      label: pred.class,
      score: pred.confidence
    }));
    
    return this.processWasteClassification(formattedPredictions);
  }

  // Process Google Vision API results - Enhanced for waste classification
  processGoogleVisionResults(result) {
    const responses = result.responses || [];
    if (responses.length === 0) return this.fallbackClassification();
    
    const annotations = responses[0];
    const labels = annotations.labelAnnotations || [];
    const objects = annotations.localizedObjectAnnotations || [];
    const textDetections = annotations.textAnnotations || [];
    const logoDetections = annotations.logoAnnotations || [];
    
    // Enhanced processing with text and logo context for better waste identification
    const allDetections = [
      // Primary labels with higher weight
      ...labels.map(label => ({
        className: label.description,
        probability: label.score,
        label: label.description,
        score: label.score,
        type: 'label'
      })),
      // Object detections with spatial information
      ...objects.map(obj => ({
        className: obj.name,
        probability: obj.score,
        label: obj.name,
        score: obj.score,
        type: 'object',
        boundingBox: obj.boundingPoly
      })),
      // Text detections for packaging identification
      ...textDetections.slice(1).map(text => ({ // Skip first which is full text
        className: text.description,
        probability: 0.6, // Medium confidence for text
        label: text.description,
        score: 0.6,
        type: 'text'
      })),
      // Logo detections for brand identification
      ...logoDetections.map(logo => ({
        className: logo.description,
        probability: logo.score,
        label: logo.description,
        score: logo.score,
        type: 'logo'
      }))
    ];
    
    // Enhanced waste classification with context
    return this.processWasteClassificationEnhanced(allDetections);
  }

  // Enhanced waste classification method for Google Vision API
  processWasteClassificationEnhanced(predictions) {
    const enhancedWasteKeywords = {
      'Dry Waste': {
        primary: ['bottle', 'plastic bottle', 'glass bottle', 'can', 'aluminum can', 'paper', 'cardboard', 'newspaper', 'magazine'],
        secondary: ['container', 'packaging', 'wrapper', 'bag', 'plastic', 'metal', 'glass'],
        brands: ['coca-cola', 'pepsi', 'sprite', 'water bottle'],
        text: ['recycle', 'plastic', 'pet', 'glass', 'aluminum']
      },
      'Wet Waste': {
        primary: ['apple', 'banana', 'orange', 'food', 'fruit', 'vegetable', 'bread', 'meat'],
        secondary: ['organic', 'kitchen waste', 'peel', 'leftovers', 'fish', 'egg'],
        text: ['organic', 'fresh', 'natural']
      },
      'Hazardous Waste': {
        primary: ['battery', 'electronic device', 'mobile phone', 'computer', 'light bulb'],
        secondary: ['chemical', 'paint', 'medicine', 'syringe', 'pesticide'],
        text: ['battery', 'electronic', 'toxic', 'hazard', 'danger']
      }
    };

    let detectedItems = [];
    let wasteType = 'Unknown';
    let confidence = 0;
    let analysis = { labels: [], objects: [], text: [], logos: [] };

    // Categorize detections by type
    predictions.forEach(prediction => {
      const label = prediction.className || prediction.label || '';
      const score = prediction.probability || prediction.score || 0;
      const type = prediction.type || 'unknown';

      if (score > 0.3) { // Minimum confidence threshold
        detectedItems.push(`${label} (${type})`);
        analysis[type + 's']?.push({ label, score });
      }
    });

    // Enhanced classification with weighted scoring
    let bestMatch = { type: 'Unknown', score: 0, reasons: [] };

    Object.keys(enhancedWasteKeywords).forEach(type => {
      const keywords = enhancedWasteKeywords[type];
      let typeScore = 0;
      let reasons = [];

      predictions.forEach(prediction => {
        const label = (prediction.className || prediction.label || '').toLowerCase();
        const score = prediction.probability || prediction.score || 0;
        const detectionType = prediction.type || 'unknown';

        if (score > 0.3) {
          // Primary keywords get highest weight
          if (keywords.primary?.some(keyword => label.includes(keyword.toLowerCase()))) {
            const weight = detectionType === 'object' ? 1.0 : 0.8;
            typeScore += score * weight;
            reasons.push(`Primary match: "${label}" (${Math.round(score * 100)}%)`);
          }
          // Secondary keywords get medium weight
          else if (keywords.secondary?.some(keyword => label.includes(keyword.toLowerCase()))) {
            const weight = detectionType === 'object' ? 0.7 : 0.5;
            typeScore += score * weight;
            reasons.push(`Secondary match: "${label}" (${Math.round(score * 100)}%)`);
          }
          // Brand/text matches get lower weight but still valuable
          else if (keywords.brands?.some(keyword => label.includes(keyword.toLowerCase())) ||
                   keywords.text?.some(keyword => label.includes(keyword.toLowerCase()))) {
            typeScore += score * 0.4;
            reasons.push(`Context match: "${label}" (${Math.round(score * 100)}%)`);
          }
        }
      });

      if (typeScore > bestMatch.score) {
        bestMatch = { type, score: typeScore, reasons };
      }
    });

    wasteType = bestMatch.type;
    confidence = Math.min(Math.round(bestMatch.score * 100), 100);

    return this.formatEnhancedValidationResult(wasteType, confidence, detectedItems, analysis, bestMatch.reasons);
  }

  // Helper method for low confidence or failed results
  createLowConfidenceResult(reason) {
    return {
      isCorrect: false,
      wasteType: null,
      confidence: 0,
      detectedItems: [],
      overallScore: 0,
      message: 'Could not identify any objects. Please ensure good lighting and a clear view of the waste item.',
      aiSource: this.currentService,
      issues: [{
        item: 'Image quality',
        currentBin: 'No objects detected in the image',
        correctBin: 'Please retake photo',
        reason: reason || 'Image may be unclear, too dark, or contain unrecognizable objects'
      }],
      tips: [
        '📸 Ensure good lighting when taking the photo',
        '🔍 Get a clear, close-up view of the waste item',
        '📱 Hold the camera steady and avoid blur',
        '🗑️ Try photographing individual items rather than mixed waste',
        '💡 Use natural light or bright indoor lighting'
      ]
    };
  }

  // Process different model outputs into standardized format
  processWasteClassification(predictions) {
    console.log('Processing waste classification with predictions:', predictions);
    
    const enhancedWasteKeywords = {
      'Dry Waste': {
        exact: ['bottle', 'plastic bottle', 'water bottle', 'soda bottle', 'can', 'aluminum can', 'tin can', 'jar', 'container'],
        partial: ['plastic', 'glass', 'metal', 'paper', 'cardboard', 'newspaper', 'magazine', 'packaging', 'wrapper', 'carton'],
        brands: ['coca cola', 'pepsi', 'sprite', 'fanta', 'aquafina', 'dasani']
      },
      'Wet Waste': {
        exact: ['apple', 'banana', 'orange', 'lemon', 'tomato', 'potato', 'carrot', 'bread', 'egg'],
        partial: ['food', 'fruit', 'vegetable', 'organic', 'kitchen', 'meat', 'fish', 'peel', 'leftovers'],
        context: ['fresh', 'ripe', 'cooked', 'raw']
      },
      'Hazardous Waste': {
        exact: ['battery', 'light bulb', 'fluorescent', 'mobile phone', 'smartphone', 'computer', 'laptop'],
        partial: ['electronic', 'device', 'chemical', 'toxic', 'medicine', 'pharmaceutical'],
        context: ['electronic', 'digital', 'tech']
      }
    };

    let detectedItems = [];
    let bestMatch = { type: 'Unknown', score: 0, confidence: 0, reasons: [] };

    // Process each prediction
    predictions.forEach((prediction, index) => {
      const className = (prediction.className || prediction.label || '').toLowerCase();
      const probability = prediction.probability || prediction.score || 0;
      
      console.log(`Prediction ${index + 1}: "${className}" (${Math.round(probability * 100)}%)`);
      
      if (probability > 0.05) { // Very low threshold to catch more items
        detectedItems.push(`${prediction.className || prediction.label} (${Math.round(probability * 100)}%)`);
        
        // Check against waste categories
        Object.keys(enhancedWasteKeywords).forEach(wasteType => {
          const keywords = enhancedWasteKeywords[wasteType];
          let matchScore = 0;
          let matchReasons = [];
          
          // Exact matches (highest weight)
          if (keywords.exact?.some(keyword => className.includes(keyword))) {
            matchScore += probability * 1.0;
            matchReasons.push(`Exact match: "${className}"`);
          }
          // Partial matches (medium weight) 
          else if (keywords.partial?.some(keyword => className.includes(keyword) || keyword.includes(className))) {
            matchScore += probability * 0.7;
            matchReasons.push(`Partial match: "${className}"`);
          }
          // Context matches (lower weight)
          else if (keywords.brands?.some(keyword => className.includes(keyword)) || 
                   keywords.context?.some(keyword => className.includes(keyword))) {
            matchScore += probability * 0.4;
            matchReasons.push(`Context match: "${className}"`);
          }
          
          if (matchScore > bestMatch.score) {
            bestMatch = {
              type: wasteType,
              score: matchScore,
              confidence: Math.min(Math.round(matchScore * 100), 95),
              reasons: matchReasons
            };
          }
        });
      }
    });

    console.log('Best match result:', bestMatch);

    // If no good matches found, return low confidence result
    if (bestMatch.type === 'Unknown' || bestMatch.confidence < 20) {
      return this.createLowConfidenceResult(
        detectedItems.length > 0 
          ? `Detected items (${detectedItems.join(', ')}) but could not classify as waste type`
          : 'No recognizable objects found in the image'
      );
    }

    return this.formatValidationResult(bestMatch.type, bestMatch.confidence, detectedItems, bestMatch.reasons);
  }

  // Legacy method for backward compatibility
  processWasteClassificationLegacy(predictions) {
    const wasteKeywords = {
      'Dry Waste': [
        'bottle', 'plastic', 'paper', 'cardboard', 'metal', 'can', 'glass',
        'newspaper', 'magazine', 'container', 'packaging'
      ],
      'Wet Waste': [
        'food', 'apple', 'banana', 'orange', 'vegetable', 'fruit', 'organic',
        'bread', 'meat', 'fish', 'leftovers', 'peel', 'kitchen waste'
      ],
      'Hazardous Waste': [
        'battery', 'electronic', 'phone', 'computer', 'chemical', 'paint',
        'medicine', 'syringe', 'fluorescent', 'pesticide'
      ]
    };

    let detectedItems = [];
    let wasteType = 'Unknown';
    let confidence = 0;

    // Extract predictions based on model format
    const items = Array.isArray(predictions) ? predictions : predictions.predictions || [];
    
    items.forEach(prediction => {
      const label = prediction.className || prediction.label || '';
      const score = prediction.probability || prediction.score || 0;
      
      if (score > 0.3) { // Minimum confidence threshold
        detectedItems.push(label);
        
        // Determine waste type based on detected items
        Object.keys(wasteKeywords).forEach(type => {
          if (wasteKeywords[type].some(keyword => 
            label.toLowerCase().includes(keyword.toLowerCase())
          )) {
            if (score > confidence) {
              wasteType = type;
              confidence = Math.round(score * 100);
            }
          }
        });
      }
    });

    return this.formatValidationResult(wasteType, confidence, detectedItems);
  }

  // Enhanced validation result formatting for Google Vision API
  formatEnhancedValidationResult(wasteType, confidence, detectedItems, analysis, reasons) {
    const isCorrect = wasteType !== 'Unknown' && confidence > 40; // Lower threshold for enhanced analysis
    
    const result = {
      isCorrect,
      wasteType: wasteType !== 'Unknown' ? wasteType : null,
      confidence,
      detectedItems,
      overallScore: confidence,
      aiSource: 'google_vision_enhanced',
      analysis, // Detailed breakdown of detections
      classificationReasons: reasons // Why this classification was chosen
    };

    if (isCorrect) {
      result.message = `Excellent! Google Vision identified this as ${wasteType} with ${confidence}% confidence.`;
      result.recommendedBin = this.getRecommendedBin(wasteType);
      result.tips = this.getWasteTips(wasteType);
      
      // Add detailed analysis for users
      if (analysis.objects?.length > 0) {
        result.detailedAnalysis = `Detected ${analysis.objects.length} object(s), ${analysis.labels?.length || 0} label(s)`;
      }
    } else {
      result.message = confidence > 0 
        ? `Partial classification as ${wasteType} (${confidence}% confidence). Please ensure clear image and proper lighting.`
        : 'Could not clearly identify the waste type. Please ensure good lighting and clear image.';
      
      result.issues = [{
        item: confidence > 0 ? 'Low confidence classification' : 'Unclear image',
        currentBin: 'Uncertain',
        correctBin: confidence > 0 ? this.getRecommendedBin(wasteType) : 'Please retake photo',
        reason: confidence > 0 
          ? 'Image quality or mixed waste types may be affecting accuracy'
          : 'Image may be unclear, too dark, or contain mixed waste types'
      }];
    }

    return result;
  }

  formatValidationResult(wasteType, confidence, detectedItems, reasons = []) {
    const isCorrect = wasteType !== 'Unknown' && confidence >= 30; // Lower threshold for better user experience
    
    const result = {
      isCorrect,
      wasteType: wasteType !== 'Unknown' ? wasteType : null,
      confidence,
      detectedItems,
      overallScore: confidence,
      aiSource: this.currentService,
      classificationReasons: reasons
    };

    if (isCorrect) {
      if (confidence >= 70) {
        result.message = `Excellent! This appears to be ${wasteType} with ${confidence}% confidence.`;
      } else if (confidence >= 50) {
        result.message = `Good classification! This appears to be ${wasteType} with ${confidence}% confidence.`;
      } else {
        result.message = `Possible ${wasteType} detected (${confidence}% confidence). Please verify the classification.`;
      }
      
      result.recommendedBin = this.getRecommendedBin(wasteType);
      result.tips = this.getWasteTips(wasteType);
      
      // Add context about what was detected
      if (detectedItems.length > 0) {
        result.detailedAnalysis = `Detected: ${detectedItems.slice(0, 3).join(', ')}${detectedItems.length > 3 ? ' and more' : ''}`;
      }
    } else {
      result.message = confidence > 0 
        ? `Partial detection (${confidence}% confidence). Please ensure clear image and proper lighting.`
        : 'Could not clearly identify the waste type. Please ensure good lighting and clear image.';
      
      result.issues = [{
        item: confidence > 0 ? 'Low confidence classification' : 'Image quality',
        currentBin: confidence > 0 ? `Possible ${wasteType}` : 'Unknown',
        correctBin: confidence > 0 ? this.getRecommendedBin(wasteType) : 'Please retake photo',
        reason: confidence > 0 
          ? 'Classification confidence is low - please verify manually'
          : 'Image may be unclear, too dark, or contain unrecognizable objects'
      }];
      
      // Enhanced tips for better image capture
      result.tips = [
        '📸 Take photo in good lighting (natural light works best)',
        '🔍 Get close to the waste item for better detail',
        '📱 Keep the camera steady to avoid blur',
        '🎯 Focus on one item at a time, not mixed waste',
        '🔄 Try different angles if first attempt fails',
        '💡 Avoid shadows and reflections on the item'
      ];
    }

    return result;
  }

  getRecommendedBin(wasteType) {
    const binMapping = {
      'Dry Waste': 'Blue bin (Dry waste)',
      'Wet Waste': 'Green bin (Wet waste)', 
      'Hazardous Waste': 'Red bin (Hazardous waste)'
    };
    return binMapping[wasteType] || 'Contact local authorities';
  }

  getWasteTips(wasteType) {
    const tips = {
      'Dry Waste': [
        'Clean containers before disposal',
        'Remove any food residue',
        'Separate different materials when possible'
      ],
      'Wet Waste': [
        'Compost organic waste if possible',
        'Drain excess liquid',
        'Use biodegradable bags'
      ],
      'Hazardous Waste': [
        'Never dispose in regular bins',
        'Contact e-waste collection centers',
        'Handle with care'
      ]
    };
    return tips[wasteType] || ['Follow local waste management guidelines'];
  }

  // Fallback when AI services fail
  fallbackClassification() {
    return {
      isCorrect: false,
      wasteType: null,
      confidence: 0,
      detectedItems: [],
      overallScore: 0,
      message: 'AI validation temporarily unavailable. Please try again later.',
      aiSource: 'offline',
      issues: [{
        item: 'Service unavailable',
        currentBin: 'Unknown',
        correctBin: 'Please retry',
        reason: 'AI classification service is temporarily offline'
      }]
    };
  }

  // Utility methods
  async convertImageToBase64(imageUri) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
        resolve(base64);
      };
      img.onerror = reject;
      img.src = imageUri;
    });
  }

  // Switch between AI services
  setAIService(service) {
    if (Object.values(AI_SERVICES).includes(service)) {
      this.currentService = service;
      console.log(`Switched to ${service} for AI validation`);
    }
  }

  // Get available services with their limits
  getAvailableServices() {
    return {
      [AI_SERVICES.TENSORFLOW_JS]: {
        name: 'TensorFlow.js',
        cost: 'Free',
        limit: 'Unlimited (browser-based)',
        accuracy: 'Good',
        speed: 'Fast'
      },
      [AI_SERVICES.HUGGING_FACE]: {
        name: 'Hugging Face',
        cost: 'Free',
        limit: '30,000 requests/month',
        accuracy: 'Very Good',
        speed: 'Medium'
      },
      [AI_SERVICES.ROBOFLOW]: {
        name: 'Roboflow',
        cost: 'Free',
        limit: '1,000 requests/month',
        accuracy: 'Excellent (if custom trained)',
        speed: 'Fast'
      },
      [AI_SERVICES.GOOGLE_VISION]: {
        name: 'Google Vision API',
        cost: 'Free',
        limit: '1,000 requests/month',
        accuracy: 'Excellent',
        speed: 'Fast'
      }
    };
  }
}

export default new AIWasteValidationService();