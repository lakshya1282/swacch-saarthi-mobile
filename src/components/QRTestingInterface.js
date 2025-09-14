import React, { useState } from 'react';
import TestQRGenerator from '../utils/testQRGenerator';
import QRScanner from './QRScanner';

const QRTestingInterface = ({ assignmentId = 'PU-0112-2001', onClose }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);

  const runTest = async (testName, qrData, expectedResult) => {
    const result = {
      testName,
      qrData: qrData.length > 100 ? qrData.substring(0, 100) + '...' : qrData,
      expectedResult,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setCurrentTest(result);
    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const testScenarios = [
    {
      name: '✅ Valid JSON QR',
      qr: TestQRGenerator.generateValidQR(assignmentId),
      expected: 'PASS'
    },
    {
      name: '✅ Valid Structured QR',
      qr: TestQRGenerator.generateStructuredQR(assignmentId),
      expected: 'PASS'
    },
    {
      name: '❌ Invalid Random Text',
      qr: 'Just some random text that should fail',
      expected: 'FAIL'
    },
    {
      name: '❌ Wrong Pickup ID',
      qr: TestQRGenerator.generateWrongPickupQR(assignmentId),
      expected: 'FAIL'
    },
    {
      name: '❌ Invalid JSON Structure',
      qr: JSON.stringify({ pickupId: assignmentId }), // Missing verificationCode
      expected: 'FAIL'
    },
    {
      name: '❌ Invalid PICKUP Format',
      qr: `PICKUP:${assignmentId}`, // Missing verification code
      expected: 'FAIL'
    }
  ];

  const handleTestScan = (testData) => {
    console.log('Test scan initiated with data:', testData);
    setShowScanner(true);
    
    // Simulate QR scan by setting the data in localStorage for the scanner to pick up
    localStorage.setItem('test_qr_data', testData.qr);
    localStorage.setItem('test_qr_name', testData.name);
  };

  const handleScanSuccess = (verificationCode, qrSource) => {
    const testName = localStorage.getItem('test_qr_name') || 'Unknown Test';
    console.log('Scan success:', { testName, verificationCode, qrSource });
    
    setTestResults(prev => [{
      testName: testName + ' - SCAN SUCCESS',
      result: 'SUCCESS',
      verificationCode,
      qrSource,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 9)]);
    
    setShowScanner(false);
    localStorage.removeItem('test_qr_data');
    localStorage.removeItem('test_qr_name');
  };

  const handleScanError = (error) => {
    const testName = localStorage.getItem('test_qr_name') || 'Unknown Test';
    console.log('Scan error:', { testName, error });
    
    setTestResults(prev => [{
      testName: testName + ' - SCAN FAILED',
      result: 'FAILED',
      error: error?.message || String(error),
      timestamp: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 9)]);
    
    localStorage.removeItem('test_qr_data');
    localStorage.removeItem('test_qr_name');
  };

  const handleScanClose = () => {
    setShowScanner(false);
    localStorage.removeItem('test_qr_data');
    localStorage.removeItem('test_qr_name');
  };

  const downloadTestQR = () => {
    TestQRGenerator.downloadTestQR(assignmentId);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.8)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90%',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #f0f0f0',
          paddingBottom: '15px'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>🧪 QR Testing Interface</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
          <strong>Testing Assignment: {assignmentId}</strong>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#666' }}>
            This interface helps test QR code validation scenarios. Each test verifies different aspects of the QR validation system.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Test Scenarios */}
          <div>
            <h3 style={{ marginBottom: '15px' }}>Test Scenarios</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {testScenarios.map((scenario, index) => (
                <div key={index} style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  background: '#fff'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <strong style={{ fontSize: '14px' }}>{scenario.name}</strong>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: scenario.expected === 'PASS' ? '#e8f5e8' : '#ffebee',
                      color: scenario.expected === 'PASS' ? '#2e7d32' : '#d32f2f'
                    }}>
                      Expected: {scenario.expected}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    background: '#f5f5f5',
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    wordBreak: 'break-all',
                    maxHeight: '60px',
                    overflow: 'auto'
                  }}>
                    {scenario.qr.length > 150 ? scenario.qr.substring(0, 150) + '...' : scenario.qr}
                  </div>
                  
                  <button
                    onClick={() => handleTestScan(scenario)}
                    style={{
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    🧪 Test with Scanner
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={downloadTestQR}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                📸 Download Valid Test QR Image
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div>
            <h3 style={{ marginBottom: '15px' }}>Test Results</h3>
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              maxHeight: '400px',
              overflow: 'auto',
              background: '#f9f9f9'
            }}>
              {testResults.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No tests run yet. Click a test scenario above to begin.
                </div>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} style={{
                    padding: '15px',
                    borderBottom: index < testResults.length - 1 ? '1px solid #eee' : 'none',
                    background: result.result === 'SUCCESS' ? '#e8f5e8' : 
                               result.result === 'FAILED' ? '#ffebee' : '#fff'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '5px'
                    }}>
                      <strong style={{ fontSize: '13px' }}>{result.testName}</strong>
                      <span style={{ fontSize: '12px', color: '#666' }}>{result.timestamp}</span>
                    </div>
                    
                    {result.verificationCode && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Code: {result.verificationCode} | Source: {result.qrSource}
                      </div>
                    )}
                    
                    {result.error && (
                      <div style={{ fontSize: '12px', color: '#d32f2f' }}>
                        Error: {result.error}
                      </div>
                    )}
                    
                    {result.qrData && (
                      <div style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        background: 'rgba(0,0,0,0.05)',
                        padding: '5px',
                        borderRadius: '3px',
                        marginTop: '5px',
                        wordBreak: 'break-all'
                      }}>
                        {result.qrData}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#fff3cd',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <strong>💡 Testing Tips:</strong>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            <li>Valid QR codes should pass verification for the correct pickup ID</li>
            <li>Invalid formats should be rejected during format validation</li>
            <li>Wrong pickup IDs should fail order verification</li>
            <li>Use the downloaded test image to test file upload functionality</li>
          </ul>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          onClose={handleScanClose}
          assignmentId={assignmentId}
        />
      )}
    </div>
  );
};

export default QRTestingInterface;
