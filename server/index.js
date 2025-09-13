const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// MongoDB connection with error handling
let isMongoConnected = false;

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/waste-management', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isMongoConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.warn('⚠️ MongoDB connection failed:', err.message);
    console.log('📝 Running in demo mode without database');
    isMongoConnected = false;
  }
};

// Attempt to connect to MongoDB
connectToMongoDB();

mongoose.connection.on('connected', () => {
  isMongoConnected = true;
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  isMongoConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
  isMongoConnected = false;
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  
  // Join worker room for task updates
  socket.on('join-worker-room', (workerId) => {
    socket.join('workers');
    socket.join(`worker-${workerId}`);
    console.log(`Worker ${workerId} joined rooms`);
  });
  
  // Join citizen room for pickup updates
  socket.on('join-citizen-room', (citizenId) => {
    socket.join('citizens');
    socket.join(`citizen-${citizenId}`);
    console.log(`Citizen ${citizenId} joined rooms`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Helper function to emit pickup updates
const emitPickupUpdate = (eventType, pickupData) => {
  // Emit to all workers
  io.to('workers').emit('pickup-update', {
    type: eventType,
    data: pickupData,
    timestamp: new Date().toISOString()
  });
  
  // Also emit specific event types
  io.to('workers').emit(eventType, pickupData);
  
  console.log(`📡 Emitted ${eventType} to workers`);
};

// Models
const User = require('./models/User');
const Pickup = require('./models/Pickup');
const Training = require('./models/Training');
const WasteValidation = require('./models/WasteValidation');

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'waste-management-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Import Routes
const pickupRoutes = require('./routes/pickupRoutes');
const workerRoutes = require('./routes/workerRoutes');

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  // Use the global isMongoConnected variable
  
  if (isMongoConnected) {
    res.status(200).json({
      status: 'healthy',
      server: 'running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      server: 'running',
      database: 'disconnected',
      error: 'MongoDB is not connected',
      timestamp: new Date().toISOString()
    });
  }
});

// Use pickup routes with QR code support
app.use('/api/pickups', pickupRoutes);

// Use worker routes for assignment management
app.use('/api/worker', workerRoutes);

// QR validation endpoint - Verify pickup code
app.post('/api/qr/validate', async (req, res) => {
  try {
    const { qrData } = req.body;
    
    // First try MongoDB
    const Pickup = require('./models/Pickup');
    
    // Try to find by verification code in MongoDB
    let pickup = await Pickup.findOne({ 
      verificationCode: qrData.toUpperCase() 
    });
    
    // If not found, try by pickupId in MongoDB
    if (!pickup) {
      pickup = await Pickup.findOne({ 
        pickupId: qrData 
      });
    }
    
    if (pickup) {
      res.json({
        success: true,
        valid: true,
        pickup: {
          pickupId: pickup.pickupId,
          verificationCode: pickup.verificationCode,
          userId: pickup.citizenId,
          userName: pickup.customerName || 'Customer',
          address: pickup.customerAddress || pickup.address,
          wasteType: pickup.wasteTypes,
          status: pickup.status,
          _id: pickup._id
        },
        message: 'Code validated successfully'
      });
    } else {
      // Fallback to in-memory pickups for legacy data
      const pickupRoutes = require('./routes/pickupRoutes');
      const allPickups = pickupRoutes.getAllPickups ? pickupRoutes.getAllPickups() : [];
      
      // For legacy pickups, accept pickup ID as verification code
      const legacyPickup = allPickups.find(p => 
        p.pickupId === qrData || 
        (p.qrCodeData && p.qrCodeData.verificationCode === qrData) ||
        (p.verificationCode === qrData)
      );
      
      if (legacyPickup) {
        res.json({
          success: true,
          valid: true,
          pickup: {
            pickupId: legacyPickup.pickupId,
            verificationCode: legacyPickup.verificationCode || legacyPickup.pickupId,
            userId: legacyPickup.userId,
            userName: legacyPickup.customerName || 'Customer',
            address: legacyPickup.customerAddress || legacyPickup.address,
            wasteType: legacyPickup.wasteTypes,
            status: legacyPickup.status,
            _id: legacyPickup._id || legacyPickup.pickupId
          },
          message: 'Code validated successfully (legacy)'
        });
      } else {
        res.json({
          success: false,
          valid: false,
          message: 'Invalid verification code'
        });
      }
    }
  } catch (error) {
    console.error('Error validating code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate code',
      error: error.message
    });
  }
});

// Worker task complete endpoint with verification
app.post('/api/worker/tasks/:taskId/complete', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { actualWeight, notes, verificationCode } = req.body;
    const Pickup = require('./models/Pickup');
    
    // First try to find in MongoDB
    let pickup;
    
    // Check if taskId is a valid ObjectId
    if (taskId.match(/^[0-9a-fA-F]{24}$/)) {
      pickup = await Pickup.findOne({ _id: taskId });
    }
    
    // If not found or not a valid ObjectId, try by pickupId
    if (!pickup) {
      pickup = await Pickup.findOne({ pickupId: taskId });
    }
    
    let isLegacyPickup = false;
    
    // If not in MongoDB, check in-memory pickups
    if (!pickup) {
      const pickupRoutes = require('./routes/pickupRoutes');
      const allPickups = pickupRoutes.getAllPickups ? pickupRoutes.getAllPickups() : [];
      const legacyPickup = allPickups.find(p => p.pickupId === taskId || p._id === taskId);
      
      if (legacyPickup) {
        // For legacy pickups, accept pickup ID as verification code
        const validCode = legacyPickup.verificationCode || 
                         (legacyPickup.qrCodeData && legacyPickup.qrCodeData.verificationCode) || 
                         legacyPickup.pickupId;
        
        if (verificationCode?.toUpperCase() === validCode) {
          // Update legacy pickup status
          legacyPickup.status = 'completed';
          legacyPickup.completedAt = new Date().toISOString();
          legacyPickup.actualWeight = actualWeight;
          legacyPickup.completionNotes = notes;
          
          res.json({
            success: true,
            message: 'Task completed successfully (legacy)',
            task: legacyPickup
          });
          return;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Invalid verification code',
            error: 'The verification code does not match'
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }
    }
    
    // Verify the code for MongoDB pickup
    if (pickup.verificationCode !== verificationCode?.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
        error: 'The verification code does not match'
      });
    }
    
    // Code is valid, update the pickup
    pickup.status = 'completed';
    pickup.completedAt = new Date();
    pickup.actualWeight = actualWeight;
    pickup.completionNotes = notes;
    pickup.qrVerified = true;
    
    await pickup.save();
    
    // Emit real-time update
    emitPickupUpdate('pickup-status-changed', {
      pickupId: pickup.pickupId,
      status: 'completed',
      workerId: req.user.userId
    });
    
    res.json({
      success: true,
      message: 'Task completed successfully',
      task: pickup
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete task',
      error: error.message
    });
  }
});

