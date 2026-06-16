import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, FileDown, TrendingUp, BarChart3, ShieldCheck, AlertOctagon, UserX, Award } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
  const { user, token, getAuthHeaders, logout } = useAuth();
  const navigate = useNavigate();

  // Admin stats
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [pendingNgos, setPendingNgos] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'approvals'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchStats();
    fetchUsers();
    fetchPendingNgos();
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/analytics', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingNgos = async () => {
    try {
      const res = await fetch('/api/admin/ngos/pending', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPendingNgos(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle user active status
  const toggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Approve pending NGO
  const approveNGO = async (ngoId) => {
    try {
      const res = await fetch(`/api/admin/ngos/${ngoId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        alert('NGO verified and activated!');
        fetchPendingNgos();
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export report files
  const downloadReport = async (format) => {
    try {
      const response = await fetch(`/api/admin/reports/export?format=${format}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `food_sharing_analytics_report.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  // Recharts color palette
  const COLORS = ['#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7280'];

  // Parse analytics data
  const pieData = stats ? Object.keys(stats.category_analysis).map(key => ({
    name: key.toUpperCase(),
    value: stats.category_analysis[key]
  })) : [];

  return (
    <div className="app-container">
      {/* Navbar */}
      <header className="navbar">
        <div className="logo">🍲 FoodShare AI</div>
        <div className="nav-links">
          <span style={{ fontWeight: 600 }}>Hello, {user?.username} (Admin)</span>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>Log Out</button>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className={`sidebar-menu-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <BarChart3 size={18} /> System Overview
          </div>
          <div className={`sidebar-menu-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={18} /> Manage Users
          </div>
          <div className={`sidebar-menu-item ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')} style={{ position: 'relative' }}>
            <ShieldCheck size={18} /> Pending Approvals
            {pendingNgos.length > 0 && (
              <span className="notif-badge">{pendingNgos.length}</span>
            )}
          </div>
        </aside>

        {/* Dashboard Main Content */}
        <main className="main-content">
          
          {loading ? <p>Loading system records...</p> : (
            <div>
              
              {/* Stat Summary Metrics Grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Food Saved</span>
                    <div className="metric-value">{stats?.total_saved_kg} kg</div>
                  </div>
                  <div className="metric-icon-wrapper">
                    <TrendingUp size={24} />
                  </div>
                </div>

                <div className="metric-card">
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Surplus Posts</span>
                    <div className="metric-value">{stats?.total_donations}</div>
                  </div>
                  <div className="metric-icon-wrapper">
                    <BarChart3 size={24} />
                  </div>
                </div>

                <div className="metric-card">
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active verified NGOs</span>
                    <div className="metric-value">{stats?.active_ngos}</div>
                  </div>
                  <div className="metric-icon-wrapper">
                    <Award size={24} />
                  </div>
                </div>

                <div className="metric-card">
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Donors</span>
                    <div className="metric-value">{stats?.active_donors}</div>
                  </div>
                  <div className="metric-icon-wrapper">
                    <Users size={24} />
                  </div>
                </div>
              </div>

              {/* OVERVIEW PANEL - INTERACTIVE CHARTS */}
              {activeTab === 'overview' && (
                <div>
                  
                  {/* Export actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => downloadReport('pdf')}>
                      <FileDown size={16} /> Export PDF Report
                    </button>
                    <button className="btn btn-secondary" onClick={() => downloadReport('xlsx')}>
                      <FileDown size={16} /> Export Excel Sheet
                    </button>
                  </div>

                  <div className="dashboard-grid">
                    
                    {/* Trend Line/Area Chart */}
                    <div className="panel">
                      <h4 style={{ marginBottom: '1.5rem' }}>Surplus Waste Saved Trends (Cumulative)</h4>
                      <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                          <AreaChart data={stats?.trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="total_waste_saved_kg" stroke="#10B981" fillOpacity={1} fill="url(#colorSaved)" name="Food Saved (kg)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Food categories PIE chart */}
                    <div className="panel">
                      <h4 style={{ marginBottom: '1.5rem' }}>Category Analysis</h4>
                      <div style={{ width: '100%', height: 320, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* MANAGE USERS PANEL */}
              {activeTab === 'users' && (
                <div className="panel">
                  <h3 className="panel-title">System Accounts</h3>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Location Coordinate</th>
                        <th>Phone</th>
                        <th>Account Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(item => (
                        <tr key={item.id}>
                          <td>#{item.id}</td>
                          <td>{item.username}</td>
                          <td>{item.email}</td>
                          <td>
                            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.85rem' }}>
                              {item.role}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                          </td>
                          <td>{item.phone || '-'}</td>
                          <td>
                            <span className={`food-card-badge ${item.status === 'active' ? 'risk-safe' : 'risk-high'}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>
                            {item.id !== user.id && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', color: item.status === 'active' ? 'var(--danger)' : 'var(--safe)' }}
                                onClick={() => toggleUserStatus(item.id, item.status)}
                              >
                                <UserX size={16} /> {item.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PENDING APPROVALS PANEL */}
              {activeTab === 'approvals' && (
                <div className="panel">
                  <h3 className="panel-title">NGO Verification Requests</h3>
                  {pendingNgos.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>All NGO accounts are currently approved and active.</p>
                  ) : (
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Organization Name</th>
                          <th>Reg Number</th>
                          <th>Preferred food</th>
                          <th>Capacity / Day</th>
                          <th>Website</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingNgos.map(ngo => (
                          <tr key={ngo.id}>
                            <td>
                              <strong>{ngo.ngo_profile?.organization_name}</strong>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered by: {ngo.username}</p>
                            </td>
                            <td>{ngo.ngo_profile?.registration_number}</td>
                            <td>{ngo.ngo_profile?.preferred_food_types}</td>
                            <td>{ngo.ngo_profile?.capacity_people} People</td>
                            <td>
                              {ngo.ngo_profile?.website ? (
                                <a href={ngo.ngo_profile.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>
                                  Visit Site
                                </a>
                              ) : '-'}
                            </td>
                            <td>
                              <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => approveNGO(ngo.id)}>
                                Verify & Approve
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
