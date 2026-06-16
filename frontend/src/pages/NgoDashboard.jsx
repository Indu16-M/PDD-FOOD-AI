import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ClipboardList, MessageSquare, CheckSquare, RefreshCw, Bell } from 'lucide-react';
import TrackingMap from '../components/TrackingMap';

const NgoDashboard = () => {
  const { user, token, getAuthHeaders, logout } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [availableFood, setAvailableFood] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'requests', 'deliveries', 'notifications'
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState('');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [activeChatDonor, setActiveChatDonor] = useState(null); // {id, username, donationId}
  const [chatText, setChatText] = useState('');

  // Delivery update form
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerPhone, setVolunteerPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [deliveryError, setDeliveryError] = useState('');
  const [deliverySuccess, setDeliverySuccess] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAvailableDonations();
    fetchRequests();
    fetchDeliveries();
    fetchNotifications();
  }, [token]);

  const fetchAvailableDonations = async () => {
    try {
      const url = foodTypeFilter ? `/api/donations?food_type=${foodTypeFilter}` : '/api/donations';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAvailableFood(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/ngo/requests', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const res = await fetch('/api/ngo/deliveries', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMyDeliveries(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Submit food donation claim request
  const submitClaim = async (donationId) => {
    try {
      const res = await fetch('/api/ngo/requests', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ donation_id: donationId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Request failed');
      } else {
        alert('Food request submitted successfully! Pending donor approval.');
        fetchAvailableDonations();
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectDelivery = (del) => {
    setSelectedDelivery(del);
    setVolunteerName(del.volunteer_name || '');
    setVolunteerPhone(del.volunteer_phone || '');
    setVerifyCode('');
    setDeliveryError('');
    setDeliverySuccess('');
  };

  const handleLocationUpdate = async (latitude, longitude) => {
    if (!selectedDelivery) return;
    
    setSelectedDelivery(prev => ({
      ...prev,
      current_latitude: latitude,
      current_longitude: longitude,
      tracking_status: prev.tracking_status === 'picked_up' ? 'in_transit' : prev.tracking_status
    }));

    setMyDeliveries(prevList => 
      prevList.map(d => 
        d.id === selectedDelivery.id 
          ? { ...d, current_latitude: latitude, current_longitude: longitude, tracking_status: d.tracking_status === 'picked_up' ? 'in_transit' : d.tracking_status }
          : d
      )
    );

    try {
      await fetch(`/api/ngo/deliveries/${selectedDelivery.id}/location`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ latitude, longitude })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Update delivery details / volunteer assignment
  const handleUpdateDelivery = async (e) => {
    e.preventDefault();
    setDeliveryError('');
    setDeliverySuccess('');
    
    if (!volunteerName || !volunteerPhone) {
      setDeliveryError('Volunteer details are required');
      return;
    }

    try {
      const res = await fetch(`/api/ngo/deliveries/${selectedDelivery.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          tracking_status: 'picked_up',
          volunteer_name: volunteerName,
          volunteer_phone: volunteerPhone
        })
      });
      if (res.ok) {
        setDeliverySuccess('Volunteer details saved! Delivery status changed to Picked Up.');
        fetchDeliveries();
        setTimeout(() => setSelectedDelivery(null), 1500);
      }
    } catch (err) {
      setDeliveryError('Failed to save details');
    }
  };

  // Verify delivery with code
  const verifyAndCompleteDelivery = async (deliveryId) => {
    setDeliveryError('');
    setDeliverySuccess('');
    
    if (!verifyCode) {
      setDeliveryError('Enter verification code');
      return;
    }

    try {
      const res = await fetch(`/api/ngo/deliveries/${deliveryId}`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          tracking_status: 'delivered',
          verification_code: verifyCode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDeliverySuccess('Verification successful! Food donation logged as delivered.');
        fetchDeliveries();
        setVerifyCode('');
        setTimeout(() => setSelectedDelivery(null), 1500);
      } else {
        setDeliveryError(data.message || 'Incorrect verification code');
      }
    } catch (err) {
      setDeliveryError('Network error');
    }
  };

  // Chat integration
  const openChat = async (donationId, donorId, donorName) => {
    setActiveChatDonor({ id: donorId, username: donorName, donationId });
    fetchChatMessages(donationId, donorId);
  };

  const fetchChatMessages = async (donationId, donorId) => {
    try {
      const res = await fetch(`/api/chat/messages/${donationId}?partner_id=${donorId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatText || !activeChatDonor) return;

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          receiver_id: activeChatDonor.id,
          donation_id: activeChatDonor.donationId,
          message: chatText
        })
      });
      if (res.ok) {
        const newMsg = await res.json();
        setChatMessages(prev => [...prev, newMsg]);
        setChatText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Search filter handler
  const filteredFood = availableFood.filter(food => 
    food.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    food.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-container">
      {/* Navbar */}
      <header className="navbar">
        <div className="logo">🍲 FoodShare AI</div>
        <div className="nav-links">
          <span style={{ fontWeight: 600 }}>Hello, {user?.username} (NGO)</span>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>Log Out</button>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className={`sidebar-menu-item ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>
            <Search size={18} /> Browse Food
          </div>
          <div className={`sidebar-menu-item ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
            <ClipboardList size={18} /> My Requests
          </div>
          <div className={`sidebar-menu-item ${activeTab === 'deliveries' ? 'active' : ''}`} onClick={() => setActiveTab('deliveries')}>
            <CheckSquare size={18} /> Volunteer & Deliveries
          </div>
          <div className={`sidebar-menu-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')} style={{ position: 'relative' }}>
            <Bell size={18} /> Notifications
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="notif-badge">{notifications.filter(n => !n.is_read).length}</span>
            )}
          </div>
        </aside>

        {/* Dashboard Main Content */}
        <main className="main-content">
          
          {/* BROWSE FOOD TAB */}
          {activeTab === 'browse' && (
            <div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search food items..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    style={{ paddingLeft: '2.5rem' }} 
                  />
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                </div>
                
                <select className="form-control" style={{ width: '200px' }} value={foodTypeFilter} onChange={e => { setFoodTypeFilter(e.target.value); fetchAvailableDonations(); }}>
                  <option value="">All Categories</option>
                  <option value="cooked">Cooked Meals</option>
                  <option value="produce">Fresh Produce</option>
                  <option value="dairy">Dairy Products</option>
                  <option value="raw_meat">Raw Meat</option>
                  <option value="bakery">Bakery Products</option>
                  <option value="packaged">Packaged Items</option>
                  <option value="dry">Dry Ration</option>
                </select>

                <button onClick={fetchAvailableDonations} className="btn btn-secondary">
                  <RefreshCw size={18} /> Refresh
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {filteredFood.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No surplus food matching filters found.</p> : 
                  filteredFood.map(don => (
                    <div key={don.id} className="food-card">
                      <div className="food-card-img" style={{ backgroundImage: don.image_url ? `url(${don.image_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        {!don.image_url && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '3rem' }}>🍲</div>}
                        <span className={`food-card-badge ${
                          don.risk_level === 'Safe' ? 'risk-safe' : 
                          don.risk_level === 'Medium Risk' ? 'risk-medium' : 'risk-high'
                        }`}>
                          {don.risk_level}
                        </span>
                      </div>
                      <div className="food-card-body">
                        <h4 className="food-card-title">{don.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{don.description}</p>
                        <p className="food-card-meta">
                          <MapPin size={14} /> Located at: {don.donor_address}
                        </p>
                        <p className="food-card-meta">Qty: {don.quantity} {don.quantity_unit} | Storage: {don.storage_condition}</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
                          Expiry: {new Date(don.estimated_expiry).toLocaleString()}
                        </p>
                        
                        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary" style={{ flex: 1, padding: '0.5rem 1rem' }} onClick={() => submitClaim(don.id)}>
                            Request Food
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => openChat(don.id, don.donor_id, don.donor_name)}>
                            <MessageSquare size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Chat panel */}
              {activeChatDonor && (
                <div className="panel" style={{ marginTop: '2.5rem', animation: 'fadeUp 0.3s ease' }}>
                  <h3 className="panel-title">
                    <span>Chatting with Donor: {activeChatDonor.username}</span>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setActiveChatDonor(null)}>Close</button>
                  </h3>
                  <div className="chat-window">
                    <div className="chat-messages-container">
                      {chatMessages.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Send a message to coordinate pickup location/details.</p> : 
                        chatMessages.map(msg => (
                          <div key={msg.id} className={`chat-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
                            {msg.message}
                          </div>
                        ))
                      }
                    </div>
                    <form onSubmit={sendChatMessage} className="chat-input-row">
                      <input type="text" className="chat-input" placeholder="Type a message..." value={chatText} onChange={e => setChatText(e.target.value)} />
                      <button type="submit" className="btn btn-primary" style={{ borderRadius: '0' }}>Send</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REQUESTS LIST TAB */}
          {activeTab === 'requests' && (
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Your Claim Requests</h3>
              <div className="panel">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Donation ID</th>
                      <th>Food Item</th>
                      <th>Donor Company</th>
                      <th>Requested At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No requests submitted.</td>
                      </tr>
                    ) : (
                      myRequests.map(req => (
                        <tr key={req.id}>
                          <td>#{req.donation_id}</td>
                          <td>{req.donation_title}</td>
                          <td>{req.donor_name}</td>
                          <td>{new Date(req.requested_at).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 700, color: req.status === 'accepted' ? 'var(--safe)' : req.status === 'pending' ? 'var(--warning)' : 'var(--danger)' }}>
                            {req.status.toUpperCase()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VOLUNTEER & DELIVERIES TAB */}
          {activeTab === 'deliveries' && (
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Active Delivery Tracking</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                {/* Deliveries list */}
                <div className="panel">
                  <h4 style={{ marginBottom: '1rem' }}>Active Deliveries</h4>
                  {myDeliveries.filter(d => d.tracking_status !== 'delivered').length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No active deliveries pending transit.</p>
                  ) : (
                    myDeliveries.filter(d => d.tracking_status !== 'delivered').map(del => (
                      <div key={del.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', borderLeft: '4px solid var(--info)', cursor: 'pointer' }} onClick={() => handleSelectDelivery(del)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{del.donation_title}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--info)', fontWeight: 700 }}>{del.tracking_status.toUpperCase()}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Volunteer: {del.volunteer_name || 'Not Assigned'}
                        </p>
                      </div>
                    ))
                  )}

                  <h4 style={{ margin: '2rem 0 1rem 0' }}>Completed Deliveries</h4>
                  {myDeliveries.filter(d => d.tracking_status === 'delivered').length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No completed deliveries log found.</p>
                  ) : (
                    myDeliveries.filter(d => d.tracking_status === 'delivered').map(del => (
                      <div key={del.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', borderLeft: '4px solid var(--safe)' }}>
                        <strong>{del.donation_title}</strong>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completed: {new Date(del.completed_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Tracking/Checkpoint form */}
                 {selectedDelivery && (
                  <div className="panel">
                    <h4 style={{ marginBottom: '1rem' }}>Delivery Details: {selectedDelivery.donation_title}</h4>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <TrackingMap 
                        key={selectedDelivery.id}
                        delivery={selectedDelivery} 
                        onLocationUpdate={handleLocationUpdate} 
                        isEditable={selectedDelivery.tracking_status !== 'delivered'} 
                      />
                    </div>
                    
                    {deliveryError && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{deliveryError}</div>}
                    {deliverySuccess && <div style={{ color: 'var(--safe)', marginBottom: '1rem' }}>{deliverySuccess}</div>}

                    {/* Step 1: Assign volunteer details */}
                    <form onSubmit={handleUpdateDelivery} style={{ marginBottom: '2rem' }}>
                      <div className="form-group">
                        <label className="form-label">Volunteer Driver Name</label>
                        <input type="text" className="form-control" value={volunteerName} onChange={e => setVolunteerName(e.target.value)} placeholder="e.g. Rahul Sharma" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Volunteer Phone Number</label>
                        <input type="text" className="form-control" value={volunteerPhone} onChange={e => setVolunteerPhone(e.target.value)} placeholder="+91 9555555555" />
                      </div>
                      <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                        Assign Volunteer / Pick Up Food
                      </button>
                    </form>

                    {/* Step 2: Complete checkpoint with verification code */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                      <h5 style={{ marginBottom: '0.5rem' }}>Complete Delivery Verification</h5>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Scan QR code or enter the unique verification key generated during donor matching:
                      </p>
                      
                      <div className="form-group" style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="text" className="form-control" placeholder="VRFY-XXXX" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} />
                        <button className="btn btn-primary" onClick={() => verifyAndCompleteDelivery(selectedDelivery.id)}>
                          Verify Code
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Notification Center</h3>
                <button onClick={markAllNotificationsRead} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  Mark all as read
                </button>
              </div>

              <div className="panel">
                {notifications.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>All caught up! No notifications yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {notifications.map(notif => (
                      <div key={notif.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: notif.is_read ? 'none' : '4px solid var(--primary-color)', opacity: notif.is_read ? 0.7 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '1rem' }}>{notif.title}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(notif.created_at).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{notif.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default NgoDashboard;
