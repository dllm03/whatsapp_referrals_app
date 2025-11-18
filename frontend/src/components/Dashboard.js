// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, referralsAPI } from '../services/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await referralsAPI.getStats();
      setStats(result.stats);
    } catch (err) {
      setError('Failed to load statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>WhatsApp Referrals Dashboard</h1>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </header>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Referrals</h3>
          <p className="stat-value">{stats?.total || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Active</h3>
          <p className="stat-value">{stats?.active || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Verified</h3>
          <p className="stat-value">{stats?.verified || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Inactive</h3>
          <p className="stat-value">{stats?.inactive || 0}</p>
        </div>
      </div>

      <div className="action-buttons">
        <button 
          onClick={() => navigate('/upload')}
          className="btn-action btn-primary"
        >
          📤 Upload WhatsApp Chat
        </button>

        <button 
          onClick={() => navigate('/referrals')}
          className="btn-action btn-secondary"
        >
          📋 View Referrals
        </button>
      </div>

      <style jsx>{`
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #eee;
        }

        .dashboard-header h1 {
          margin: 0;
          color: #333;
        }

        .btn-logout {
          padding: 10px 20px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.3s;
        }

        .btn-logout:hover {
          background: #d32f2f;
        }

        .loading {
          text-align: center;
          padding: 50px;
          font-size: 18px;
          color: #666;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          border-left: 4px solid #c33;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }

        .stat-card h3 {
          margin: 0 0 15px 0;
          color: #666;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .stat-value {
          margin: 0;
          font-size: 48px;
          font-weight: 700;
          color: #25D366;
        }

        .action-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .btn-action {
          padding: 20px;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-primary {
          background: #25D366;
          color: white;
        }

        .btn-primary:hover {
          background: #1da851;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
        }

        .btn-secondary {
          background: #2196F3;
          color: white;
        }

        .btn-secondary:hover {
          background: #1976D2;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 15px;
            align-items: flex-start;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .action-buttons {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;