import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const SimpleQRCode = ({ 
  data, 
  size = 250,
  includeDetails = true 
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    generateQRCode();
  }, [data]);

  const generateQRCode = async () => {
    if (!data) {
      setError('No data provided for QR code');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // For pickup QR codes, prioritize the pickup ID
      let qrData;
      if (typeof data === 'object' && data.pickupId) {
        // Create QR data with pickup ID as primary identifier
        qrData = JSON.stringify({
          pickupId: data.pickupId,
          verificationCode: data.pickupId, // Use pickup ID as verification
          customerName: data.customerName,
          wasteTypes: data.wasteTypes,
          estimatedWeight: data.estimatedWeight,
          timeSlot: data.timeSlot,
          scheduledDate: data.scheduledDate,
          timestamp: data.timestamp || new Date().toISOString()
        });
        console.log('Generated QR code for pickup ID:', data.pickupId);
      } else {
        qrData = typeof data === 'string' ? data : JSON.stringify(data);
      }
      
      // Generate QR code as data URL
      const url = await QRCode.toDataURL(qrData, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQrCodeUrl(url);
      setLoading(false);
    } catch (err) {
      console.error('QR Code generation error:', err);
      setError('Failed to generate QR code');
      setLoading(false);
      
      // Fallback to a simple text display
      generateFallbackQR();
    }
  };

  const generateFallbackQR = () => {
    // Create a simple fallback display with the pickup ID
    const pickupId = data?.pickupId || 'UNKNOWN';
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, size - 20, size - 20);
    
    // Text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PICKUP CODE', size/2, 40);
    
    ctx.font = 'bold 28px monospace';
    ctx.fillText(pickupId, size/2, size/2);
    
    ctx.font = '14px Arial';
    ctx.fillText('Show this to worker', size/2, size - 30);
    
    setQrCodeUrl(canvas.toDataURL());
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `pickup-qr-${data?.pickupId || 'code'}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const printQRCode = () => {
    const printWindow = window.open('', '', 'width=600,height=700');
    printWindow.document.write(`
      <html>
        <head>
          <title>Pickup QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            img { 
              border: 2px solid #ddd; 
              padding: 10px;
              margin: 20px;
            }
            .details {
              background: #f5f5f5;
              padding: 20px;
              border-radius: 8px;
              margin: 20px;
            }
            .details p {
              margin: 8px 0;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h2>Waste Pickup QR Code</h2>
          <img src="${qrCodeUrl}" width="${size}" height="${size}" />
          <div class="details">
            <p><strong>Pickup ID:</strong> ${data?.pickupId || 'N/A'}</p>
            <p><strong>Date:</strong> ${data?.scheduledDate || new Date().toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${data?.timeSlot || 'N/A'}</p>
            <p><strong>Waste Types:</strong> ${data?.wasteTypes?.join(', ') || 'N/A'}</p>
            <p><strong>Weight:</strong> ${data?.estimatedWeight || 'N/A'}</p>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <p>Generating QR Code...</p>
      </div>
    );
  }

  if (error && !qrCodeUrl) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        background: '#fee',
        borderRadius: '8px',
        color: '#c00'
      }}>
        <p>{error}</p>
        <p style={{ fontSize: '14px', marginTop: '10px' }}>
          Pickup ID: <strong>{data?.pickupId || 'N/A'}</strong>
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginBottom: '20px', color: '#333' }}>Your Pickup QR Code</h3>
      
      {qrCodeUrl && (
        <div style={{
          padding: '20px',
          background: 'white',
          border: '2px solid #ddd',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <img 
            src={qrCodeUrl} 
            alt="QR Code" 
            style={{
              display: 'block',
              width: `${size}px`,
              height: `${size}px`,
              imageRendering: 'pixelated'
            }}
          />
        </div>
      )}

      {includeDetails && data && (
        <div style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Pickup Details</h4>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <p style={{ margin: '5px 0' }}>
              <strong>Pickup ID:</strong> {data.pickupId || 'Generating...'}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Status:</strong> <span style={{ color: '#4CAF50' }}>Confirmed</span>
            </p>
            {data.scheduledDate && (
              <p style={{ margin: '5px 0' }}>
                <strong>Date:</strong> {data.scheduledDate}
              </p>
            )}
            {data.timeSlot && (
              <p style={{ margin: '5px 0' }}>
                <strong>Time:</strong> {data.timeSlot}
              </p>
            )}
            {data.wasteTypes && (
              <p style={{ margin: '5px 0' }}>
                <strong>Waste Types:</strong> {data.wasteTypes.join(', ')}
              </p>
            )}
            {data.estimatedWeight && (
              <p style={{ margin: '5px 0' }}>
                <strong>Weight:</strong> {data.estimatedWeight}
              </p>
            )}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={downloadQRCode}
          style={{
            padding: '10px 20px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          📥 Download QR
        </button>

        <button
          onClick={printQRCode}
          style={{
            padding: '10px 20px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          🖨️ Print QR
        </button>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
          💡 <strong>Tip:</strong> Show this QR code to the waste collection worker for quick verification. 
          Save or print it for your records.
        </p>
      </div>
    </div>
  );
};

export default SimpleQRCode;
