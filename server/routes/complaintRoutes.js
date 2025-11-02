const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Pickup = require('../models/Pickup');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/complaints/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'complaint-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Authentication middleware (simplified - you may have a different one)
const authenticateToken = (req, res, next) => {
  // If you have JWT authentication, use it here
  // For now, we'll allow requests but log warnings
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.warn('No authentication token provided');
  }
  next();
};

// Helper function to get user from token or request
const getUserFromRequest = async (req) => {
  try {
    const userId = req.user?.userId || req.body.citizenId;
    if (userId) {
      return await User.findById(userId);
    }
    return null;
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
};

// Submit a new complaint
router.post('/submit', upload.array('images', 5), async (req, res) => {
  try {
    console.log('📝 Complaint submission received');
    console.log('Body:', req.body);
    console.log('Files:', req.files?.length || 0);

    const {
      citizenId,
      citizenName,
      citizenEmail,
      citizenPhone,
      category,
      priority,
      subject,
      description,
      address,
      latitude,
      longitude,
      relatedPickupId,
      // Mobile app format
      pickupId,
      reason,
      customReason
    } = req.body;

    // Get user info if available
    let userInfo = null;
    if (citizenId) {
      try {
        userInfo = await User.findById(citizenId).select('firstName lastName email phone address location');
        if (!userInfo) {
          console.warn('User not found with ID:', citizenId);
        }
      } catch (err) {
        console.warn('Could not fetch user info:', err.message);
      }
    }

    // Lookup pickup to get its ObjectId if pickupId is provided
    let pickupObjectId = null;
    if (pickupId) {
      try {
        const pickup = await Pickup.findOne({ pickupId: pickupId });
        if (pickup) {
          pickupObjectId = pickup._id;
          console.log('✅ Found pickup:', pickupId, 'ObjectId:', pickupObjectId);
        } else {
          console.warn('⚠️ Pickup not found:', pickupId);
        }
      } catch (err) {
        console.warn('Error looking up pickup:', err.message);
      }
    }

    // Map mobile app format to server format
    const reasonToCategory = {
      // Original mappings
      'missed_pickup': 'Missed Pickup',
      'damaged_bin': 'Damaged Bin',
      'worker_behavior': 'Worker Behavior',
      'incomplete_collection': 'Improper Waste Collection',
      'schedule_change': 'Delayed Service',
      'others': 'Other',
      // Mobile app mappings
      'late': 'Delayed Service',
      'did_not_come': 'Missed Pickup',
      'late_pickup': 'Delayed Service'
    };

    // Use mobile app fields or web app fields
    const complaintCategory = category || reasonToCategory[reason] || 'Other';
    const complaintSubject = subject || (customReason ? customReason.substring(0, 200) : `Complaint regarding ${complaintCategory}`);
    const complaintDescription = description || customReason || 'No additional details provided';
    const complaintAddress = address || userInfo?.address || 'Address not provided';
    const complaintPriority = priority || 'Medium';

    // Validate required fields after mapping
    if (!citizenId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: citizenId'
      });
    }

    // Create complaint object
    const complaintData = {
      citizenId,
      citizenName: citizenName || (userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'Citizen'),
      citizenEmail: citizenEmail || userInfo?.email || '',
      citizenPhone: citizenPhone || userInfo?.phone || '',
      category: complaintCategory,
      priority: complaintPriority,
      subject: complaintSubject,
      description: complaintDescription,
      location: {
        address: complaintAddress,
        latitude: latitude ? parseFloat(latitude) : (userInfo?.location?.latitude || null),
        longitude: longitude ? parseFloat(longitude) : (userInfo?.location?.longitude || null)
      },
      images: req.files ? req.files.map(file => `/uploads/complaints/${file.filename}`) : [],
      status: 'Pending',
      isUrgent: complaintPriority === 'Urgent',
      timeline: [{
        status: 'Pending',
        notes: 'Complaint submitted',
        timestamp: new Date()
      }]
    };

    // Add pickup reference if provided (use ObjectId if found, otherwise use string ID)
    if (pickupObjectId) {
      complaintData.relatedPickupId = pickupObjectId;
    } else if (relatedPickupId) {
      complaintData.relatedPickupId = relatedPickupId;
    }

    const complaint = new Complaint(complaintData);
    await complaint.save();

    console.log('✅ Complaint saved:', complaint.complaintId);

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: complaint
    });

  } catch (error) {
    console.error('❌ Error submitting complaint:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
    // Send more specific error messages
    let errorMessage = 'Failed to submit complaint';
    if (error.name === 'ValidationError') {
      errorMessage = `Validation error: ${Object.values(error.errors).map(e => e.message).join(', ')}`;
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid data format provided';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: error.name === 'ValidationError' ? error.errors : undefined
    });
  }
});

