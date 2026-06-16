import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib

def generate_synthetic_expiry_data(num_samples=2000):
    np.random.seed(42)
    
    # Categories
    food_types = ['cooked', 'raw_meat', 'dairy', 'bakery', 'produce', 'packaged', 'dry']
    storage_conditions = ['ambient', 'refrigerated', 'frozen']
    
    # Randomly draw inputs
    types = np.random.choice(food_types, num_samples)
    conditions = np.random.choice(storage_conditions, num_samples)
    
    temperatures = []
    hours_since_prep = np.random.exponential(scale=6.0, size=num_samples).clip(0.1, 48.0)
    
    for t, cond in zip(types, conditions):
        # Assign realistic temperature ranges based on storage conditions
        if cond == 'frozen':
            temperatures.append(np.random.uniform(-22.0, -10.0))
        elif cond == 'refrigerated':
            temperatures.append(np.random.uniform(1.0, 7.0))
        else: # ambient
            temperatures.append(np.random.uniform(18.0, 42.0))
            
    temperatures = np.array(temperatures)
    
    # Calculate target (remaining shelf life in hours) based on a realistic biological model
    base_shelf_lives = {
        'cooked': 8.0,
        'raw_meat': 12.0,
        'dairy': 24.0,
        'bakery': 36.0,
        'produce': 48.0,
        'packaged': 360.0,
        'dry': 720.0
    }
    
    remaining_shelf_lives = []
    for i in range(num_samples):
        ftype = types[i]
        cond = conditions[i]
        temp = temperatures[i]
        h_prep = hours_since_prep[i]
        
        base = base_shelf_lives[ftype]
        
        # Multipliers based on temperature and storage
        # frozen increases shelf life significantly
        if cond == 'frozen' and ftype in ['raw_meat', 'cooked', 'dairy', 'produce']:
            multiplier = np.random.uniform(8.0, 15.0)
        elif cond == 'refrigerated' and ftype in ['raw_meat', 'dairy', 'produce', 'cooked']:
            multiplier = np.random.uniform(3.0, 6.0)
        else: # ambient or inappropriate combinations (e.g. ambient raw meat)
            if ftype in ['raw_meat', 'dairy'] and cond == 'ambient':
                multiplier = np.random.uniform(0.1, 0.3)
            elif ftype == 'cooked' and temp > 30.0:
                multiplier = np.random.uniform(0.4, 0.8) # Spoils fast in heat
            else:
                multiplier = np.random.uniform(1.0, 1.5)
                
        # Total potential shelf life
        total_shelf_life = base * multiplier
        
        # Remaining shelf life
        remaining = total_shelf_life - h_prep
        # Cannot be less than 0
        remaining = max(0.0, remaining)
        
        remaining_shelf_lives.append(remaining)
        
    df = pd.DataFrame({
        'food_type': types,
        'storage_condition': conditions,
        'temperature_celsius': temperatures,
        'hours_since_prep': hours_since_prep,
        'remaining_shelf_life': remaining_shelf_lives
    })
    
    return df

def generate_synthetic_waste_data(num_samples=1000):
    np.random.seed(43)
    
    # Variables representing donor profiles and monthly analytics
    # Features: month (1-12), day_of_week (0-6), food_type, preparation_quantity_kg
    months = np.random.randint(1, 13, num_samples)
    days = np.random.randint(0, 7, num_samples)
    food_types = np.random.choice(['cooked', 'raw_meat', 'dairy', 'bakery', 'produce', 'packaged', 'dry'], num_samples)
    quantities = np.random.uniform(5.0, 250.0, num_samples)
    
    # Waste quantity forecast: higher on weekends (Friday=4, Saturday=5, Sunday=6), higher prep quantity
    wastes = []
    for m, d, t, q in zip(months, days, food_types, quantities):
        base_waste_pct = 0.05 # 5% baseline waste
        # Cooked food & produce waste more
        if t in ['cooked', 'produce']:
            base_waste_pct += np.random.uniform(0.05, 0.15)
        # Weekends waste more (e.g., weddings, buffet leftovers)
        if d in [4, 5, 6]:
            base_waste_pct += np.random.uniform(0.05, 0.10)
        # Summer months waste more due to heat (May, June, July, August)
        if m in [5, 6, 7, 8]:
            base_waste_pct += np.random.uniform(0.02, 0.08)
            
        waste_kg = q * base_waste_pct
        wastes.append(waste_kg)
        
    df = pd.DataFrame({
        'month': months,
        'day_of_week': days,
        'food_type': food_types,
        'preparation_quantity': quantities,
        'predicted_waste_kg': wastes
    })
    return df

def train_models():
    print("Generating synthetic datasets...")
    df_expiry = generate_synthetic_expiry_data()
    df_waste = generate_synthetic_waste_data()
    
    # 1. Expiry Prediction Model
    print("Training Food Expiry Prediction Model...")
    X_exp = df_expiry[['food_type', 'storage_condition', 'temperature_celsius', 'hours_since_prep']]
    y_exp = df_expiry['remaining_shelf_life']
    
    X_train_e, X_test_e, y_train_e, y_test_e = train_test_split(X_exp, y_exp, test_size=0.2, random_state=42)
    
    # Preprocessor for Categorical Columns
    categorical_cols = ['food_type', 'storage_condition']
    numerical_cols = ['temperature_celsius', 'hours_since_prep']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_cols)
        ],
        remainder='passthrough'
    )
    
    # Random Forest Pipeline
    expiry_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    expiry_pipeline.fit(X_train_e, y_train_e)
    score_e = expiry_pipeline.score(X_test_e, y_test_e)
    print(f"Expiry Model R2 Score on Test Set: {score_e:.4f}")
    
    # 2. Waste Forecasting Model
    print("Training Food Waste Forecasting Model...")
    X_w = df_waste[['month', 'day_of_week', 'food_type', 'preparation_quantity']]
    y_w = df_waste['predicted_waste_kg']
    
    X_train_w, X_test_w, y_train_w, y_test_w = train_test_split(X_w, y_w, test_size=0.2, random_state=42)
    
    waste_preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), ['food_type'])
        ],
        remainder='passthrough'
    )
    
    waste_pipeline = Pipeline(steps=[
        ('preprocessor', waste_preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    waste_pipeline.fit(X_train_w, y_train_w)
    score_w = waste_pipeline.score(X_test_w, y_test_w)
    print(f"Waste Forecast Model R2 Score on Test Set: {score_w:.4f}")
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    
    # Save models
    expiry_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'expiry_model.joblib')
    forecast_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'forecast_model.joblib')
    
    joblib.dump(expiry_pipeline, expiry_path)
    joblib.dump(waste_pipeline, forecast_path)
    
    print(f"Successfully saved models to:\n  - {expiry_path}\n  - {forecast_path}")

if __name__ == '__main__':
    train_models()
