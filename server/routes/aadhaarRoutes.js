const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token is missing' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    req.user = user;
    next();
  });
};

// Validate Aadhaar number format
const validateAadhaar = (aadhaarNumber) => {
  // Remove spaces and hyphens
  const cleaned = aadhaarNumber.replace(/[\s-]/g, '');
  
  // Check if it's exactly 12 digits
  if (!/^[2-9]{1}[0-9]{11}$/.test(cleaned)) {
    return false;
  }
  
  // Verhoeff algorithm for Aadhaar validation (simplified version)
  // In production, you would use the actual UIDAI API
  return true;
};

// POST /api/aadhaar/verify-number
// Initial Aadhaar number verification
router.post('/verify-number', async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;

    if (!aadhaarNumber) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number is required'
      });
    }

    // Clean and validate Aadhaar number
    const cleanedAadhaar = aadhaarNumber.replace(/[\s-]/g, '');
    
    if (!validateAadhaar(cleanedAadhaar)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number format'
      });
    }

    // Check if Aadhaar is already registered
    const existingWorker = await Worker.findOne({ 
      'aadhaarDetails.aadhaarNumber': cleanedAadhaar 
    });

    if (existingWorker) {
      return res.status(409).json({
        success: false,
        message: 'This Aadhaar number is already registered',
        alreadyRegistered: true
      });
    }

    // In production, this would call UIDAI API to verify Aadhaar
    // For demo, we'll simulate the verification
    res.json({
      success: true,
      message: 'Aadhaar number is valid and not registered',
      aadhaarNumber: cleanedAadhaar,
      masked: `XXXX-XXXX-${cleanedAadhaar.slice(-4)}`
    });

  } catch (error) {
    console.error('Aadhaar verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying Aadhaar number'
    });
  }
});

// POST /api/aadhaar/register-worker
// Complete worker registration with Aadhaar
router.post('/register-worker', async (req, res) => {
  try {
    const {
      aadhaarNumber,
      nameAsPerAadhaar,
      dateOfBirth,
      gender,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      phone,
      email,
      password,
      employeeId,
      vehicleType,
      vehicleRegistrationNumber,
      licenseNumber,
      licenseType,
      licenseExpiryDate,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship
    } = req.body;

    // Validate required fields
    if (!aadhaarNumber || !nameAsPerAadhaar || !dateOfBirth || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Clean Aadhaar number
    const cleanedAadhaar = aadhaarNumber.replace(/[\s-]/g, '');

    // Check if Aadhaar already exists
    const existingWorker = await Worker.findOne({ 
      'aadhaarDetails.aadhaarNumber': cleanedAadhaar 
    });

    if (existingWorker) {
      return res.status(409).json({
        success: false,
        message: 'Worker with this Aadhaar already exists'
      });
    }

    // Check if phone/email already exists
    const existingPhone = await Worker.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    if (email) {
      const existingEmail = await Worker.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Parse name
    const nameParts = nameAsPerAadhaar.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    // Create new worker with Aadhaar details
    const newWorker = new Worker({
      firstName,
      lastName,
      email: email || `${cleanedAadhaar}@aadhaar.gov.in`, // Default email if not provided
      phone,
      password: hashedPassword,
      employeeId: employeeId || `WRK${cleanedAadhaar.slice(-6)}`,
      
      // Aadhaar details
      aadhaarDetails: {
        aadhaarNumber: cleanedAadhaar,
        nameAsPerAadhaar,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        addressAsPerAadhaar: {
          line1: addressLine1,
          line2: addressLine2 || '',
          city,
          state,
          pincode
        },
        verificationStatus: 'pending'
      },

      // Default work configuration
      status: 'OFF_DUTY',
      zoneIds: [],
      primaryZoneId: null,
      capacityKg: 500, // Default capacity
      currentLoadKg: 0,
      
      // Base location (can be updated later)
      baseLocation: {
        type: 'Point',
        coordinates: [77.2090, 28.6139] // Default Delhi coordinates
      },

      // Vehicle information
      vehicle: {
        type: vehicleType || 'bicycle',
        registrationNumber: vehicleRegistrationNumber || `TEMP${Date.now()}`,
        model: 'Standard',
        year: new Date().getFullYear()
      },

      // License information
      license: {
        number: licenseNumber || `DL${cleanedAadhaar.slice(-8)}`,
        type: licenseType || 'light_motor_vehicle',
        expiryDate: licenseExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },

      // Work schedule
      workSchedule: {
        shiftType: 'morning',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        startTime: '06:00',
        endTime: '14:00'
      },

      // Emergency contact
      emergencyContact: {
        name: emergencyContactName || nameAsPerAadhaar,
        phone: emergencyContactPhone || phone,
        relationship: emergencyContactRelationship || 'Self'
      },

      isActive: false, // Will be activated after OTP verification
      isVerified: false
    });

    // Save worker
    await newWorker.save();

    // Also create entry in User collection for backward compatibility
    const newUser = new User({
      firstName,
      lastName,
      email: email || `${cleanedAadhaar}@aadhaar.gov.in`,
      phone,
      alternativePhone: emergencyContactPhone,
      password: hashedPassword,
      address: `${addressLine1}, ${addressLine2 || ''}, ${city}, ${state}`,
      pincode,
      userType: 'worker',
      location: {
        latitude: 28.6139,
        longitude: 77.2090
      },
      workerId: newWorker.employeeId,
      vehicleType: vehicleType || 'bicycle',
      licenseNumber: licenseNumber || `DL${cleanedAadhaar.slice(-8)}`,
      isActive: false,
      isVerified: false
    });

    await newUser.save();

    // Generate OTP for verification
    const { otp } = newWorker.generateAadhaarOTP();
    await newWorker.save();

    // In production, send OTP via SMS to registered mobile
    console.log(`OTP for ${phone}: ${otp}`);

    res.status(201).json({
      success: true,
      message: 'Worker registered successfully. Please verify with OTP',
      data: {
        workerId: newWorker._id,
        employeeId: newWorker.employeeId,
        maskedAadhaar: newWorker.aadhaarDetails.maskedAadhaar,
        phone,
        verificationStatus: 'otp_sent',
        // For demo purposes, include OTP in response
        demoOTP: otp
      }
    });

  } catch (error) {
    console.error('Worker registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error registering worker'
    });
  }
});

// POST /api/aadhaar/verify-otp
// Verify OTP for Aadhaar authentication
router.post('/verify-otp', async (req, res) => {
  try {
    const { workerId, otp } = req.body;

    if (!workerId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID and OTP are required'
      });
    }

    // Find worker with OTP fields
    const worker = await Worker.findById(workerId).select('+aadhaarDetails.verificationOTP');
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Verify OTP
    try {
      await worker.verifyAadhaarOTP(otp);
      
      // Update User collection as well
      await User.findOneAndUpdate(
        { workerId: worker.employeeId },
        { 
          isVerified: true,
          isActive: true
        }
      );

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: worker._id,
          employeeId: worker.employeeId,
          userType: 'worker',
          aadhaarVerified: true
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        message: 'Aadhaar verified successfully',
        data: {
          token,
          worker: {
            id: worker._id,
            employeeId: worker.employeeId,
            name: worker.fullName,
            phone: worker.phone,
            aadhaarVerified: true,
            verificationStatus: worker.aadhaarDetails.verificationStatus
          }
        }
      });

    } catch (verifyError) {
      res.status(400).json({
        success: false,
        message: verifyError.message
      });
    }

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP'
    });
  }
});