// Get all complaints for a citizen
router.get('/citizen/:citizenId', async (req, res) => {
  try {
    const { citizenId } = req.params;
    console.log('📋 Fetching complaints for citizen:', citizenId);

    const complaints = await Complaint.find({ citizenId })
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName');

    console.log(`✅ Found ${complaints.length} complaints`);

    res.json({
      success: true,
      complaints: complaints, // Mobile app expects 'complaints' field
      data: complaints,
      count: complaints.length
    });

  } catch (error) {
    console.error('❌ Error fetching complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints',
      error: error.message
    });
  }
});

// Get all complaints (for admin/office)
router.get('/all', async (req, res) => {
  try {
    const { status, priority, category, limit = 50 } = req.query;
    
    console.log('📋 Fetching all complaints with filters:', { status, priority, category });

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('citizenId', 'firstName lastName email phone')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName');

    console.log(`✅ Found ${complaints.length} complaints`);

    res.json({
      success: true,
      data: complaints,
      count: complaints.length
    });

  } catch (error) {
    console.error('❌ Error fetching all complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints',
      error: error.message
    });
  }
});

// Get a specific complaint by ID
router.get('/:complaintId', async (req, res) => {
  try {
    const { complaintId } = req.params;
    console.log('📋 Fetching complaint:', complaintId);

    // Try to find by MongoDB _id or complaintId field
    let complaint = await Complaint.findById(complaintId)
      .populate('citizenId', 'firstName lastName email phone')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName');

    if (!complaint) {
      complaint = await Complaint.findOne({ complaintId })
        .populate('citizenId', 'firstName lastName email phone')
        .populate('assignedTo', 'firstName lastName')
        .populate('resolution.resolvedBy', 'firstName lastName');
    }

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    console.log('✅ Complaint found:', complaint.complaintId);

    res.json({
      success: true,
      data: complaint
    });

  } catch (error) {
    console.error('❌ Error fetching complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaint',
      error: error.message
    });
  }
});

// Update complaint status
router.put('/:complaintId/status', async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status, notes, assignedTo } = req.body;

    console.log('🔄 Updating complaint status:', complaintId, 'to', status);

    // Find complaint
    let complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      complaint = await Complaint.findOne({ complaintId });
    }

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Update status
    complaint.status = status;
    
    // Add to timeline
    complaint.timeline.push({
      status,
      notes: notes || `Status changed to ${status}`,
      timestamp: new Date()
    });

    // Handle assignment
    if (assignedTo) {
      complaint.assignedTo = assignedTo;
    }

    // Handle resolution
    if (status === 'Resolved' || status === 'Closed') {
      complaint.resolution = {
        resolvedAt: new Date(),
        resolutionNotes: notes || 'Complaint resolved'
      };
    }

    await complaint.save();

    console.log('✅ Complaint status updated');

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      data: complaint
    });

  } catch (error) {
    console.error('❌ Error updating complaint status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update complaint status',
      error: error.message
    });
  }
});

// Rate a resolved complaint
router.post('/:complaintId/rate', async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { score, feedback } = req.body;

    console.log('⭐ Rating complaint:', complaintId, 'Score:', score);

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating score must be between 1 and 5'
      });
    }

    let complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      complaint = await Complaint.findOne({ complaintId });
    }

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    if (complaint.status !== 'Resolved' && complaint.status !== 'Closed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate resolved or closed complaints'
      });
    }

    complaint.rating = {
      score,
      feedback: feedback || '',
      ratedAt: new Date()
    };

    await complaint.save();

    console.log('✅ Complaint rated successfully');

    res.json({
      success: true,
      message: 'Thank you for your feedback',
      data: complaint
    });

  } catch (error) {
    console.error('❌ Error rating complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate complaint',
      error: error.message
    });
  }
});

// Get complaint statistics
router.get('/stats/summary', async (req, res) => {
  try {
    console.log('📊 Fetching complaint statistics');

    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'Pending' });
    const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
    const resolved = await Complaint.countDocuments({ status: 'Resolved' });
    const closed = await Complaint.countDocuments({ status: 'Closed' });

    const stats = {
      total,
      pending,
      inProgress,
      resolved,
      closed,
      byCategory: await Complaint.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      byPriority: await Complaint.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching complaint stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaint statistics',
      error: error.message
    });
  }
});

module.exports = router;
