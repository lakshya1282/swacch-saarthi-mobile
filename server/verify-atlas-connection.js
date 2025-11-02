const mongoose = require('mongoose');
require('dotenv').config();

console.log('═══════════════════════════════════════════════════════');
console.log('  MongoDB Connection Verification');
console.log('═══════════════════════════════════════════════════════\n');

const connectionString = process.env.MONGODB_URI;

console.log('📋 Configuration Check:');
console.log('─────────────────────────────────────────────────────');
console.log('Connection String from .env:', connectionString ? '✅ Found' : '❌ Not Found');

if (connectionString) {
  // Parse connection type
  if (connectionString.startsWith('mongodb+srv://')) {
    console.log('Connection Type: ✅ MongoDB ATLAS (Cloud) - using SRV connection');
  } else if (connectionString.startsWith('mongodb://localhost')) {
    console.log('Connection Type: ❌ LOCAL MongoDB - NOT Atlas!');
  } else if (connectionString.startsWith('mongodb://')) {
    console.log('Connection Type: ⚠️  Standard MongoDB connection');
  }
  
  // Extract details
  const urlMatch = connectionString.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)/);
  if (urlMatch) {
    console.log('\n🔐 Connection Details:');
    console.log('─────────────────────────────────────────────────────');
    console.log('Username:', urlMatch[1]);
    console.log('Password:', '*'.repeat(urlMatch[2].length));
    console.log('Cluster Host:', urlMatch[3]);
    
    // Check if it's the Atlas cluster
    if (urlMatch[3].includes('swachh-saarthi.tebgbwf.mongodb.net')) {
      console.log('\n✅ This IS your MongoDB Atlas cluster: Swachh-Saarthi');
    } else {
      console.log('\n❌ This is NOT your MongoDB Atlas cluster!');
    }
  }
  
  // Extract database name
  const dbMatch = connectionString.match(/mongodb\+srv:\/\/[^/]+\/([^?]+)/);
  if (dbMatch && dbMatch[1]) {
    console.log('Database Name:', dbMatch[1]);
  }
}

console.log('\n🔄 Attempting Connection...');
console.log('─────────────────────────────────────────────────────\n');

const connectDB = async () => {
  try {
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    const connection = mongoose.connection;
    
    console.log('✅ CONNECTION SUCCESSFUL!\n');
    console.log('📊 Live Connection Information:');
    console.log('─────────────────────────────────────────────────────');
    console.log('Host:', connection.host);
    console.log('Port:', connection.port);
    console.log('Database Name:', connection.name);
    console.log('Connection State:', connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected');
    
    // Determine if it's Atlas
    console.log('\n🌐 Connection Type Analysis:');
    console.log('─────────────────────────────────────────────────────');
    if (connection.host && connection.host.includes('mongodb.net')) {
      console.log('✅✅✅ CONFIRMED: Connected to MongoDB ATLAS (Cloud Database)');
      console.log('✅ Cluster: Swachh-Saarthi');
      console.log('✅ This is NOT a local MongoDB instance!');
    } else if (connection.host === 'localhost' || connection.host === '127.0.0.1') {
      console.log('❌ WARNING: Connected to LOCAL MongoDB');
      console.log('❌ This is NOT MongoDB Atlas!');
    } else {
      console.log('⚠️  Connected to:', connection.host);
    }
    
    // Test write operation
    console.log('\n🧪 Testing Database Operations...');
    console.log('─────────────────────────────────────────────────────');
    const TestSchema = new mongoose.Schema({ 
      message: String, 
      timestamp: Date,
      connectionType: String 
    });
    const TestModel = mongoose.model('AtlasConnectionTest', TestSchema);
    
    const testDoc = new TestModel({ 
      message: 'Successfully connected to MongoDB Atlas!',
      timestamp: new Date(),
      connectionType: 'MongoDB Atlas Cloud'
    });
    
    await testDoc.save();
    console.log('✅ Write test: SUCCESS');
    
    const retrieved = await TestModel.findOne({ message: 'Successfully connected to MongoDB Atlas!' });
    console.log('✅ Read test: SUCCESS');
    console.log('   Retrieved:', retrieved.message);
    
    await TestModel.deleteMany({});
    console.log('✅ Delete test: SUCCESS');
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  🎉 VERIFICATION COMPLETE: MongoDB Atlas is working!');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ CONNECTION FAILED!');
    console.error('─────────────────────────────────────────────────────');
    console.error('Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 This error suggests trying to connect to LOCAL MongoDB');
      console.error('   Make sure .env file has the Atlas connection string!');
    }
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

connectDB();
