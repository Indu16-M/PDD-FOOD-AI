import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, History, Brain, MessageSquare, MapPin, Truck, CheckCircle2, ShieldAlert } from 'lucide-react';
import TrackingMap from '../components/TrackingMap';

const DonorDashboard = () => {
  const { user, token, getAuthHeaders, logout } = useAuth();
  const navigate = useNavigate();
  
  // States
  const [donations, setDonations] = useState([]);
  const [history, setHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [donorDeliveries, setDonorDeliveries] = useState([]);
  
  // Form values
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [foodType, setFoodType] = useState('cooked');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('kg');
  const [storage, setStorage] = useState('ambient');
  const [temp, setTemp] = useState('25');
  const [prepTime, setPrepTime] = useState(new Date().toISOString().slice(0, 16));
  const [imageFile, setImageFile] = useState(null);
  
  // AI Preview State
  const [aiPreview, setAiPreview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState('post'); // 'post', 'active', 'history'
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [activeChatNgo, setActiveChatNgo] = useState(null); // {id, username}
  const [chatText, setChatText] = useState('');
  
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDonorDonations();
  }, [token]);

  const fetchDonorDonations = async () => {
    try {
      const res = await fetch('/api/donations/history', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setDonations(data.filter(d => d.status !== 'completed' && d.status !== 'expired'));
        setHistory(data.filter(d => d.status === 'completed' || d.status === 'expired'));
      }
    } catch (err) {
      console.error('Failed to load donations history', err);
    }
  };

  // AI shelf-life simulation
  const simulateAiExpiry = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/predict-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_type: foodType,
          storage_condition: storage,
          temperature_celsius: parseFloat(temp),
          prep_time: new Date(prepTime).toISOString()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiPreview(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handlePostDonation = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!title || !quantity) {
      setFormError('Please fill in title and quantity');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('food_type', foodType);
    formData.append('quantity', quantity);
    formData.append('quantity_unit', quantityUnit);
    formData.append('storage_condition', storage);
    formData.append('temperature_celsius', temp);
    formData.append('prep_time', new Date(prepTime).toISOString());
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: getAuthHeaders(), // Authorization header
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit donation');
      }
      
      setFormSuccess('Food donation posted successfully! Expiry predicted by AI.');
      // Reset form
      setTitle('');
      setDescription('');
      setQuantity('');
      setAiPreview(null);
      
      fetchDonorDonations();
      setActiveTab('active');
    } catch (err) {
      setFormError(err.message);
    }
  };

  const fetchDonorDeliveries = async () => {
    try {
      const res = await fetch('/api/ngo/deliveries', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setDonorDeliveries(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let interval;
    if (selectedDonation && ['accepted', 'picked_up', 'delivered'].includes(selectedDonation.status)) {
      // Poll every 4 seconds to get coordinate updates
      interval = setInterval(() => {
        fetchDonorDeliveries();
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDonation]);

  // Get NGO recommendations
  const getNgoMatches = async (donation) => {
    setSelectedDonation(donation);
    setRecommendations([]);
    fetchDonorDeliveries();
    try {
      // Fetch fresh donation details (including requests) first
      const detailRes = await fetch(`/api/donations/${donation.id}`, {
        headers: getAuthHeaders()
      });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setSelectedDonation(detailData);
      }

      // Fetch AI matching recommendations
      const res = await fetch(`/api/ai/recommend-ngos/${donation.id}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle request approval
  const approveNgoRequest = async (requestId) => {
    try {
      const res = await fetch(`/api/ngo/requests/${requestId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchDonorDonations();
        setSelectedDonation(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Chat methods
  const openChat = async (donation, ngoId, ngoName) => {
    setActiveChatNgo({ id: ngoId, username: ngoName, donationId: donation.id });
    fetchChatMessages(donation.id, ngoId);
  };

  const fetchChatMessages = async (donationId, ngoId) => {
    try {
      const res = await fetch(`/api/chat/messages/${donationId}?partner_id=${ngoId}`, {
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
    if (!chatText || !activeChatNgo) return;

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          receiver_id: activeChatNgo.id,
          donation_id: activeChatNgo.donationId,
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

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="navbar">
        <div className="logo">🍲 FoodShare AI</div>
        <div className="nav-links">
          <span style={{ fontWeight: 600 }}>Hello, {user?.username} (Donor)</span>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>Log Out</button>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Sidebar Nav */}
        <aside className="sidebar">
          <div 
            className={`sidebar-menu-item ${activeTab === 'post' ? 'active' : ''}`}
            onClick={() => { setActiveTab('post'); setSelectedDonation(null); }}
          >
            <PlusCircle size={18} /> Post Donation
          </div>
          <div 
            className={`sidebar-menu-item ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => { setActiveTab('active'); setSelectedDonation(null); }}
          >
            <Truck size={18} /> Active Donations
          </div>
          <div 
            className={`sidebar-menu-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); setSelectedDonation(null); }}
          >
            <History size={18} /> History
          </div>
        </aside>

        {/* Dashboard Content */}
        <main className="main-content">
          
          {/* POST DONATION TAB */}
          {activeTab === 'post' && (
            <div className="dashboard-grid">
              
              {/* Form panel */}
              <div className="panel">
                <h3 className="panel-title">List Food Surplus</h3>
                {formError && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontWeight: 600 }}>{formError}</div>}
                {formSuccess && <div style={{ color: 'var(--safe)', marginBottom: '1rem', fontWeight: 600 }}>{formSuccess}</div>}

                <form onSubmit={handlePostDonation}>
                  <div className="form-group">
                    <label className="form-label">Food Title / Item Name</label>
                    <input type="text" className="form-control" placeholder="e.g. Cooked Rice, Paneer Masala" value={title} onChange={e => setTitle(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description & Allergens</label>
                    <textarea className="form-control" rows="3" placeholder="Explain contents, ingredients, or containers..." value={description} onChange={e => setDescription(e.target.value)} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Food Type Category</label>
                      <select className="form-control" value={foodType} onChange={e => setFoodType(e.target.value)}>
                        <option value="cooked">Cooked Meals</option>
                        <option value="produce">Fresh Produce (Fruits/Veg)</option>
                        <option value="dairy">Dairy Products</option>
                        <option value="raw_meat">Raw Meat / Poultry</option>
                        <option value="bakery">Bakery / Bread</option>
                        <option value="packaged">Packaged Food</option>
                        <option value="dry">Dry Ration / Grains</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Quantity</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="number" className="form-control" placeholder="5" value={quantity} onChange={e => setQuantity(e.target.value)} />
                        <select className="form-control" style={{ width: '90px' }} value={quantityUnit} onChange={e => setQuantityUnit(e.target.value)}>
                          <option value="kg">kg</option>
                          <option value="L">Liters</option>
                          <option value="portions">Portions</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Storage Condition</label>
                      <select className="form-control" value={storage} onChange={e => setStorage(e.target.value)}>
                        <option value="ambient">Ambient (Room Temp)</option>
                        <option value="refrigerated">Refrigerated</option>
                        <option value="frozen">Frozen</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Storage Temp (°C)</label>
                      <input type="number" className="form-control" value={temp} onChange={e => setTemp(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Preparation Time</label>
                    <input type="datetime-local" className="form-control" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Upload Food Image</label>
                    <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                    Publish Surplus to Platform
                  </button>
                </form>
              </div>

              {/* AI/ML Expiry simulator box */}
              <div className="panel" style={{ backgroundColor: 'rgba(16, 185, 129, 0.03)', border: '2px dashed var(--primary-color)' }}>
                <h3 className="panel-title" style={{ color: 'var(--primary-color)' }}>
                  <Brain size={20} /> AI Expiry Predictor Preview
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Simulate how storage temperature and food type selections affect the predicted remaining shelf life and waste classification.
                </p>

                <button type="button" className="btn btn-secondary" onClick={simulateAiExpiry} disabled={aiLoading} style={{ width: '100%', marginBottom: '1.5rem' }}>
                  {aiLoading ? 'Analyzing...' : 'Calculate Remaining Shelf Life'}
                </button>

                {aiPreview && (
                  <div style={{ animation: 'fadeUp 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span>Predicted Shelf Life:</span>
                      <strong style={{ fontSize: '1.1rem' }}>{aiPreview.predicted_remaining_shelf_life_hours} Hours</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span>Classification Risk:</span>
                      <span className={`food-card-badge ${
                        aiPreview.risk_level === 'Safe' ? 'risk-safe' : 
                        aiPreview.risk_level === 'Medium Risk' ? 'risk-medium' : 'risk-high'
                      }`}>
                        {aiPreview.risk_level}
                      </span>
                    </div>

                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                      {aiPreview.risk_level === 'High Risk' ? (
                        <span style={{ color: 'var(--danger)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <ShieldAlert size={16} /> Urgent! Distribute locally immediately.
                        </span>
                      ) : (
                        <span style={{ color: 'var(--safe)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <CheckCircle2 size={16} /> Food is safe. Matches can be selected comfortably.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE DONATIONS TAB */}
          {activeTab === 'active' && (
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Your Active Surplus Posts</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {donations.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No active surplus items. Post one above!</p> : 
                  donations.map(don => (
                    <div key={don.id} className="food-card" style={{ cursor: 'pointer' }} onClick={() => getNgoMatches(don)}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 className="food-card-title">{don.title}</h4>
                          <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                            {don.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="food-card-meta">Type: {don.food_type} | Qty: {don.quantity} {don.quantity_unit}</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>
                          Expires: {new Date(don.estimated_expiry).toLocaleString()}
                        </p>
                        
                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Click to Match & Recommend NGOs
                          </span>
                          {don.qr_code_data && (
                            <img src={don.qr_code_data} alt="QR Code" style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Suggestions overlay/panel */}
              {selectedDonation && (
                <div className="panel" style={{ marginTop: '2.5rem', animation: 'fadeUp 0.3s ease' }}>
                  <h3 className="panel-title">
                    <span>
                      {['accepted', 'picked_up', 'delivered'].includes(selectedDonation.status)
                        ? `Live Delivery Tracker: "${selectedDonation.title}"`
                        : `AI Recommended Matches for "${selectedDonation.title}"`}
                    </span>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setSelectedDonation(null)}>Close</button>
                  </h3>
                  
                  {['accepted', 'picked_up', 'delivered'].includes(selectedDonation.status) ? (
                    <div>
                      {(() => {
                        const activeDelivery = donorDeliveries.find(d => d.donation_id === selectedDonation.id);
                        return activeDelivery ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start', marginBottom: '1.5rem' }}>
                            <div>
                              <TrackingMap 
                                key={activeDelivery.id}
                                delivery={activeDelivery} 
                                isEditable={false} 
                              />
                            </div>
                            <div className="panel" style={{ backgroundColor: 'var(--bg-tertiary)', border: 'none', padding: '1.5rem' }}>
                              <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Delivery Status: {activeDelivery.tracking_status.toUpperCase()}</h4>
                              <p style={{ marginBottom: '0.75rem' }}><strong>Volunteer Name:</strong> {activeDelivery.volunteer_name || 'Assigning volunteer...'}</p>
                              <p style={{ marginBottom: '0.75rem' }}><strong>Volunteer Phone:</strong> {activeDelivery.volunteer_phone || 'N/A'}</p>
                              <p style={{ marginBottom: '0.75rem' }}><strong>Verification Code:</strong> <code style={{ backgroundColor: 'var(--border-color)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>{activeDelivery.verification_code}</code></p>
                              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" style={{ padding: '0.5rem', width: '100%' }} onClick={() => openChat(selectedDonation, activeDelivery.ngo_id, activeDelivery.ngo_name)}>
                                  <MessageSquare size={16} /> Open Coordinator Chat
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p style={{ color: 'var(--text-muted)' }}>Preparing delivery data...</p>
                        );
                      })()}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      
                      {/* NGO scoring list */}
                      <div>
                        <h4 style={{ marginBottom: '1rem' }}>Ranked NGOs (Distance & Urgency compatible)</h4>
                        {recommendations.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Loading AI recommended matches...</p> : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {recommendations.map((rec, idx) => (
                              <div key={rec.ngo_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: idx === 0 ? '4px solid var(--primary-color)' : 'none' }}>
                                <div>
                                  <h5 style={{ fontSize: '1rem' }}>{rec.organization_name} {idx === 0 && '🌟 (Best Match)'}</h5>
                                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <MapPin size={12} style={{ display: 'inline' }} /> {rec.distance_km} km away | {rec.address}
                                  </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ display: 'block', fontWeight: 800, color: 'var(--primary-color)', fontSize: '1.1rem' }}>
                                    {rec.score}% Match
                                  </span>
                                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', marginTop: '0.5rem' }} onClick={() => openChat(selectedDonation, rec.ngo_id, rec.username)}>
                                    <MessageSquare size={12} /> Chat
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* NGO requests submitted */}
                      <div>
                        <h4 style={{ marginBottom: '1rem' }}>Incoming Requests for this Item</h4>
                        {selectedDonation.requests && selectedDonation.requests.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)' }}>Waiting for NGOs to submit requests...</p>
                        ) : (
                          <div>
                            {selectedDonation.requests && selectedDonation.requests.map(req => (
                              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                                <div>
                                  <strong>{req.ngo_name}</strong>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Requested at: {new Date(req.requested_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  {req.status === 'pending' ? (
                                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => approveNgoRequest(req.id)}>
                                      Approve & Assign Delivery
                                    </button>
                                  ) : (
                                    <span style={{ fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase' }}>
                                      {req.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}    </div>

                  {/* Active Chat panel */}
                  {activeChatNgo && (
                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                      <h4>Chatting with {activeChatNgo.username}</h4>
                      <div className="chat-window">
                        <div className="chat-messages-container">
                          {chatMessages.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No messages yet. Send a hello!</p> : 
                            chatMessages.map(msg => (
                              <div key={msg.id} className={`chat-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
                                {msg.message}
                                <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.8, textAlign: 'right', marginTop: '0.2rem' }}>
                                  {new Date(msg.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
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
            </div>
          )}

          {/* DONATION HISTORY TAB */}
          {activeTab === 'history' && (
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Donation Log (Completed/Expired)</h3>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Food Type</th>
                    <th>Quantity</th>
                    <th>Risk Category</th>
                    <th>Completed Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No historical logs available yet.</td>
                    </tr>
                  ) : (
                    history.map(item => (
                      <tr key={item.id}>
                        <td>#{item.id}</td>
                        <td>{item.title}</td>
                        <td>{item.food_type}</td>
                        <td>{item.quantity} {item.quantity_unit}</td>
                        <td>
                          <span className={`food-card-badge ${
                            item.risk_level === 'Safe' ? 'risk-safe' : 
                            item.risk_level === 'Medium Risk' ? 'risk-medium' : 'risk-high'
                          }`}>
                            {item.risk_level}
                          </span>
                        </td>
                        <td>{new Date(item.estimated_expiry).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 700, color: item.status === 'completed' ? 'var(--safe)' : 'var(--danger)' }}>
                          {item.status.toUpperCase()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default DonorDashboard;