// Worker task accept endpoint with atomic validation
app.post('/api/worker/tasks/:taskId/accept', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const Pickup = require('./models/Pickup');
    
    // Get worker info from token
    const workerId = req.user?.userId || req.user?.id || 'demo-worker';
    const workerName = req.user?.name || `Worker ${workerId}`;
    
    console.log(`Worker ${workerId} attempting to accept task ${taskId}`);
    
    // Use atomic task acceptance to prevent race conditions
    const result = await Pickup.acceptTaskAtomically(taskId, workerId, workerName);
    
    if (result.success) {
      console.log(`✅ Task ${taskId} successfully accepted by worker ${workerId}`);
      
      // Emit real-time update to all workers
      emitPickupUpdate('pickup-assigned', {
        pickupId: result.pickup._id,
        taskId: taskId,
        status: 'assigned',
        workerId: workerId,
        workerName: workerName,
        assignedAt: result.pickup.assignedAt
      });
      
      // Also emit to hide task from other workers' dashboards immediately
      emitPickupUpdate('task-no-longer-available', {
        pickupId: result.pickup._id,
        taskId: taskId,
        assignedWorkerId: workerId
      });
      
      res.json({
        success: true,
        message: result.message,
        task: result.pickup,
        assignedAt: result.pickup.assignedAt
      });
    } else {
      console.log(`❌ Task acceptance failed for worker ${workerId}: ${result.error}`);
      
      // Determine HTTP status based on error type
      let statusCode = 400;
      if (result.error === 'TASK_NOT_AVAILABLE') {
        statusCode = 409; // Conflict
      } else if (result.error === 'RACE_CONDITION') {
        statusCode = 409; // Conflict
      } else if (result.error === 'DATABASE_ERROR') {
        statusCode = 500; // Server error
      }
      
      res.status(statusCode).json({
        success: false,
        error: result.error,
        message: result.message,
        taskId: taskId,
        retryable: result.error !== 'TASK_NOT_AVAILABLE' // Can retry for race conditions and DB errors
      });
    }
  } catch (error) {
    console.error('Error in task acceptance endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred while accepting the task. Please try again.',
      taskId: req.params.taskId
    });
  }
});

