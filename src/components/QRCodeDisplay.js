import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

const QRCodeDisplay = ({ 
  data, 
  size = 250, 
  level = 'M',
  darkColor = '#000000',
  lightColor = '#ffffff',
  showDownloadButton = true,
  showPrintButton = true,
  title = 'Pickup QR Code'
}) => {
  const canvasRef = useRef(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  useEffect(() => {
    if (canvasRef.current && data) {
      generateQRCode();
    }
  }, [data, size, level, darkColor, lightColor]);

  const generateQRCode = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

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
      
      await QRCode.toCanvas(canvas, qrData, {
        width: size,
        margin: 1,
        color: {
          dark: darkColor,
          light: lightColor
        },
        errorCorrectionLevel: level
      });

      setQrGenerated(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrGenerated(false);
    }
  };

  // Error correction levels are handled by the qrcode library
  // L = Low (7%), M = Medium (15%), Q = Quartile (25%), H = High (30%)

  const downloadQRCode = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `pickup-qr-${data.pickupId || 'code'}.png`;
    link.href = url;
    link.click();
  };

  const printQRCode = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    
    const printWindow = window.open('', '', 'width=600,height=700');
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h2 { color: #333; margin-bottom: 20px; }
            .qr-container {
              border: 2px solid #ddd;
              padding: 20px;
              border-radius: 8px;
              background: white;
            }
            .info {
              margin-top: 20px;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 4px;
            }
            .info p {
              margin: 5px 0;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>${title}</h2>
            <img src="${dataUrl}" width="${size}" height="${size}" />
            <div class="info">
              <p><strong>Pickup ID:</strong> ${data.pickupId || 'N/A'}</p>
              <p><strong>Date:</strong> ${data.scheduledDate || new Date().toLocaleDateString()}</p>
              <p><strong>Time Slot:</strong> ${data.timeSlot || 'N/A'}</p>
              ${data.wasteTypes ? `<p><strong>Waste Types:</strong> ${data.wasteTypes.join(', ')}</p>` : ''}
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const copyToClipboard = () => {
    let qrData;
    if (typeof data === 'object' && data.pickupId) {
      qrData = JSON.stringify({
        pickupId: data.pickupId,
        verificationCode: data.pickupId,
        customerName: data.customerName,
        wasteTypes: data.wasteTypes,
        estimatedWeight: data.estimatedWeight,
        timeSlot: data.timeSlot,
        scheduledDate: data.scheduledDate,
        timestamp: data.timestamp || new Date().toISOString()
      }, null, 2);
    } else {
      qrData = JSON.stringify(data, null, 2);
    }
    
    navigator.clipboard.writeText(qrData).then(() => {
      alert('QR code data copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  if (!data) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <p>No QR code data available</p>
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
      <h3 style={{ marginBottom: '20px', color: '#333' }}>{title}</h3>
      
      <div style={{
        padding: '20px',
        background: 'white',
        border: '2px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <canvas 
          ref={canvasRef}
          style={{
            display: 'block',
            imageRendering: 'pixelated'
          }}
        />
      </div>

      {qrGenerated && (
        <>
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

          <div style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {showDownloadButton && (
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
            )}

            {showPrintButton && (
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
            )}

            <button
              onClick={copyToClipboard}
              style={{
                padding: '10px 20px',
                background: '#FF9800',
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
              📋 Copy Data
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
              You can also save or print it for your records.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default QRCodeDisplay;
