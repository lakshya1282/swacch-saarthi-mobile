import React, { useState, useEffect } from 'react';

const QRVerificationWindow = ({ 
  isVisible, 
  qrData, 
  expectedOrderId, 
  onConfirm, 
  onCancel,
  isProcessing = false 
}) => {
  const [validationSteps, setValidationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isValid, setIsValid] = useState(false);

  // Function to mask pickup ID for workers - show only last 5 digits
  const maskPickupId = (pickupId) => {
    if (!pickupId) return '';
    const idString = String(pickupId);
    if (idString.length <= 5) return idString;
    return `****${idString.slice(-5)}`;
  };

  useEffect(() => {
    if (qrData && expectedOrderId && isVisible) {
      performValidation();
    }
  }, [qrData, expectedOrderId, isVisible]);

  const performValidation = async () => {
    const steps = [];
    let valid = false;

    // Step 1: QR Code Detection
    steps.push({
      title: '📱 QR Code Detected',
      status: 'completed',
      message: 'Successfully read QR code data',
      data: qrData.substring(0, 50) + (qrData.length > 50 ? '...' : '')
    });

    setValidationSteps([...steps]);
    setCurrentStep(1);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 2: QR Code Format Validation
    let parsedData = null;
    let isValidFormat = false;
    
    try {
      // Try parsing as JSON first (preferred format)
      parsedData = JSON.parse(qrData);
      
      // Validate JSON structure
      if (parsedData && 
          typeof parsedData === 'object' && 
          parsedData.pickupId && 
          parsedData.verificationCode) {
        isValidFormat = true;
        steps.push({
          title: '🔍 QR Format Validation',
          status: 'completed',
          message: 'Valid JSON format with required fields',
          data: `Pickup ID: ${maskPickupId(parsedData.pickupId)}, Code: ${parsedData.verificationCode.substring(0, 6)}***`
        });
      } else {
        steps.push({
          title: '🔍 QR Format Validation',
          status: 'failed',
          message: 'Invalid JSON structure - missing required fields',
          data: 'QR code must contain pickupId and verificationCode'
        });
      }
    } catch (jsonError) {
      // Try structured format (PICKUP:ID:CODE)
      if (qrData.includes('PICKUP:') && qrData.split(':').length >= 3) {
        const parts = qrData.split(':');
        if (parts[0] === 'PICKUP' && parts[1] && parts[2] && parts[2].length >= 6) {
          parsedData = { 
            pickupId: parts[1], 
            verificationCode: parts[2] 
          };
          isValidFormat = true;
          steps.push({
            title: '🔍 QR Format Validation',
            status: 'completed',
            message: 'Valid structured format',
          data: `Format: PICKUP:${maskPickupId(parts[1])}:${parts[2].substring(0, 6)}***`
          });
        } else {
          steps.push({
            title: '🔍 QR Format Validation',
            status: 'failed',
            message: 'Invalid PICKUP format structure',
            data: 'Expected format: PICKUP:ID:VERIFICATION_CODE'
          });
        }
      } else if (qrData && qrData.trim().length > 0) {
        // Try plain pickup ID format (backward compatibility)
        const cleanQrData = qrData.trim();
        // Check if it looks like a pickup ID (contains letters and numbers, reasonable length)
        if (cleanQrData.length >= 5 && cleanQrData.length <= 50 && /^[A-Za-z0-9\-_]+$/.test(cleanQrData)) {
          parsedData = {
            pickupId: cleanQrData,
            verificationCode: cleanQrData // Use the pickup ID as verification code for simple format
          };
          isValidFormat = true;
          steps.push({
            title: '🔍 QR Format Validation',
            status: 'completed',
            message: 'Valid plain pickup ID format',
            data: `Pickup ID: ${maskPickupId(cleanQrData)}`
          });
        } else {
          // Reject invalid/suspicious data
          steps.push({
            title: '🔍 QR Format Validation',
            status: 'failed',
            message: 'Invalid QR code format',
            data: 'QR code must be valid JSON, PICKUP:ID:CODE format, or plain pickup ID'
          });
        }
      } else {
        // Empty or invalid data
        steps.push({
          title: '🔍 QR Format Validation',
          status: 'failed',
          message: 'Invalid QR code format',
          data: 'QR code must be valid JSON, PICKUP:ID:CODE format, or plain pickup ID'
        });
      }
    }

    setValidationSteps([...steps]);
    setCurrentStep(2);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 3: Order ID Verification (only if format is valid)
    if (!isValidFormat) {
      steps.push({
        title: '❌ Order ID Verification',
        status: 'failed',
        message: 'Cannot verify order ID - invalid QR format',
        data: 'Please scan a valid pickup QR code'
      });
      valid = false;
    } else {
      const qrOrderId = parsedData.pickupId;
      
      // Strict matching - order ID must exactly match
      if (qrOrderId === expectedOrderId) {
        steps.push({
          title: '✅ Order ID Verification',
          status: 'success',
          message: 'Order ID matches perfectly!',
          data: `Expected: ${maskPickupId(expectedOrderId)} ✓ Found: ${maskPickupId(qrOrderId)}`
        });
        valid = true;
      } else {
        steps.push({
          title: '❌ Order ID Verification',
          status: 'failed',
          message: 'Order ID does not match!',
          data: `Expected: ${maskPickupId(expectedOrderId)} ✗ Found: ${maskPickupId(qrOrderId)}`
        });
        valid = false;
      }
    }

    setValidationSteps([...steps]);
    setCurrentStep(3);
    setIsValid(valid);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 4: Final Validation
    if (valid) {
      steps.push({
        title: '🎉 Validation Complete',
        status: 'success',
        message: 'QR code is valid for this pickup order!',
        data: 'Ready to complete pickup'
      });
    } else {
      steps.push({
        title: '🚫 Validation Failed',
        status: 'failed',
        message: 'This QR code is not for the current pickup order',
        data: 'Please scan the correct QR code'
      });
    }

    setValidationSteps([...steps]);
    setCurrentStep(4);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80%',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #f0f0f0',
          paddingBottom: '15px'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: '#333',
            fontSize: '24px'
          }}>
            🔍 QR Code Verification
          </h2>
          <p style={{ 
            color: '#666', 
            margin: '10px 0 0 0',
            fontSize: '14px'
          }}>
            Order ID: <strong>{expectedOrderId}</strong>
          </p>
        </div>

        {/* Validation Steps */}
        <div style={{ marginBottom: '20px' }}>
          {validationSteps.map((step, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '15px',
              padding: '15px',
              marginBottom: '10px',
              background: step.status === 'failed' ? '#ffebee' : 
                         step.status === 'success' ? '#e8f5e8' : '#f8f9fa',
              border: `2px solid ${
                step.status === 'failed' ? '#ffcdd2' :
                step.status === 'success' ? '#c8e6c9' : '#e9ecef'
              }`,
              borderRadius: '12px',
              opacity: index <= currentStep ? 1 : 0.3,
              transition: 'opacity 0.5s ease'
            }}>
              <div style={{
                minWidth: '24px',
                height: '24px',
                borderRadius: '50%',
                background: step.status === 'failed' ? '#f44336' :
                           step.status === 'success' ? '#4caf50' : '#2196f3',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {index + 1}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginBottom: '5px',
                  color: step.status === 'failed' ? '#d32f2f' :
                         step.status === 'success' ? '#2e7d32' : '#1976d2'
                }}>
                  {step.title}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '5px'
                }}>
                  {step.message}
                </div>
                {step.data && (
                  <div style={{
                    fontSize: '12px',
                    color: '#888',
                    fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.05)',
                    padding: '5px 8px',
                    borderRadius: '4px',
                    wordBreak: 'break-all'
                  }}>
                    {step.data}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator while processing */}
          {currentStep < 4 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '20px',
              justifyContent: 'center',
              color: '#666'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #f3f3f3',
                borderTop: '2px solid #2196f3',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span>Validating QR code...</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {currentStep >= 4 && (
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            paddingTop: '15px',
            borderTop: '2px solid #f0f0f0'
          }}>
            {isValid ? (
              <>
                <button
                  onClick={onConfirm}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    background: isProcessing ? '#ccc' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '15px 20px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isProcessing ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #fff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Completing...
                    </>
                  ) : (
                    <>
                      ✅ Complete Pickup
                    </>
                  )}
                </button>
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  style={{
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '15px 20px',
                    fontSize: '16px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '15px 20px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🔄 Try Another QR Code
              </button>
            )}
          </div>
        )}

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default QRVerificationWindow;