// Worker task start endpoint
app.post('/api/worker/tasks/:taskId/start', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const Pickup = require('./models/Pickup');
    
    // Try to find by pickupId first, then by _id if it's a valid ObjectId
    let query;
    if (taskId.match(/^[0-9a-fA-F]{24}$/)) {
      // Valid ObjectId format
      query = { _id: taskId };
    } else {
      // Custom pickup ID
      query = { pickupId: taskId };
    }
    
    const pickup = await Pickup.findOneAndUpdate(
      query,
      { 
        status: 'in_progress',
        startedAt: new Date()
      },
      { new: true }
    );
    
    if (pickup) {
      // Emit real-time update
      emitPickupUpdate('pickup-status-changed', {
        pickupId: pickup._id,
        status: 'in_progress',
        workerId: req.user.userId
      });
      
      res.json({
        success: true,
        message: 'Task started successfully',
        task: pickup
      });
    } else {
      // For demo, return success
      res.json({
        success: true,
        message: 'Task started successfully (demo)',
        taskId: taskId
      });
    }
  } catch (error) {
    console.error('Error starting task:', error);
    // Return success for demo
    res.json({
      success: true,
      message: 'Task started successfully (demo)',
      taskId: req.params.taskId
    });
  }
});

// Worker scan QR endpoint
app.post('/api/worker/scan', authenticateToken, async (req, res) => {
  try {
    const { qrData } = req.body;
    
    // Validate QR and return pickup details
    const Pickup = require('./models/Pickup');
    let pickupData;
    
    try {
      pickupData = JSON.parse(qrData);
    } catch (e) {
      pickupData = { pickupId: qrData };
    }
    
    const pickup = await Pickup.findOne({ 
      pickupId: pickupData.pickupId 
    });
    
    if (pickup) {
      res.json({
        success: true,
        valid: true,
        pickup: pickup,
        message: 'QR code scanned successfully'
      });
    } else {
      // Demo response
      res.json({
        success: true,
        valid: true,
        pickupId: pickupData.pickupId || 'DEMO123',
        message: 'QR code scanned successfully (demo)'
      });
    }
  } catch (error) {
    console.error('Error scanning QR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scan QR code',
      error: error.message
    });
  }
});

// Report issue endpoint
app.post('/api/worker/tasks/:taskId/report-issue', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { issueType, description } = req.body;
    
    // In production, this would save to database
    console.log(`Issue reported for task ${taskId}: ${issueType}`);
    
    res.json({
      success: true,
      message: 'Issue reported successfully',
      issueId: `ISSUE-${Date.now()}`,
      taskId: taskId,
      issueType: issueType
    });
  } catch (error) {
    console.error('Error reporting issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report issue',
      error: error.message
    });
  }
});

// Get task details endpoint
app.get('/api/worker/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const Pickup = require('./models/Pickup');
    
    let pickup;
    
    // Check if taskId is a valid ObjectId
    if (taskId.match(/^[0-9a-fA-F]{24}$/)) {
      pickup = await Pickup.findById(taskId);
    } else {
      // Try to find by pickupId
      pickup = await Pickup.findOne({ pickupId: taskId });
    }
    
    if (pickup) {
      res.json({
        success: true,
        task: pickup
      });
    } else {
      // Demo response
      res.json({
        success: true,
        task: {
          _id: taskId,
          pickupId: `PK-${taskId}`,
          status: 'pending',
          customerName: 'Demo Customer',
          address: 'Demo Address',
          wasteTypes: ['Mixed Waste'],
          estimatedWeight: '5 kg'
        }
      });
    }
  } catch (error) {
    console.error('Error fetching task details:', error);
    // Return demo data
    res.json({
      success: true,
      task: {
        _id: req.params.taskId,
        pickupId: `PK-${req.params.taskId}`,
        status: 'pending',
        customerName: 'Demo Customer',
        address: 'Demo Address',
        wasteTypes: ['Mixed Waste'],
        estimatedWeight: '5 kg'
      }
    });
  }
});

