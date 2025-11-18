// src/components/Auth/Register.js
import React, { useState } from 'react';
import { authService } from '../../services/auth';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (!validatePassword(formData.password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      setLoading(false);
      return;
    }

    try {
      const result = await authService.register(formData.email, formData.password);
      
      if (result.success) {
        setSuccess(true);
        setShowConfirmation(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.confirmRegistration(formData.email, confirmationCode);
      
      if (result.success) {
        alert('Registration confirmed! You can now login.');
        window.location.href = '/login';
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await authService.resendConfirmationCode(formData.email);
      alert('Verification code sent! Check your email.');
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    }
  };

  if (showConfirmation) {
    return (
      <div className="register-container">
        <div className="register-card">
          <h2>Verify Your Email</h2>
          
          <p className="info-message">
            We've sent a verification code to <strong>{formData.email}</strong>
          </p>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <form onSubmit={handleConfirmation}>
            <div className="form-group">
              <label htmlFor="confirmationCode">Verification Code</label>
              <input
                type="text"
                id="confirmationCode"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                required
                placeholder="Enter 6-digit code"
                maxLength={6}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="auth-links">
            <button onClick={handleResendCode} className="link-button">
              Resend verification code
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Create Account</h2>
        
        {error && (
          <div className="error-message">{error}</div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a strong password"
              disabled={loading}
            />
            <small className="helper-text">
              Must be 8+ characters with uppercase, lowercase, number, and special character
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Re-enter your password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="auth-links">
          <a href="/login">Already have an account? Login</a>
        </div>
      </div>

      <style jsx>{`
        .register-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f5f5f5;
          padding: 20px;
        }

        .register-card {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
        }

        h2 {
          margin: 0 0 30px 0;
          text-align: center;
          color: #333;
        }

        .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          margin-bottom: 5px;
          color: #555;
          font-weight: 500;
        }

        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.3s;
        }

        input:focus {
          outline: none;
          border-color: #25D366;
        }

        input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .helper-text {
          display: block;
          margin-top: 5px;
          color: #666;
          font-size: 12px;
        }

        .btn-primary {
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

        .btn-primary:hover:not(:disabled) {
          background: #1da851;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          border-left: 4px solid #c33;
        }

        .info-message {
          background: #e3f2fd;
          color: #1976d2;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          border-left: 4px solid #1976d2;
        }

        .auth-links {
          margin-top: 20px;
          text-align: center;
        }

        .auth-links a {
          display: block;
          margin: 10px 0;
          color: #25D366;
          text-decoration: none;
          font-size: 14px;
        }

        .auth-links a:hover {
          text-decoration: underline;
        }

        .link-button {
          background: none;
          border: none;
          color: #25D366;
          cursor: pointer;
          text-decoration: underline;
          font-size: 14px;
        }

        .link-button:hover {
          color: #1da851;
        }
      `}</style>
    </div>
  );
};

export default Register;