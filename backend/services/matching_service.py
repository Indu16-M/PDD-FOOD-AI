import math

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points on the 
    Earth in kilometers using the Haversine formula.
    """
    # Earth radius in kilometers
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2)**2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def calculate_match_score(donation, ngo, ngo_profile):
    """
    Compute a compatibility match score (0 to 100) between a FoodDonation and an NGO.
    Higher score indicates a better recommended match.
    """
    score = 100.0
    
    # 1. Distance Calculation
    donor_lat = donation.donor.latitude if donation.donor else 0.0
    donor_lon = donation.donor.longitude if donation.donor else 0.0
    ngo_lat = ngo.latitude
    ngo_lon = ngo.longitude
    
    distance = haversine_distance(donor_lat, donor_lon, ngo_lat, ngo_lon)
    
    # Distance Penalty: Deduct points based on distance (ideal within 10 km)
    if distance <= 2.0:
        score += 10.0 # Super close!
    elif distance <= 10.0:
        score -= (distance - 2.0) * 2.0 # Minimal deduction
    elif distance <= 30.0:
        score -= (distance * 1.5) # Modest deduction
    else:
        score -= (distance * 3.0) # Huge deduction for long distances
        
    # 2. Expiry Urgency matching
    remaining_hours = donation.remaining_shelf_life_hours
    
    if remaining_hours <= 0.0:
        return 0.0 # Already expired, no match possible
        
    if remaining_hours <= 4.0:
        # High urgency: Needs nearby NGOs
        if distance <= 5.0:
            score += 40.0  # Boost score for local match
        else:
            score -= 60.0  # Penalize if far; they won't make it in time
    elif remaining_hours <= 12.0:
        # Medium urgency
        if distance <= 15.0:
            score += 20.0
        else:
            score -= 20.0
            
    # 3. Preferred Food Types compatibility
    if ngo_profile:
        preferred = [t.strip().lower() for t in ngo_profile.preferred_food_types.split(',')]
        donation_type = donation.food_type.lower()
        
        if 'all' in preferred or donation_type in preferred:
            score += 20.0
        else:
            score -= 40.0 # Preferred type mismatch
            
        # 4. Capacity matching (based on estimated portions/people vs NGO daily capacity)
        # Approximate: 1 kg cooked food serves ~3-4 people.
        estimated_portions = donation.quantity * 3.0
        if ngo_profile.capacity_people >= estimated_portions:
            score += 10.0
        else:
            # NGO is too small for this donation, reduce recommendation index slightly
            score -= 10.0
            
    # Normalize score between 0 and 100
    score = max(0.0, min(100.0, score))
    return {
        'score': round(score, 1),
        'distance_km': round(distance, 2),
        'ngo_id': ngo.id,
        'username': ngo.username,
        'address': ngo.address,
        'phone': ngo.phone,
        'organization_name': ngo_profile.organization_name if ngo_profile else ngo.username
    }

def recommend_ngos(donation, ngo_users, limit=5):
    """
    Ranks the list of NGOs based on compatibility with the given donation.
    """
    recommendations = []
    for ngo in ngo_users:
        # Only consider active, approved NGOs
        if ngo.status != 'active':
            continue
            
        profile = ngo.ngo_profile
        rec = calculate_match_score(donation, ngo, profile)
        if rec['score'] > 10.0: # Filter out extremely poor matches
            recommendations.append(rec)
            
    # Sort by score descending, distance ascending
    recommendations.sort(key=lambda x: (-x['score'], x['distance_km']))
    return recommendations[:limit]