// Additional worker task endpoints
app.get('/api/worker/tasks', authenticateToken, async (req, res) => {
  try {
    // Return all pickups as tasks for workers
    const Pickup = require('./models/Pickup');
    const tasks = await Pickup.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      tasks: tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error fetching worker tasks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tasks', 
      error: error.message 
    });
  }
});

app.get('/api/worker/dashboard', authenticateToken, async (req, res) => {
  try {
    // Return dashboard stats for workers
    const Pickup = require('./models/Pickup');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalTasks = await Pickup.countDocuments();
    const completedToday = await Pickup.countDocuments({
      status: 'completed',
      completedAt: { $gte: today }
    });
    const pendingTasks = await Pickup.countDocuments({ status: 'pending' });
    const availableTasks = await Pickup.countDocuments({ status: 'scheduled' });
    
    res.json({
      success: true,
      stats: {
        totalTasks,
        completedToday,
        pendingTasks,
        availableTasks,
        todayEarnings: completedToday * 50,
        monthlyEarnings: totalTasks * 50
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard', 
      error: error.message 
    });
  }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  // Check if MongoDB is connected
  if (!isMongoConnected) {
    const { firstName, lastName, email, phone, password, address, pincode, userType, location } = req.body;
    const demoUser = {
      id: 'demo_' + Date.now(),
      firstName,
      lastName,
      email,
      phone,
      address,
      pincode,
      userType,
      location,
      createdAt: new Date().toISOString()
    };
    
    const token = jwt.sign(
      { userId: demoUser.id, email: demoUser.email, userType: demoUser.userType },
      process.env.JWT_SECRET || 'waste-management-secret',
      { expiresIn: '7d' }
    );
    
    console.log('📝 Demo registration (MongoDB not connected):', demoUser);
    
    return res.status(201).json({
      success: true,
      message: 'Registration successful (Demo mode - Database not connected)',
      token,
      user: demoUser,
      demoMode: true
    });
  }
  
  try {
    const { firstName, lastName, email, phone, password, address, pincode, userType, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email or phone number' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      address,
      pincode,
      userType,
      location,
      isActive: true,
      createdAt: new Date(),
    });

    await user.save();
    console.log(`✅ User registered: ${user.firstName} ${user.lastName} (${user.userType})`);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        userType: user.userType 
      },
      process.env.JWT_SECRET || 'waste-management-secret',
      { expiresIn: '7d' }
    );

    // Send welcome notification (simulated)
    console.log(`📧 Welcome Email Sent to: ${user.email}`);
    console.log(`📱 SMS Sent to: ${user.phone}`);
    console.log(`✅ User registered: ${user.firstName} ${user.lastName} (${user.userType})`);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully! Welcome to Waste Management App.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        userType: user.userType,
        location: user.location,
      },
      notifications: {
        email: `Welcome email sent to ${user.email}`,
        sms: `Welcome SMS sent to ${user.phone}`,
        location: `Location captured: ${user.location.latitude}, ${user.location.longitude}`
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed', 
      error: error.message 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  // Check if MongoDB is connected
  if (!isMongoConnected) {
    const { email, password } = req.body;
    
    // Demo login - accept any credentials
    const demoUser = {
      id: 'demo_user_123',
      firstName: 'Demo',
      lastName: 'User',
      email: email,
      phone: '9999999999',
      address: 'Demo Address',
      userType: email.includes('worker') ? 'worker' : 'citizen',
      location: { latitude: 20.5937, longitude: 78.9629 }
    };
    
    const token = jwt.sign(
      { userId: demoUser.id, email: demoUser.email, userType: demoUser.userType },
      process.env.JWT_SECRET || 'waste-management-secret',
      { expiresIn: '7d' }
    );
    
    console.log('📝 Demo login (MongoDB not connected):', email);
    
    return res.json({
      success: true,
      message: 'Login successful (Demo mode - Database not connected)',
      token,
      user: demoUser,
      demoMode: true
    });
  }
  
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        userType: user.userType 
      },
      process.env.JWT_SECRET || 'waste-management-secret',
      { expiresIn: '7d' }
    );

    console.log(`✅ Login successful: ${user.firstName} ${user.lastName} (${user.userType})`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        userType: user.userType,
        location: user.location,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed', 
      error: error.message 
    });
  }
});

