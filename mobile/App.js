import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  StatusBar,
  Alert 
} from 'react-native';

export default function App() {
  const [role, setRole] = useState('login'); // 'login', 'donor', 'ngo'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Donor posting states
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [foodType, setFoodType] = useState('cooked');
  const [expiryText, setExpiryText] = useState('');
  const [riskLevel, setRiskLevel] = useState('');

  // NGO verification code
  const [verifyCode, setVerifyCode] = useState('');

  const handleLogin = () => {
    if (!username) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (username.toLowerCase().includes('donor') || username.toLowerCase().includes('hotel')) {
      setRole('donor');
    } else {
      setRole('ngo');
    }
  };

  const handlePredictExpiry = () => {
    // Mobile Rule-based ML prediction logic
    let remaining = 24;
    let level = 'Safe';

    if (foodType === 'cooked') {
      remaining = 4;
      level = 'High Risk';
    } else if (foodType === 'dairy' || foodType === 'raw_meat') {
      remaining = 12;
      level = 'Medium Risk';
    }
    
    setExpiryText(`${remaining} Hours Remaining`);
    setRiskLevel(level);
    Alert.alert('AI Prediction', `Predicted shelf life: ${remaining} hrs.\nWaste Risk: ${level}`);
  };

  const handleSubmitDonation = () => {
    if (!title || !quantity) {
      Alert.alert('Error', 'Please fill in title and quantity');
      return;
    }
    Alert.alert('Success', 'Surplus donation published successfully!');
    setTitle('');
    setQuantity('');
    setExpiryText('');
    setRiskLevel('');
  };

  const handleVerifyDelivery = () => {
    if (!verifyCode) {
      Alert.alert('Error', 'Please enter a verification code');
      return;
    }
    if (verifyCode.toUpperCase().startsWith('VRFY-') || verifyCode === '1234') {
      Alert.alert('Success', 'Delivery verified! QR status changed to COMPLETED.');
      setVerifyCode('');
    } else {
      Alert.alert('Error', 'Invalid Verification Code');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER NAVBAR */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍲 FoodShare AI Mobile</Text>
        {role !== 'login' && (
          <TouchableOpacity onPress={() => setRole('login')} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* LOGIN SCREEN */}
      {role === 'login' && (
        <View style={styles.authContainer}>
          <Text style={styles.title}>Welcome to FoodShare</Text>
          <Text style={styles.subtitle}>Enter credentials to access mobile dashboard</Text>
          
          <TextInput 
            style={styles.input}
            placeholder="Username (e.g. hotel_donor, feed_ngo)"
            placeholderTextColor="#94a3b8"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput 
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DONOR MOBILE SCREEN */}
      {role === 'donor' && (
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>List Surplus Food</Text>
            
            <Text style={styles.label}>Food Name</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. Mixed veg, Samosa tray"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Quantity (kg / portions)</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. 5"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />

            <Text style={styles.label}>Food Category</Text>
            <View style={styles.categoryRow}>
              {['cooked', 'dairy', 'produce', 'dry'].map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.chip, foodType === type && styles.chipActive]}
                  onPress={() => setFoodType(type)}
                >
                  <Text style={[styles.chipText, foodType === type && styles.chipTextActive]}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.button, styles.btnOutline]} onPress={handlePredictExpiry}>
              <Text style={styles.btnOutlineText}>Predict Expiry Shelf-Life</Text>
            </TouchableOpacity>

            {expiryText ? (
              <View style={styles.predictionBox}>
                <Text style={styles.predictionText}>AI Remaining: {expiryText}</Text>
                <Text style={[
                  styles.riskText, 
                  riskLevel === 'High Risk' ? styles.riskHigh : 
                  riskLevel === 'Medium Risk' ? styles.riskMedium : styles.riskSafe
                ]}>
                  Risk Status: {riskLevel}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.button} onPress={handleSubmitDonation}>
              <Text style={styles.buttonText}>Publish Donation</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* NGO MOBILE SCREEN */}
      {role === 'ngo' && (
        <ScrollView style={styles.scrollContainer}>
          
          {/* Claim listings */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Pickup Deliveries</Text>
            <View style={styles.deliveryItem}>
              <Text style={styles.deliveryTitle}>Vegetable Biryani (10 Portions)</Text>
              <Text style={styles.deliveryMeta}>From: Grand Hotel | Indiranagar</Text>
              <Text style={styles.statusLabel}>ASSIGNED</Text>
            </View>
          </View>

          {/* Verification scan */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>QR Code & Verification Scan</Text>
            <Text style={styles.desc}>
              Scan the printed donation voucher at the donor site, or type the numeric verification code:
            </Text>
            
            <TextInput 
              style={styles.input}
              placeholder="VRFY-XXXX"
              placeholderTextColor="#94a3b8"
              value={verifyCode}
              onChangeText={setVerifyCode}
            />

            <TouchableOpacity style={styles.button} onPress={handleVerifyDelivery}>
              <Text style={styles.buttonText}>Confirm & Complete Delivery</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    height: 60,
    backgroundColor: '#111827',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    color: '#00F294',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#1f2937',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  logoutText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    borderWidth: 1,
    color: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: '#10b981',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  btnOutlineText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  predictionBox: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  predictionText: {
    color: '#f8fafc',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riskText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  riskHigh: { color: '#ef4444' },
  riskMedium: { color: '#f59e0b' },
  riskSafe: { color: '#10b981' },
  deliveryItem: {
    backgroundColor: '#1f2937',
    padding: 14,
    borderRadius: 8,
  },
  deliveryTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deliveryMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  statusLabel: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 8,
  },
  desc: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  }
});
