import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowRight 
} from 'lucide-react';
import './OfficeRegistration.css';

const OfficeRegistration = ({ onRegistrationSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation schemas for each step
  const step1ValidationSchema = Yup.object({
    officeName: Yup.string()
      .min(3, 'Office name must be at least 3 characters')
      .max(100, 'Office name must be less than 100 characters')
      .required('Office name is required'),
    officeCode: Yup.string()
      .matches(/^[A-Z0-9]{3,10}$/, 'Office code must be 3-10 uppercase letters/numbers')
      .required('Office code is required'),
    street: Yup.string().required('Street address is required'),
    city: Yup.string().required('City is required'),
    state: Yup.string().required('State is required'),
    pincode: Yup.string()
      .matches(/^[0-9]{6}$/, 'Pincode must be 6 digits')
      .required('Pincode is required'),
    latitude: Yup.number()
      .min(-90, 'Invalid latitude')
      .max(90, 'Invalid latitude')
      .required('Latitude is required'),
    longitude: Yup.number()
      .min(-180, 'Invalid longitude')
      .max(180, 'Invalid longitude')
      .required('Longitude is required')
  });

  const step2ValidationSchema = Yup.object({
    phone: Yup.string()
      .matches(/^[0-9]{10}$/, 'Phone must be 10 digits')
      .required('Phone is required'),
    email: Yup.string()
      .email('Invalid email format')
      .required('Email is required'),
    website: Yup.string().url('Invalid website URL'),
    coverageRadius: Yup.number()
      .min(1, 'Coverage radius must be at least 1 km')
      .max(50, 'Coverage radius cannot exceed 50 km')
      .required('Coverage radius is required'),
    startTime: Yup.string().required('Start time is required'),
    endTime: Yup.string().required('End time is required'),
    workingDays: Yup.array()
      .min(1, 'Select at least one working day')
      .required('Working days are required')
  });

  const step3ValidationSchema = Yup.object({
    firstName: Yup.string()
      .min(2, 'First name must be at least 2 characters')
      .required('First name is required'),
    lastName: Yup.string()
      .min(2, 'Last name must be at least 2 characters')
      .required('Last name is required'),
    employeeId: Yup.string()
      .matches(/^[A-Z0-9]{5,15}$/, 'Employee ID must be 5-15 uppercase letters/numbers')
      .required('Employee ID is required'),
    designation: Yup.string().required('Designation is required'),
    operatorPhone: Yup.string()
      .matches(/^[0-9]{10}$/, 'Phone must be 10 digits')
      .required('Phone is required'),
    operatorEmail: Yup.string()
      .email('Invalid email format')
      .required('Email is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm password is required'),
    department: Yup.string().required('Department is required')
  });

  const initialValues = {
    // Office Details
    officeName: '',
    officeCode: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    
    // Contact & Operations
    phone: '',
    email: '',
    website: '',
    coverageRadius: 5,
    startTime: '08:00',
    endTime: '18:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    
    // Operator Details
    firstName: '',
    lastName: '',
    employeeId: '',
    designation: 'Office Manager',
    operatorPhone: '',
    operatorEmail: '',
    password: '',
    confirmPassword: '',
    department: 'Operations'
  };

  const weekDays = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
    'Friday', 'Saturday', 'Sunday'
  ];

  const designations = [
    'Office Manager',
    'Supervisor', 
    'Data Operator',
    'Admin Officer',
    'Field Coordinator'
  ];

  const departments = [
    'Operations',
    'Monitoring',
    'Analytics',
    'Field Management',
    'Administration'
  ];

  // Get current user's location
  const getCurrentLocation = (setFieldValue) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFieldValue('latitude', position.coords.latitude);
          setFieldValue('longitude', position.coords.longitude);
          toast.success('Location detected successfully!');
        },
        (error) => {
          toast.error('Unable to get location. Please enter manually.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
    }
  };

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    setIsSubmitting(true);
    
    try {
      // Prepare data for submission
      const registrationData = {
        office: {
          officeName: values.officeName,
          officeCode: values.officeCode.toUpperCase(),
          address: {
            street: values.street,
            city: values.city,
            state: values.state,
            pincode: values.pincode
          },
          location: {
            latitude: parseFloat(values.latitude),
            longitude: parseFloat(values.longitude)
          },
          coverageArea: {
            radius: parseInt(values.coverageRadius),
            zones: []
          },
          contactInfo: {
            phone: values.phone,
            email: values.email,
            website: values.website || undefined
          },
          operationalHours: {
            startTime: values.startTime,
            endTime: values.endTime,
            workingDays: values.workingDays
          }
        },
        operator: {
          personalInfo: {
            firstName: values.firstName,
            lastName: values.lastName,
            employeeId: values.employeeId.toUpperCase(),
            designation: values.designation,
            phone: values.operatorPhone,
            email: values.operatorEmail
          },
          authentication: {
            password: values.password
          },
          officeInfo: {
            department: values.department
          },
          permissions: {
            dashboardAccess: true,
            workerManagement: true,
            incentiveManagement: true,
            reportGeneration: true,
            systemSettings: true,
            realTimeMonitoring: true
          }
        }
      };

      // Submit registration
      const response = await axios.post('/api/dashboard/register-office', registrationData);
      
      toast.success('Office registered successfully!');
      
      // Store registration info and redirect
      localStorage.setItem('dashboardAuthToken', response.data.token);
      localStorage.setItem('officeInfo', JSON.stringify(response.data.office));
      localStorage.setItem('operatorInfo', JSON.stringify(response.data.operator));
      
      setTimeout(() => {
        onRegistrationSuccess(response.data);
      }, 1000);
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.data?.field) {
        setFieldError(error.response.data.field, error.response.data.message);
      } else {
        toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  const getValidationSchema = () => {
    switch (currentStep) {
      case 1: return step1ValidationSchema;
      case 2: return step2ValidationSchema;
      case 3: return step3ValidationSchema;
      default: return Yup.object({});
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
        <div className="step-number">1</div>
        <div className="step-label">Office Details</div>
      </div>
      <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
        <div className="step-number">2</div>
        <div className="step-label">Operations</div>
      </div>
      <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
        <div className="step-number">3</div>
        <div className="step-label">Operator Setup</div>
      </div>
    </div>
  );

  const renderStep1 = (values, setFieldValue) => (
    <div className="form-step">
      <div className="step-header">
        <Building2 className="step-icon" />
        <h3>Office Details</h3>
        <p>Enter your waste management office information</p>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="officeName">Office Name *</label>
          <Field
            type="text"
            name="officeName"
            placeholder="e.g., Municipal Waste Management Office"
            className="form-control"
          />
          <ErrorMessage name="officeName" component="div" className="error-message" />
        </div>

        <div className="form-group">
          <label htmlFor="officeCode">Office Code *</label>
          <Field
            type="text"
            name="officeCode"
            placeholder="e.g., WMO001"
            className="form-control"
            style={{ textTransform: 'uppercase' }}
          />
          <ErrorMessage name="officeCode" component="div" className="error-message" />
          <small>Unique identifier for your office (3-10 characters)</small>
        </div>

        <div className="form-group full-width">
          <label htmlFor="street">Street Address *</label>
          <Field
            type="text"
            name="street"
            placeholder="Complete street address"
            className="form-control"
          />
          <ErrorMessage name="street" component="div" className="error-message" />
        </div>

        <div className="form-group">
          <label htmlFor="city">City *</label>
          <Field
            type="text"
            name="city"
            placeholder="City"
            className="form-control"
          />
          <ErrorMessage name="city" component="div" className="error-message" />
        </div>

        <div className="form-group">
          <label htmlFor="state">State *</label>
          <Field
            type="text"
            name="state"
            placeholder="State"
            className="form-control"
          />
          <ErrorMessage name="state" component="div" className="error-message" />
        </div>

        <div className="form-group">
          <label htmlFor="pincode">Pincode *</label>
          <Field
            type="text"
            name="pincode"
            placeholder="6-digit pincode"
            className="form-control"
          />
          <ErrorMessage name="pincode" component="div" className="error-message" />
        </div>
      </div>

      <div className="location-section">
        <div className="section-header">
          <MapPin className="section-icon" />
          <h4>Location Coordinates</h4>
          <button
            type="button"
            onClick={() => getCurrentLocation(setFieldValue)}
            className="btn-location"
          >
            Auto-detect Location
          </button>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="latitude">Latitude *</label>
            <Field
              type="number"
              step="any"
              name="latitude"
              placeholder="e.g., 28.6139"
              className="form-control"
            />
            <ErrorMessage name="latitude" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="longitude">Longitude *</label>
            <Field
              type="number"
              step="any"
              name="longitude"
              placeholder="e.g., 77.2090"
              className="form-control"
            />
            <ErrorMessage name="longitude" component="div" className="error-message" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-step">
      <div className="step-header">
        <Clock className="step-icon" />
        <h3>Operations & Contact</h3>
        <p>Configure operational details and contact information</p>
      </div>

      <div className="contact-section">
        <div className="section-header">
          <Phone className="section-icon" />
          <h4>Contact Information</h4>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="phone">Office Phone *</label>
            <Field
              type="text"
              name="phone"
              placeholder="10-digit phone number"
              className="form-control"
            />
            <ErrorMessage name="phone" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="email">Office Email *</label>
            <Field
              type="email"
              name="email"
              placeholder="office@example.com"
              className="form-control"
            />
            <ErrorMessage name="email" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website (Optional)</label>
            <Field
              type="url"
              name="website"
              placeholder="https://example.com"
              className="form-control"
            />
            <ErrorMessage name="website" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="coverageRadius">Coverage Radius (km) *</label>
            <Field
              type="number"
              name="coverageRadius"
              min="1"
              max="50"
              className="form-control"
            />
            <ErrorMessage name="coverageRadius" component="div" className="error-message" />
            <small>Area covered by your office (1-50 km)</small>
          </div>
        </div>
      </div>

      <div className="operations-section">
        <div className="section-header">
          <Clock className="section-icon" />
          <h4>Operational Hours</h4>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="startTime">Start Time *</label>
            <Field
              type="time"
              name="startTime"
              className="form-control"
            />
            <ErrorMessage name="startTime" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="endTime">End Time *</label>
            <Field
              type="time"
              name="endTime"
              className="form-control"
            />
            <ErrorMessage name="endTime" component="div" className="error-message" />
          </div>
        </div>

        <div className="form-group">
          <label>Working Days *</label>
          <div className="checkbox-group">
            {weekDays.map((day) => (
              <label key={day} className="checkbox-item">
                <Field
                  type="checkbox"
                  name="workingDays"
                  value={day}
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
          <ErrorMessage name="workingDays" component="div" className="error-message" />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="form-step">
      <div className="step-header">
        <User className="step-icon" />
        <h3>Dashboard Operator Setup</h3>
        <p>Create account for the person who will monitor this dashboard</p>
      </div>

      <div className="operator-section">
        <div className="section-header">
          <User className="section-icon" />
          <h4>Personal Information</h4>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <Field
              type="text"
              name="firstName"
              placeholder="First name"
              className="form-control"
            />
            <ErrorMessage name="firstName" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name *</label>
            <Field
              type="text"
              name="lastName"
              placeholder="Last name"
              className="form-control"
            />
            <ErrorMessage name="lastName" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="employeeId">Employee ID *</label>
            <Field
              type="text"
              name="employeeId"
              placeholder="e.g., EMP001"
              className="form-control"
              style={{ textTransform: 'uppercase' }}
            />
            <ErrorMessage name="employeeId" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="designation">Designation *</label>
            <Field as="select" name="designation" className="form-control">
              {designations.map((designation) => (
                <option key={designation} value={designation}>
                  {designation}
                </option>
              ))}
            </Field>
            <ErrorMessage name="designation" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="operatorPhone">Phone *</label>
            <Field
              type="text"
              name="operatorPhone"
              placeholder="10-digit phone number"
              className="form-control"
            />
            <ErrorMessage name="operatorPhone" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="operatorEmail">Email *</label>
            <Field
              type="email"
              name="operatorEmail"
              placeholder="operator@example.com"
              className="form-control"
            />
            <ErrorMessage name="operatorEmail" component="div" className="error-message" />
          </div>

          <div className="form-group">
            <label htmlFor="department">Department *</label>
            <Field as="select" name="department" className="form-control">
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </Field>
            <ErrorMessage name="department" component="div" className="error-message" />
          </div>
        </div>

        <div className="auth-section">
          <div className="section-header">
            <h4>Dashboard Login Credentials</h4>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <Field
                type="password"
                name="password"
                placeholder="Enter password (min 6 characters)"
                className="form-control"
              />
              <ErrorMessage name="password" component="div" className="error-message" />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <Field
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                className="form-control"
              />
              <ErrorMessage name="confirmPassword" component="div" className="error-message" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="office-registration">
      <div className="registration-header">
        <div className="brand">
          <Building2 className="brand-icon" />
          <h1>स्वच्छ-सारथी सहायक</h1>
          <h2>Swacch-Saarthi Sahayak</h2>
          <p>Waste Management Monitoring Dashboard</p>
        </div>
        
        {renderStepIndicator()}
      </div>

      <div className="registration-content">
        <Formik
          initialValues={initialValues}
          validationSchema={getValidationSchema()}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, setFieldValue, isValid, dirty }) => (
            <Form className="registration-form">
              {currentStep === 1 && renderStep1(values, setFieldValue)}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              <div className="form-navigation">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="btn btn-secondary"
                  >
                    Previous
                  </button>
                )}
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="btn btn-primary"
                    disabled={!isValid || !dirty}
                  >
                    Next <ArrowRight className="btn-icon" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={!isValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>Processing...</>
                    ) : (
                      <>
                        Register Office <CheckCircle className="btn-icon" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </Form>
          )}
        </Formik>
      </div>

      <div className="registration-info">
        <div className="info-card">
          <AlertCircle className="info-icon" />
          <h3>Important Information</h3>
          <ul>
            <li>This dashboard will be used to monitor worker performance</li>
            <li>Workers earning above 15kg waste collection get ₹10/kg incentive</li>
            <li>Real-time tracking and analytics will be available</li>
            <li>All data is securely stored and encrypted</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OfficeRegistration;