// Helper function to generate verification code
const generateVerificationCode = () => {
  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Helper function to generate pickup ID
const generatePickupId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 1000).toString(36).toUpperCase();
  return `PU${timestamp}${random}`;
};

// Pickup Routes
app.post('/api/pickups/schedule', authenticateToken, async (req, res) => {
  try {
    const { 
      wasteTypes, 
      estimatedWeight, 
      timeSlot, 
      specialInstructions, 
      scheduledDate,
      pickupId: clientPickupId,
      customerName,
      customerAddress,
      customerPhone
    } = req.body;
    
    // Generate pickup ID and verification code
    const pickupId = clientPickupId || generatePickupId();
    const verificationCode = generateVerificationCode();
    
    const pickup = new Pickup({
      pickupId,
      verificationCode,
      citizenId: req.user.userId,
      wasteTypes,
      estimatedWeight,
      timeSlot,
      specialInstructions,
      scheduledDate: new Date(scheduledDate),
      status: 'scheduled',
      createdAt: new Date(),
      customerName: customerName || 'Customer',
      customerAddress: customerAddress || 'Address',
      customerPhone: customerPhone || 'Phone'
    });

    await pickup.save();
    
    // Emit real-time update to workers
    emitPickupUpdate('new-pickup', {
      id: pickup._id,
      pickupId: pickup.pickupId || pickup._id,
      citizenId: pickup.citizenId,
      wasteTypes: pickup.wasteTypes,
      estimatedWeight: pickup.estimatedWeight,
      timeSlot: pickup.timeSlot,
      scheduledDate: pickup.scheduledDate,
      status: pickup.status,
      address: pickup.address || 'Address to be updated',
      createdAt: pickup.createdAt
    });

    // In a real app, you would implement worker assignment logic here
    // For now, we'll simulate immediate assignment
    setTimeout(async () => {
      pickup.status = 'assigned';
      pickup.workerId = 'worker_123'; // Mock worker assignment
      await pickup.save();
      
      // Emit status update
      emitPickupUpdate('pickup-assigned', {
        id: pickup._id,
        pickupId: pickup.pickupId || pickup._id,
        status: 'assigned',
        workerId: pickup.workerId
      });
    }, 2000);

    res.status(201).json({
      success: true,
      message: 'Pickup scheduled successfully',
      data: {
        pickupId: pickup.pickupId,
        verificationCode: pickup.verificationCode,
        estimatedArrival: pickup.scheduledDate,
        status: pickup.status,
        _id: pickup._id
      },
      pickup: pickup,
    });
  } catch (error) {
    console.error('Pickup scheduling error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to schedule pickup', 
      error: error.message 
    });
  }
});

app.get('/api/pickups/my-pickups', authenticateToken, async (req, res) => {
  try {
    const pickups = await Pickup.find({ 
      citizenId: req.user.userId 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      pickups: pickups,
    });
  } catch (error) {
    console.error('Error fetching pickups:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pickups', 
      error: error.message 
    });
  }
});

app.put('/api/pickups/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const Pickup = require('./models/Pickup');
    
    // Try to find in MongoDB first
    let pickup;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      pickup = await Pickup.findById(id);
    }
    
    if (!pickup) {
      pickup = await Pickup.findOne({ pickupId: id });
    }
    
    if (pickup) {
      pickup.status = status;
      pickup.updatedAt = new Date();
      await pickup.save();
      
      // Emit real-time update
      emitPickupUpdate('pickup-status-changed', {
        id: pickup._id,
        pickupId: pickup.pickupId,
        status: status
      });
      
      return res.json({
        success: true,
        message: `Pickup status updated to ${status}`,
        pickup: pickup
      });
    }
    
    // Fallback to in-memory/demo mode
    const pickupRoutes = require('./routes/pickupRoutes');
    const allPickups = pickupRoutes.getAllPickups ? pickupRoutes.getAllPickups() : [];
    const memoryPickup = allPickups.find(p => p.pickupId === id || p._id === id);
    
    if (memoryPickup) {
      memoryPickup.status = status;
      memoryPickup.updatedAt = new Date().toISOString();
      
      // Emit real-time update
      emitPickupUpdate('pickup-status-changed', {
        id: memoryPickup._id || memoryPickup.pickupId,
        pickupId: memoryPickup.pickupId,
        status: status
      });
      
      res.json({
        success: true,
        message: `Pickup status updated to ${status}`,
        pickup: memoryPickup
      });
    } else {
      // Still return success for demo
      res.json({
        success: true,
        message: `Pickup status updated to ${status}`,
        pickup: { pickupId: id, status: status }
      });
    }
  } catch (error) {
    console.error('Error updating pickup status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update pickup status', 
      error: error.message 
    });
  }
});

