// src/components/FileUpload.js - UPDATED VERSION
import React, { useState } from 'react';
import { fileAPI } from '../services/auth';

const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError('');
    setSuccess('');

    if (!selectedFile) {
      return;
    }

    // Validate file type
    const allowedTypes = ['text/plain', 'text/csv'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Only .txt and .csv files are allowed');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setProgress(0);

    try {
      const result = await fileAPI.upload(file, (percentCompleted) => {
        setProgress(percentCompleted);
      });

      if (result.success) {
        setSuccess('File uploaded successfully!');
        setFile(null);
        setProgress(0);
        
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';

        // Callback to parent component
        if (onUploadSuccess) {
          onUploadSuccess(result);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <h3>Upload WhatsApp Chat</h3>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="upload-section">
        <input
          type="file"
          id="file-input"
          onChange={handleFileChange}
          accept=".txt,.csv"
          disabled={uploading}
          className="file-input"
        />

        {file && (
          <div className="file-info">
            <p><strong>Selected:</strong> {file.name}</p>
            <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        {uploading && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="btn-upload"
        >
          {uploading ? `Uploading... ${progress}%` : 'Upload File'}
        </button>
      </div>

      <div className="info-box">
        <h4>File Requirements:</h4>
        <ul>
          <li>File formats: .txt or .csv</li>
          <li>Maximum size: 10MB</li>
          <li>Must be a WhatsApp chat export</li>
        </ul>
      </div>

      <style jsx>{`
        .file-upload-container {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 600px;
          margin: 20px auto;
        }

        h3 {
          margin: 0 0 20px 0;
          color: #333;
        }

        .upload-section {
          margin: 20px 0;
        }

        .file-input {
          width: 100%;
          padding: 10px;
          margin-bottom: 15px;
          border: 2px dashed #ddd;
          border-radius: 4px;
          cursor: pointer;
        }

        .file-input:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .file-info {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        .file-info p {
          margin: 5px 0;
          color: #555;
        }

        .progress-bar {
          width: 100%;
          height: 30px;
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 15px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #25D366, #1da851);
          transition: width 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .btn-upload {
          width: 100%;
          padding: 12px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }

        .btn-upload:hover:not(:disabled) {
          background: #1da851;
        }

        .btn-upload:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          border-left: 4px solid #c33;
        }

        .success-message {
          background: #efe;
          color: #2a7221;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          border-left: 4px solid #2a7221;
        }

        .info-box {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 4px;
          margin-top: 20px;
        }

        .info-box h4 {
          margin: 0 0 10px 0;
          color: #1976d2;
        }

        .info-box ul {
          margin: 0;
          padding-left: 20px;
          color: #555;
        }

        .info-box li {
          margin: 5px 0;
        }
      `}</style>
    </div>
  );
};

export default FileUpload;