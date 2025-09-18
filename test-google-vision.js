/**
 * Test Google Vision API Integration
 * Run this script to verify your Google Vision API setup
 */

// Mock environment for testing
process.env.REACT_APP_GOOGLE_VISION_API_KEY = 'AIzaSyBtEEXgvModOkBdt6ME06nOEAvHz3W5no0'; // Your actual API key

/**
 * Test Google Vision API with a sample image URL
 */
async function testGoogleVisionAPI() {
  console.log('🧪 Testing Google Vision API Integration...\n');

  // Test image URL (public waste image for testing)
  const testImageUrl = 'https://images.unsplash.com/photo-1581612129628-ad32bd0ca2ff?w=400'; // Plastic bottles

  const API_KEY = process.env.REACT_APP_GOOGLE_VISION_API_KEY;
  const API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`;

  if (API_KEY === 'your_google_vision_api_key_here') {
    console.error('❌ ERROR: Please add your actual Google Vision API key to the script!');
    console.log('📝 Edit this file and replace "your_google_vision_api_key_here" with your API key');
    return;
  }

  try {
    console.log('📡 Making request to Google Vision API...');
    
    // Convert image URL to base64 (for demonstration - in real app you'd handle file uploads)
    const response = await fetch(testImageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    const requestBody = {
      requests: [{
        image: { content: base64Image },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
        ]
      }]
    };

    const visionResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const result = await visionResponse.json();
    
    if (visionResponse.ok) {
      console.log('✅ Google Vision API connection successful!\n');
      
      // Process labels
      const labels = result.responses[0]?.labelAnnotations || [];
      console.log('🏷️  Detected Labels:');
      labels.forEach((label, index) => {
        console.log(`   ${index + 1}. ${label.description} (${Math.round(label.score * 100)}% confidence)`);
      });

      // Process objects
      const objects = result.responses[0]?.localizedObjectAnnotations || [];
      console.log('\n📦 Detected Objects:');
      objects.forEach((obj, index) => {
        console.log(`   ${index + 1}. ${obj.name} (${Math.round(obj.score * 100)}% confidence)`);
      });

      // Simulate waste classification
      console.log('\n♻️  Waste Classification Analysis:');
      const wasteKeywords = {
        'Dry Waste': ['bottle', 'plastic', 'paper', 'cardboard', 'metal', 'can', 'glass'],
        'Wet Waste': ['food', 'fruit', 'vegetable', 'organic'],
        'Hazardous Waste': ['battery', 'electronic', 'chemical']
      };

      let detectedWasteType = 'Unknown';
      let maxConfidence = 0;

      [...labels, ...objects].forEach(item => {
        const itemName = item.description || item.name || '';
        const confidence = item.score || 0;

        Object.keys(wasteKeywords).forEach(wasteType => {
          if (wasteKeywords[wasteType].some(keyword => 
            itemName.toLowerCase().includes(keyword.toLowerCase())
          )) {
            if (confidence > maxConfidence) {
              detectedWasteType = wasteType;
              maxConfidence = confidence;
            }
          }
        });
      });

      if (detectedWasteType !== 'Unknown') {
        console.log(`   ✅ Classification: ${detectedWasteType}`);
        console.log(`   📊 Confidence: ${Math.round(maxConfidence * 100)}%`);
        console.log(`   🗂️  Recommended Bin: ${getBinRecommendation(detectedWasteType)}`);
      } else {
        console.log('   ⚠️  Could not classify waste type from detected objects');
      }

    } else {
      console.error('❌ Google Vision API Error:', result.error);
      if (result.error?.code === 400) {
        console.log('💡 This might be an API key issue. Please check:');
        console.log('   1. API key is correct');
        console.log('   2. Vision API is enabled in Google Cloud Console');
        console.log('   3. API key has proper permissions');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify your Google Vision API key');
    console.log('   3. Ensure Vision API is enabled in Google Cloud Console');
  }
}

function getBinRecommendation(wasteType) {
  const binMapping = {
    'Dry Waste': 'Blue bin (Dry waste)',
    'Wet Waste': 'Green bin (Wet waste)', 
    'Hazardous Waste': 'Red bin (Hazardous waste)'
  };
  return binMapping[wasteType] || 'Contact local authorities';
}

// Run the test
testGoogleVisionAPI();