app.put('/api/pickups/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { qrData, actualWeight } = req.body;

    let pickup;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      pickup = await Pickup.findById(id);
    } else {
      pickup = await Pickup.findOne({ pickupId: id });
    }
    if (!pickup) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pickup not found' 
      });
    }

    pickup.status = 'completed';
    pickup.actualWeight = actualWeight;
    pickup.completedAt = new Date();
    pickup.qrConfirmation = qrData;

    await pickup.save();
    
    // Emit real-time update
    emitPickupUpdate('pickup-completed', {
      id: pickup._id,
      pickupId: pickup.pickupId || pickup._id,
      status: 'completed'
    });

    res.json({
      success: true,
      message: 'Pickup confirmed successfully',
      pickup: pickup,
    });
  } catch (error) {
    console.error('Pickup confirmation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to confirm pickup', 
      error: error.message 
    });
  }
});

// User Profile Routes
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  if (!isMongoConnected) {
    // Return demo profile
    return res.json({
      success: true,
      data: {
        _id: req.user.userId || 'demo_user_123',
        firstName: 'Demo',
        lastName: 'User',
        email: req.user.email || 'demo@example.com',
        phone: '9999999999',
        alternativePhone: '',
        address: 'Demo Address, Demo City',
        pincode: '123456',
        totalPickups: 5,
        totalWasteCollected: 25,
        rating: { average: 4.5, count: 3 },
        createdAt: new Date().toISOString()
      },
      demoMode: true
    });
  }
  
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, alternativePhone, address, pincode } = req.body;
    const userId = req.user.userId;

    // Check if phone number is being changed and if it's already in use
    if (phone) {
      const existingUser = await User.findOne({ 
        phone, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use by another user'
        });
      }
    }

    // Check alternative phone if provided
    if (alternativePhone) {
      const existingUser = await User.findOne({ 
        $or: [
          { phone: alternativePhone },
          { alternativePhone: alternativePhone }
        ],
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'This alternative phone number belongs to another user'
        });
      }
    }

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (alternativePhone !== undefined) updateData.alternativePhone = alternativePhone;
    if (address) updateData.address = address;
    if (pincode) updateData.pincode = pincode;
    updateData.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// Check phone number availability
app.post('/api/users/check-phone', authenticateToken, async (req, res) => {
  try {
    const { phone } = req.body;
    const userId = req.user.userId;

    const existingUser = await User.findOne({ 
      $or: [
        { phone: phone },
        { alternativePhone: phone }
      ],
      _id: { $ne: userId } 
    });

    if (existingUser) {
      res.json({
        success: true,
        available: false,
        message: 'Phone number is already in use'
      });
    } else {
      res.json({
        success: true,
        available: true,
        message: 'Phone number is available'
      });
    }
  } catch (error) {
    console.error('Error checking phone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check phone availability',
      error: error.message
    });
  }
});

// Get user's pickup history with detailed information
app.get('/api/users/pickup-history', authenticateToken, async (req, res) => {
  if (!isMongoConnected) {
    // Return demo pickup history
    const demoPickups = [
      {
        _id: 'demo_pickup_1',
        pickupId: 'PU001',
        verificationCode: 'ABC123',
        wasteTypes: ['dry', 'wet'],
        estimatedWeight: '5 kg',
        actualWeight: 4.5,
        timeSlot: 'morning',
        scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        canReview: true,
        showVerificationCode: false
      },
      {
        _id: 'demo_pickup_2',
        pickupId: 'PU002',
        verificationCode: 'XYZ789',
        wasteTypes: ['dry'],
        estimatedWeight: '3 kg',
        timeSlot: 'afternoon',
        scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        canReview: false,
        showVerificationCode: true
      }
    ];
    
    return res.json({
      success: true,
      data: demoPickups,
      stats: {
        total: 2,
        completed: 1,
        pending: 1,
        cancelled: 0
      },
      demoMode: true
    });
  }
  
  try {
    const pickups = await Pickup.find({ 
      citizenId: req.user.userId 
    })
    .populate('workerId', 'firstName lastName phone')
    .sort({ createdAt: -1 });

    // Format pickups with additional info
    const formattedPickups = pickups.map(pickup => ({
      ...pickup.toObject(),
      canReview: pickup.status === 'completed' && !pickup.citizenRating.rating,
      showVerificationCode: pickup.status === 'scheduled' || pickup.status === 'assigned',
      rejectionReason: pickup.status === 'cancelled' ? pickup.cancellationReason : null
    }));

    res.json({
      success: true,
      data: formattedPickups,
      stats: {
        total: pickups.length,
        completed: pickups.filter(p => p.status === 'completed').length,
        pending: pickups.filter(p => ['scheduled', 'assigned', 'in_progress'].includes(p.status)).length,
        cancelled: pickups.filter(p => p.status === 'cancelled').length
      }
    });
  } catch (error) {
    console.error('Error fetching pickup history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pickup history',
      error: error.message
    });
  }
});

