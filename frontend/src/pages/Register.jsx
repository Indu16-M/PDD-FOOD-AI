import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Sun, Moon } from 'lucide-react';

const Register = () => {
  const { registerUser, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  // General fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('donor'); // 'donor', 'ngo'
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('12.9716');
  const [longitude, setLongitude] = useState('77.5946');

  // NGO Specific fields
  const [orgName, setOrgName] = useState('');
  const [regNum, setRegNum] = useState('');
  const [taxId, setTaxId] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [preferredFood, setPreferredFood] = useState('cooked,bakery,produce,dry');
  const [website, setWebsite] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !address || !phone) {
      setError('Please fill in all general fields');
      return;
    }

    if (role === 'ngo' && (!orgName || !regNum)) {
      setError('NGO Organization Name and Registration Number are required.');
      return;
    }

    setError('');
    setLoading(true);

    const payload = {
      username,
      email,
      password,
      role,
      phone,
      address,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      ...(role === 'ngo' && {
        organization_name: orgName,
        registration_number: regNum,
        tax_id: taxId,
        capacity_people: parseInt(capacity),
        preferred_food_types: preferredFood,
        website: website
      })
    };

    try {
      const data = await registerUser(payload);
      setSuccess(data.message || 'Registration completed successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different username or email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '120vh', padding: '2rem' }}>
      
      {/* Header theme toggle */}
      <div style={{ alignSelf: 'flex-end', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={toggleTheme} className="theme-toggle" style={{ width: '40px', height: '40px' }} aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      <div className="auth-card" style={{ width: '100%', maxWidth: '640px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Connect to the AI food waste reduction engine</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--safe)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            {success} Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. fresh_bakery"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="role">Role Type</label>
              <select
                id="role"
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="donor">Food Donor (Restaurant, Hotel, Household)</option>
                <option value="ngo">NGO / Food Receiver</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="address">Full Address</label>
              <input
                id="address"
                type="text"
                className="form-control"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street name, City"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="latitude">Latitude</label>
              <input
                id="latitude"
                type="text"
                className="form-control"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 12.9716"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="longitude">Longitude</label>
              <input
                id="longitude"
                type="text"
                className="form-control"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 77.5946"
              />
            </div>
          </div>

          {/* NGO SPECIFIC SECTIONS */}
          {role === 'ngo' && (
            <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', marginTop: '1rem', marginBottom: '1rem' }}>
              <legend style={{ padding: '0 0.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>NGO Profile Details</legend>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="orgName">Organization Name</label>
                  <input
                    id="orgName"
                    type="text"
                    className="form-control"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Feed The Needy"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="regNum">Govt Registration #</label>
                  <input
                    id="regNum"
                    type="text"
                    className="form-control"
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                    placeholder="REG-8923091"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="taxId">Tax identification ID</label>
                  <input
                    id="taxId"
                    type="text"
                    className="form-control"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="TAX-NGO-1923"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="capacity">Capacity (People served/day)</label>
                  <input
                    id="capacity"
                    type="number"
                    className="form-control"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="preferredFood">Preferred Food Types (comma-separated)</label>
                <input
                  id="preferredFood"
                  type="text"
                  className="form-control"
                  value={preferredFood}
                  onChange={(e) => setPreferredFood(e.target.value)}
                  placeholder="e.g. cooked,bakery,produce,dry"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="website">Website URL</label>
                <input
                  id="website"
                  type="url"
                  className="form-control"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourngo.org"
                />
              </div>
            </fieldset>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : (
              <>
                <UserPlus size={18} /> Register Account
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
