/**
 * AI Service Switcher Utility
 * Easy way to switch and test different AI services
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = '.env';
const services = {
  'tensorflow': {
    name: 'TensorFlow.js',
    description: 'Free, unlimited, runs locally',
    cost: 'Free',
    limit: 'Unlimited',
    billing: 'Not required'
  },
  'google_vision': {
    name: 'Google Vision API',
    description: 'High accuracy with enhanced features',
    cost: 'Free tier: 1,000 requests/month',
    limit: '1,000/month (then $1.50/1000)',
    billing: 'Required (even for free tier)'
  },
  'huggingface': {
    name: 'Hugging Face',
    description: 'Good accuracy with specialized models',
    cost: 'Free tier: 30,000 requests/month',
    limit: '30,000/month',
    billing: 'Not required'
  },
  'roboflow': {
    name: 'Roboflow',
    description: 'Custom training possible',
    cost: 'Free tier: 1,000 requests/month',
    limit: '1,000/month',
    billing: 'Not required'
  }
};

function displayMenu() {
  console.log('\n🤖 AI Service Switcher for Waste Management App\n');
  console.log('Available AI Services:\n');
  
  Object.entries(services).forEach(([key, service], index) => {
    console.log(`${index + 1}. ${service.name} (${key})`);
    console.log(`   📝 ${service.description}`);
    console.log(`   💰 Cost: ${service.cost}`);
    console.log(`   📊 Limit: ${service.limit}`);
    console.log(`   💳 Billing: ${service.billing}`);
    console.log();
  });
}

function getCurrentService() {
  try {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const match = envContent.match(/REACT_APP_DEFAULT_AI_SERVICE=(.+)/);
    return match ? match[1].trim() : 'tensorflow';
  } catch (error) {
    console.log('⚠️  Could not read .env file. Using tensorflow as default.');
    return 'tensorflow';
  }
}

function switchService(newService) {
  try {
    let envContent = fs.readFileSync(ENV_FILE, 'utf8');
    
    // Update the default service line
    if (envContent.includes('REACT_APP_DEFAULT_AI_SERVICE=')) {
      envContent = envContent.replace(
        /REACT_APP_DEFAULT_AI_SERVICE=.+/,
        `REACT_APP_DEFAULT_AI_SERVICE=${newService}`
      );
    } else {
      envContent += `\nREACT_APP_DEFAULT_AI_SERVICE=${newService}\n`;
    }
    
    fs.writeFileSync(ENV_FILE, envContent);
    return true;
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    return false;
  }
}

async function testService(serviceName) {
  console.log(`\n🧪 Testing ${services[serviceName]?.name || serviceName}...`);
  
  try {
    // Set environment variable for testing
    process.env.REACT_APP_DEFAULT_AI_SERVICE = serviceName;
    process.env.REACT_APP_GOOGLE_VISION_API_KEY = 'AIzaSyBtEEXgvModOkBdt6ME06nOEAvHz3W5no0';
    
    // Test based on service type
    if (serviceName === 'google_vision') {
      console.log('📡 Testing Google Vision API...');
      // Use the existing test
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const test = spawn('node', ['test-google-vision.js'], { stdio: 'inherit' });
        test.on('close', (code) => {
          resolve(code === 0);
        });
      });
    } else if (serviceName === 'tensorflow') {
      console.log('✅ TensorFlow.js is ready (no API testing needed - runs locally)');
      console.log('💡 This service will work immediately in your React Native app');
      return true;
    } else {
      console.log(`⚠️  ${serviceName} testing not implemented in this utility`);
      console.log('💡 Service switching completed, test in your app');
      return true;
    }
  } catch (error) {
    console.error(`❌ Error testing ${serviceName}:`, error.message);
    return false;
  }
}

function showServiceStatus() {
  const currentService = getCurrentService();
  const service = services[currentService];
  
  console.log('\n📊 Current AI Service Status:\n');
  console.log(`🎯 Active Service: ${service?.name || currentService} (${currentService})`);
  
  if (service) {
    console.log(`📝 Description: ${service.description}`);
    console.log(`💰 Cost: ${service.cost}`);
    console.log(`📊 Limit: ${service.limit}`);
    console.log(`💳 Billing Required: ${service.billing}`);
  }
  
  // Show configuration status
  console.log('\n🔧 Configuration Status:');
  
  try {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    
    const hasGoogleKey = envContent.includes('REACT_APP_GOOGLE_VISION_API_KEY=AIzaSy');
    const hasHuggingFaceKey = envContent.includes('REACT_APP_HUGGINGFACE_TOKEN=') && 
                              !envContent.includes('your_huggingface_token_here');
    const hasRoboflowKey = envContent.includes('REACT_APP_ROBOFLOW_API_KEY=') && 
                           !envContent.includes('your_roboflow_api_key_here');
    
    console.log(`   Google Vision API: ${hasGoogleKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Hugging Face: ${hasHuggingFaceKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Roboflow: ${hasRoboflowKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log('   TensorFlow.js: ✅ Always ready (no config needed)');
  } catch (error) {
    console.log('   ❌ Could not read configuration');
  }
  
  // Service-specific warnings
  if (currentService === 'google_vision') {
    console.log('\n⚠️  Google Vision API requires billing to be enabled');
    console.log('   👉 Enable at: https://console.developers.google.com/billing/enable?project=140805328611');
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showServiceStatus();
    displayMenu();
    console.log('Usage Examples:');
    console.log('   node switch-ai-service.js tensorflow     # Switch to TensorFlow.js');
    console.log('   node switch-ai-service.js google_vision  # Switch to Google Vision API');
    console.log('   node switch-ai-service.js status         # Show current status');
    console.log('   node switch-ai-service.js test           # Test current service');
    return;
  }
  
  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'status':
      showServiceStatus();
      break;
      
    case 'test':
      const currentService = getCurrentService();
      const success = await testService(currentService);
      console.log(success ? '\n✅ Service test completed' : '\n❌ Service test failed');
      break;
      
    case 'tensorflow':
    case 'google_vision':
    case 'huggingface':
    case 'roboflow':
      const oldService = getCurrentService();
      console.log(`\n🔄 Switching from ${services[oldService]?.name || oldService} to ${services[command].name}...`);
      
      if (switchService(command)) {
        console.log(`✅ Successfully switched to ${services[command].name}!`);
        console.log(`📝 Updated REACT_APP_DEFAULT_AI_SERVICE=${command} in .env file`);
        
        // Show specific guidance for the service
        if (command === 'google_vision') {
          console.log('\n⚠️  Next Steps for Google Vision API:');
          console.log('   1. Enable billing: https://console.developers.google.com/billing/enable?project=140805328611');
          console.log('   2. Wait 2-3 minutes for changes to propagate');
          console.log('   3. Test with: node switch-ai-service.js test');
        } else if (command === 'tensorflow') {
          console.log('\n✅ TensorFlow.js is ready to use immediately!');
          console.log('   • Runs locally in your React Native app');
          console.log('   • No API keys or billing required');
          console.log('   • Unlimited free usage');
        }
        
        console.log('\n💡 Restart your React Native app to use the new service');
      } else {
        console.log('❌ Failed to switch service');
      }
      break;
      
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Available commands: tensorflow, google_vision, huggingface, roboflow, status, test');
  }
}

main().catch(console.error);