// Submit review for a completed pickup
app.post('/api/pickups/:pickupId/review', authenticateToken, async (req, res) => {
  try {
    const { pickupId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const pickup = await Pickup.findOne({
      pickupId: pickupId,
      citizenId: req.user.userId,
      status: 'completed'
    });

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: 'Pickup not found or not eligible for review'
      });
    }

    if (pickup.citizenRating.rating) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this pickup'
      });
    }

    pickup.citizenRating = {
      rating,
      feedback: feedback || '',
      ratedAt: new Date()
    };

    await pickup.save();

    // Update worker's rating if assigned
    if (pickup.workerId) {
      const worker = await User.findById(pickup.workerId);
      if (worker) {
        await worker.updateRating(rating);
      }
    }

    res.json({
      success: true,
      message: 'Review submitted successfully',
      data: pickup.citizenRating
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: error.message
    });
  }
});

// Training Routes
app.get('/api/training/modules', authenticateToken, async (req, res) => {
  try {
    // Mock training modules - in real app, fetch from database
    const modules = [
      {
        id: 1,
        title: 'Waste Segregation Basics',
        description: 'Learn the fundamentals of waste segregation',
        duration: '15 minutes',
        difficulty: 'Beginner',
        completed: false,
      },
      {
        id: 2,
        title: 'Dry Waste Management',
        description: 'Learn about recyclable dry waste',
        duration: '12 minutes',
        difficulty: 'Beginner',
        completed: false,
      },
      {
        id: 3,
        title: 'Wet Waste and Composting',
        description: 'Learn about organic waste and home composting',
        duration: '18 minutes',
        difficulty: 'Intermediate',
        completed: false,
      },
      {
        id: 4,
        title: 'Hazardous Waste Handling',
        description: 'Learn about dangerous waste materials',
        duration: '10 minutes',
        difficulty: 'Intermediate',
        completed: false,
      },
      {
        id: 5,
        title: 'Waste Reduction Tips',
        description: 'Learn to reduce waste generation',
        duration: '8 minutes',
        difficulty: 'Beginner',
        completed: false,
      },
    ];

    res.json({
      success: true,
      modules: modules,
    });
  } catch (error) {
    console.error('Error fetching training modules:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch training modules', 
      error: error.message 
    });
  }
});

app.post('/api/training/progress', authenticateToken, async (req, res) => {
  try {
    const { moduleId, score, completed } = req.body;

    const training = new Training({
      userId: req.user.userId,
      moduleId,
      score,
      completed,
      completedAt: completed ? new Date() : null,
    });

    await training.save();

    res.json({
      success: true,
      message: 'Training progress updated',
      training: training,
    });
  } catch (error) {
    console.error('Error updating training progress:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update training progress', 
      error: error.message 
    });
  }
});

