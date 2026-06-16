import os
from datetime import timedelta

class Config:
    # Basic security keys
    SECRET_KEY = os.environ.get('SECRET_KEY', 'food-sharing-secret-hash-908123')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-token-signing-key-109238')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Database Configuration (Defaults to local SQLite, but parses MySQL if present)
    mysql_user = os.environ.get('DB_USER', 'root')
    mysql_password = os.environ.get('DB_PASSWORD', '')
    mysql_host = os.environ.get('DB_HOST', 'localhost')
    mysql_port = os.environ.get('DB_PORT', '3306')
    mysql_db = os.environ.get('DB_NAME', 'food_sharing_db')
    
    # Check if we should use MySQL or SQLite
    if os.environ.get('USE_MYSQL', 'False').lower() == 'true':
        SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}"
    else:
        # Fallback to local SQLite file in backend directory
        base_dir = os.path.abspath(os.path.dirname(__file__))
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(base_dir, 'food_sharing.db')}"
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Image upload configurations
    UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    
    # AI/ML Saved Model Paths
    ML_MODEL_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'ml', 'expiry_model.joblib')
    FORECAST_MODEL_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'ml', 'forecast_model.joblib')
