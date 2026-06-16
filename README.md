# AI-Driven Food Sharing Platform with Expiry Prediction

A complete, production-ready full-stack platform designed to minimize food waste by connecting surplus food donors (hotels, restaurants, supermarkets) with NGOs and local distribution networks. The system integrates machine learning (Random Forest models) to estimate remaining shelf life based on category properties and storage conditions, ranks matching NGOs using location distance weights, generates QR tracking passes, and provides interactive analytics logs.

---

## Key Features

1. **AI Expiry Estimation**: Predicts the remaining shelf life of food items (in hours) based on categories (cooked, meat, dairy, produce, etc.), storage mode (ambient, cold, frozen), temperature, and age since prep.
2. **Waste Risk Classification**: Classifies listings automatically (`Safe`, `Medium Risk`, `High Risk`) to optimize priority distribution queues.
3. **Smart NGO Recommendation Engine**: Sorts nearby NGOs using location coordinate offsets (Haversine formula), capacity constraints, food categories, and expiry deadlines.
4. **Interactive Dashboard Visuals**: Live charts rendering historical savings progress and categories breakups.
5. **QR Code Logistical Tracking**: Generates unique security hashes representing checkpoints from donor publishing to NGO delivery completion.
6. **Integrated Chat**: Direct instant messaging between NGO coordinators and food donors.

---

## Project Structure

```
├── backend/
│   ├── app.py                     # Entrypoint & database seed script
│   ├── config.py                  # API secret tokens & fallback paths
│   ├── models.py                  # SQLAlchemy relation schemas
│   ├── requirements.txt           # Python dependencies
│   ├── Dockerfile                 # API server containerization
│   ├── ml/
│   │   └── ml_train.py            # ML model generation & dataset compiler
│   ├── routes/
│   │   ├── auth.py                # Signups & profile edits
│   │   ├── donations.py           # Donation logs & QR code builders
│   │   ├── ngo.py                 # Claims matching & volunteers routing
│   │   ├── admin.py               # Analytical tools & user control panel
│   │   ├── ai.py                  # Expiry simulation & linear forecasts
│   │   ├── chat.py                # Chat messenger
│   │   └── notifications.py       # Notifications tray alerts
│   └── services/
│       └── matching_service.py    # Haversine distance matches
│
├── database/
│   ├── schema.sql                 # Complete MySQL DDL schema
│   └── seed.sql                   # Sample donor & NGO listings
│
├── frontend/
│   ├── package.json               # Node packages
│   ├── index.html                 # Main markup with SEO metadata
│   ├── vite.config.js             # API proxy rules
│   ├── Dockerfile                 # Web client containerization
│   └── src/
│       ├── main.jsx               # React client root
│       ├── index.css              # Custom Vanilla design framework (Light/Dark themes)
│       ├── App.jsx                # Layout routes & login checks
│       ├── context/
│       │   └── AuthContext.jsx    # Auth tokens & global state
│       └── pages/
│           ├── Login.jsx          # Login screen
│           ├── Register.jsx       # Dynamic signup form
│           ├── DonorDashboard.jsx # Donor interface & matches drawer
│           ├── NgoDashboard.jsx   # NGO browse lists & verification entries
│           └── AdminDashboard.jsx # System metrics & verification tables
│
├── mobile/
│   └── App.js                     # React Native / Expo shell mock UI
│
├── documentation/
│   └── design.md                  # UML workflows & ER diagrams
│
├── tests/
│   └── test_api.py                # Backend endpoints unit test suite
│
└── docker-compose.yml             # System orchestrator compose config
```

---

## Local Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- MySQL (Optional, default settings use zero-configuration SQLite for local testing)

### 1. Build and Train the ML Models
First, install backend dependencies and run the ML compiler script to train and save the shelf life predictor and waste forecaster models:
```bash
cd backend
pip install -r requirements.txt
python ml/ml_train.py
```

### 2. Start the Backend API
Start the Flask development server on port 5000:
```bash
python app.py
```
*(On startup, the system will automatically create `food_sharing.db` SQLite database and seed it with dummy records representing admins, hotels, supermarkets, and NGOs)*

### 3. Start the Frontend client
Open a new terminal, install dependencies, and run the Vite React app:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Running with Docker Compose

To run the entire stack (Vite frontend, Flask API, and MySQL database container) using Docker:
```bash
docker-compose up --build
```
The client dashboard will be available at [http://localhost:3000](http://localhost:3000) and the API server at [http://localhost:5000](http://localhost:5000).

---

## Running Automated Tests

To verify JWT routers, database transactions, and model predictions:
```bash
python -m unittest tests/test_api.py
```

---

## Production Deployment Checklist

1. **Database**: Change `USE_MYSQL` to `True` in production and configure database URI parameters (`DB_USER`, `DB_PASSWORD`, `DB_HOST`) to point to a managed RDS or Cloud SQL instance.
2. **Secret Keys**: Overwrite the default `SECRET_KEY` and `JWT_SECRET_KEY` config strings with secure environment variables.
3. **Map Tiles**: Supply a valid Google Maps API token to load interactive map canvas tiles rather than coordinate fallbacks.
4. **Static Assets**: Bind the Flask `/uploads/` file stream folder to an AWS S3 bucket or Google Cloud Storage container.