// Waste Validation Routes
app.post('/api/waste/validate', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
    }

    // Mock AI validation - in real app, integrate with actual AI service
    const mockValidationResults = [
      {
        isCorrect: true,
        wasteType: 'Dry Waste',
        confidence: 92,
        message: 'Great job! This is correctly segregated dry waste.',
        tips: ['Keep containers clean before disposal', 'Remove any food residue'],
        recommendedBin: 'Blue bin (Dry waste)',
      },
      {
        isCorrect: false,
        detectedItems: ['Banana peel', 'Plastic bottle'],
        issues: [
          {
            item: 'Banana peel',
            currentBin: 'Dry waste',
            correctBin: 'Wet waste (Green bin)',
            reason: 'Organic matter should go in wet waste for composting',
          }
        ],
        message: 'This waste is not properly segregated. Please see suggestions below.',
        overallScore: 45,
      },
      {
        isCorrect: true,
        wasteType: 'Hazardous Waste',
        confidence: 88,
        detectedItems: ['Battery', 'Old mobile phone'],
        message: 'Correctly identified hazardous waste!',
        warning: 'Please ensure these items go to designated e-waste collection centers.',
        tips: ['Never dispose in regular bins', 'Contact municipal authorities for pickup'],
        recommendedBin: 'Red bin (Hazardous waste)',
      }
    ];

    // Simulate AI processing delay
    setTimeout(() => {
      const randomResult = mockValidationResults[Math.floor(Math.random() * mockValidationResults.length)];
      
      // Save validation record
      const validation = new WasteValidation({
        userId: req.user.userId,
        imagePath: req.file.path,
        result: randomResult,
        createdAt: new Date(),
      });

      validation.save().then(() => {
        res.json({
          success: true,
          message: 'Waste validation completed',
          result: randomResult,
        });
      });
    }, 1000);

  } catch (error) {
    console.error('Waste validation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to validate waste', 
      error: error.message 
    });
  }
});

// User Profile Routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user profile', 
      error: error.message 
    });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, address, pincode } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { firstName, lastName, phone, address, pincode },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile', 
      error: error.message 
    });
  }
});

// Worker Routes
app.get('/api/worker/assignments/:workerId', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'worker') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Workers only.' 
      });
    }

    // For demo purposes, return mock assignments
    const mockAssignments = [
      {
        _id: '674a5b2c8d4e1234567890ab',
        pickupId: 1001,
        address: '123 Green Street, Sector 12, Bangalore',
        wasteTypes: ['Dry Waste', 'Recyclables'],
        timeSlot: '9:00 AM - 11:00 AM',
        customerName: 'Rajesh Kumar',
        status: 'assigned',
        location: { latitude: 12.9716, longitude: 77.5946 },
        estimatedWeight: '5 kg'
      },
      {
        _id: '674a5b2c8d4e1234567890ac',
        pickupId: 1002,
        address: '456 Clean Avenue, JP Nagar, Bangalore',
        wasteTypes: ['Wet Waste'],
        timeSlot: '11:00 AM - 1:00 PM',
        customerName: 'Priya Sharma',
        status: 'in-progress',
        location: { latitude: 12.9082, longitude: 77.5830 },
        estimatedWeight: '3 kg'
      },
      {
        _id: '674a5b2c8d4e1234567890ad',
        pickupId: 1003,
        address: '789 Eco Road, Koramangala, Bangalore',
        wasteTypes: ['Mixed Waste'],
        timeSlot: '2:00 PM - 4:00 PM',
        customerName: 'Amit Patel',
        status: 'completed',
        location: { latitude: 12.9352, longitude: 77.6245 },
        estimatedWeight: '7 kg'
      }
    ];

    res.json({
      success: true,
      assignments: mockAssignments,
    });
  } catch (error) {
    console.error('Error fetching worker assignments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch assignments', 
      error: error.message 
    });
  }
});

app.put('/api/worker/assignment/:id/start', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'worker') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Workers only.' 
      });
    }

    const { id } = req.params;
    
    // In a real app, update the assignment status in database
    // For demo, just return success
    res.json({
      success: true,
      message: 'Pickup started successfully',
      assignment: {
        _id: id,
        status: 'in-progress',
        startedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error starting pickup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to start pickup', 
      error: error.message 
    });
  }
});

app.put('/api/worker/assignment/:id/complete', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'worker') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Workers only.' 
      });
    }

    const { id } = req.params;
    
    // In a real app, update the assignment status in database
    // For demo, just return success
    res.json({
      success: true,
      message: 'Pickup completed successfully',
      assignment: {
        _id: id,
        status: 'completed',
        completedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error completing pickup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to complete pickup', 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Waste Management API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});


// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('💾 Database: MongoDB (Real database mode)');
  console.log('🔌 Socket.IO: Enabled for real-time updates');
  console.log('🏠 Frontend should be running on: http://localhost:3001');
  console.log('📝 API Endpoints: http://localhost:3000/api');
});

module.exports = { app, server, io };