// POST /api/aadhaar/resend-otp
// Resend OTP for verification
router.post('/resend-otp', async (req, res) => {
  try {
    const { workerId } = req.body;

    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }

    const worker = await Worker.findById(workerId);
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Check if max attempts reached
    if (worker.aadhaarDetails.verificationAttempts >= 3) {
      return res.status(403).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please contact support.'
      });
    }

    // Check if worker is already verified
    if (worker.aadhaarDetails.verificationStatus === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Worker is already verified'
      });
    }

    // Generate new OTP
    const { otp } = worker.generateAadhaarOTP();
    await worker.save();

    // In production, send OTP via SMS
    console.log(`New OTP for ${worker.phone}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone: worker.phone,
        attemptsRemaining: 3 - worker.aadhaarDetails.verificationAttempts,
        // For demo purposes
        demoOTP: otp
      }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending OTP'
    });
  }
});

// GET /api/aadhaar/verification-status/:workerId
// Get verification status
router.get('/verification-status/:workerId', authenticateToken, async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findById(workerId).select(
      'aadhaarDetails.maskedAadhaar aadhaarDetails.verificationStatus aadhaarDetails.verifiedAt aadhaarDetails.verificationAttempts'
    );
    
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    res.json({
      success: true,
      data: {
        maskedAadhaar: worker.aadhaarDetails.maskedAadhaar,
        verificationStatus: worker.aadhaarDetails.verificationStatus,
        verifiedAt: worker.aadhaarDetails.verifiedAt,
        attemptsUsed: worker.aadhaarDetails.verificationAttempts,
        attemptsRemaining: 3 - worker.aadhaarDetails.verificationAttempts
      }
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching verification status'
    });
  }
});

// POST /api/aadhaar/login
// Aadhaar-based login for workers
router.post('/login', async (req, res) => {
  try {
    const { aadhaarNumber, password } = req.body;

    if (!aadhaarNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number and password are required'
      });
    }

    // Clean Aadhaar number
    const cleanedAadhaar = aadhaarNumber.replace(/[\s-]/g, '');

    // Find worker by Aadhaar (need to explicitly select password and aadhaarNumber)
    const worker = await Worker.findOne({ 
      'aadhaarDetails.aadhaarNumber': cleanedAadhaar 
    }).select('+password +aadhaarDetails.aadhaarNumber');
    
    if (!worker) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Aadhaar number or password'
      });
    }

    // Check if worker is verified
    if (worker.aadhaarDetails.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'Aadhaar verification pending',
        verificationStatus: worker.aadhaarDetails.verificationStatus,
        workerId: worker._id
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, worker.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Aadhaar number or password'
      });
    }

    // Update last active
    worker.lastActiveAt = new Date();
    await worker.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: worker._id,
        employeeId: worker.employeeId,
        userType: 'worker',
        aadhaarVerified: true
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // Remove password from response
    const workerData = worker.toJSON();
    delete workerData.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        worker: workerData,
        userType: 'worker'
      }
    });

  } catch (error) {
    console.error('Aadhaar login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

module.exports = router;