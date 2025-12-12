
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import SQLModel, Field, Session, create_engine, select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
import os
import secrets
import traceback
import base64
import asyncio
import json
from google.oauth2 import id_token
from google.auth.transport import requests
import requests as http_requests
from google import genai
from google.genai import types
from .gemini_service import analyze_video

# --- CONFIGURATION ---
SECRET_KEY = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_CHANGE_ME_IN_PROD") 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
SQLITE_FILE_NAME = "physiovibe.db"
# Use env var for DB (Postgres in prod), fallback to local SQLite
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///./{SQLITE_FILE_NAME}")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

PROJECT_ID = os.getenv("PROJECT_ID", "ai-agent-477309")
LOCATION = os.getenv("LOCATION", "us-central1")
MODEL_ID = "gemini-2.0-flash-exp"

# --- DATABASE MODELS ---
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    full_name: str
    role: str = "PATIENT" # 'PATIENT' or 'CLINICIAN'
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Appointment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    title: str
    doctor: str
    date_str: str # e.g. "Oct 28"
    time_str: str # e.g. "11:00 AM"
    type: str # "Video Call" or "In-person"

class UserStats(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    pain_level: int = 0
    pain_history: str = "" 
    program_completion: int = 0
    adherence_score: int = 0
    streak_days: int = 0

# Pydantic Schemas for API
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "PATIENT"

class UserRead(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class GoogleToken(BaseModel):
    token: str

class AnalysisRequest(BaseModel):
    base64_video: str
    activity_name: str
    mime_type: str = "video/webm"

# --- SETUP ---
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True, pool_recycle=300)
# Create tables on startup
SQLModel.metadata.create_all(engine)

app = FastAPI(title="PhysioVibe API")
print("--- SERVER RELOADED WITH UUID FIX ---")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# --- UTILITIES ---
def get_session():
    with Session(engine) as session:
        yield session

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()
    if user is None:
        raise credentials_exception
    return user

# --- ENDPOINTS ---

@app.post("/auth/signup", response_model=UserRead)
def signup(user: UserCreate, session: Session = Depends(get_session)):
    # Check existing
    statement = select(User).where(User.email == user.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create User
    hashed_pw = get_password_hash(user.password)
    db_user = User(
        email=user.email, 
        hashed_password=hashed_pw, 
        full_name=user.full_name, 
        role=user.role
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    # Note: OAuth2PasswordRequestForm expects 'username', so we map email to it
    statement = select(User).where(User.email == form_data.username)
    user = session.exec(statement).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@app.post("/auth/google", response_model=Token)
def google_login(token_data: GoogleToken, session: Session = Depends(get_session)):
    try:
        # Verify Access Token via UserInfo Endpoint
        response = http_requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_data.token}"}
        )
        
        if response.status_code != 200:
            print(f"Google Error: {response.text}") # Log to console
            raise ValueError(f"Google API Error: {response.text}")
            
        id_info = response.json()
        
        # ... rest of logic
        
        # Extract info
        email = id_info['email']
        name = id_info.get('name', '')
        google_id = id_info['id'] # Unique Google ID
        
        # Check if user exists
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if not user:
            # Auto-register
            print("CRITICAL DEBUG: Creating new user from Google - BYPASSING HASH")
            
            # NUCLEAR FIX: Do NOT use bcrypt for this user. 
            # Since they login via Google, they don't need a password hash.
            # We set a placeholder that will fail any password login (which is good!)
            hashed_pw = "GOOGLE_OAUTH_USER_NO_PASSWORD"
            
            user = User(
                email=email,
                hashed_password=hashed_pw,
                full_name=name,
                role="GEN_PATIENT"
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            
        # Create Access Token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role}, 
            expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "role": user.role}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/users/me", response_model=UserRead)
def update_user(user_update: UserUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    if user_update.dob is not None:
        current_user.dob = user_update.dob
    if user_update.gender is not None:
        current_user.gender = user_update.gender
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user

@app.get("/users/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- DASHBOARD DATA MODELS ---

@app.post("/analyze")
def analyze_session(request: AnalysisRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    try:
        # 1. Run Analysis
        result = analyze_video(request.base64_video, request.activity_name, request.mime_type)
        
        # 2. Persist Stats
        try:
            statement = select(UserStats).where(UserStats.user_id == current_user.id)
            stats = session.exec(statement).first()
            
            if not stats:
                stats = UserStats(user_id=current_user.id)
            
            # Update Pain Logic
            # If pain_detected is True, we assume a high pain level (e.g., 7-8), else low (1-3)
            # In a real app, the AI could return a precise score.
            is_pain = result.get('pain_detected', False)
            new_pain_val = 7 if is_pain else 2
            
            stats.pain_level = new_pain_val
            
            # Update History (Keep last 10)
            history = stats.pain_history.split(',') if stats.pain_history else []
            history.append(str(new_pain_val))
            if len(history) > 10:
                history = history[-10:]
            stats.pain_history = ",".join(history)
            
            # Update Progression
            stats.streak_days += 1
            stats.program_completion = min(stats.program_completion + 5, 100)
            
            # Save
            session.add(stats)
            session.commit()
            print(f"✅ User Stats Updated: Pain={new_pain_val}, Streak={stats.streak_days}")
            
        except Exception as db_err:
            print(f"⚠️ Failed to save stats: {db_err}")
            # Don't fail the request if DB save fails, just log it.
        
        return result
    except Exception as e:
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# moved to top

# --- DASHBOARD ENDPOINTS ---

@app.get("/appointments")
def get_appointments(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(Appointment).where(Appointment.user_id == current_user.id)
    results = session.exec(statement).all()
    
    # Auto-seed removed for clean slate
    # if not results: ...
        
    return results
        
    return results

@app.get("/stats")
def get_stats(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(UserStats).where(UserStats.user_id == current_user.id)
    stats = session.exec(statement).first()
    
    if not stats:
        # Create default stats
        stats = UserStats(user_id=current_user.id)
        session.add(stats)
        session.commit()
        session.refresh(stats)
        
    return stats

@app.get("/")
def root():
    return {"message": "PhysioVibe API is running"}

# --- WEBSOCKET ENDPOINT ---

# --- CONFIG ---
# --- CONFIG ---
PROJECT_ID = "ai-agent-477309"
LOCATION = "us-central1"
MODEL_ID = "gemini-2.0-flash-exp" 

@app.websocket("/ws/live-safety-monitor")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("--- STARTING SAFETY MONITOR SESSION (User Logic / Text-Based) ---")
    
    # Auth
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("VITE_GEMINI_API_KEY")
    if not api_key:
        print("❌ ERROR: Missing GEMINI_API_KEY")
        await websocket.close(code=1008)
        return

    # User's Logic: v1alpha + Text Mode + API Key
    client = genai.Client(
        api_key=api_key, 
        http_options={'api_version': 'v1alpha'}
    )
    
    # System Instruction from User's Working Code
    SYSTEM_INSTRUCTION = (
        "You are a medical monitoring AI. Analyze the incoming video and audio stream. "
        "If you detect facial grimacing, wincing, crying, or grunting indicative of pain, "
        "output the text 'PAIN_DETECTED'. Otherwise, remain silent."
    )
    
    config = {
        "response_modalities": ["TEXT"],
        "system_instruction": SYSTEM_INSTRUCTION,
    }

    try:
        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            print("✅ Connected to Gemini Live session")

            async def receive_from_client():
                """Receives media from React frontend and forwards to Gemini."""
                try:
                    while True:
                        data = await websocket.receive_text()
                        message = json.loads(data)

                        # Handle different media types (User's JSON format)
                        if "audio" in message:
                            # Frontend sends base64 encoded PCM (16kHz)
                            audio_data = base64.b64decode(message["audio"])
                            await session.send(input={"mime_type": "audio/pcm", "data": audio_data}, end_of_turn=False)
                        
                        elif "image" in message:
                            # Frontend sends base64 encoded JPEG
                            image_data = base64.b64decode(message["image"])
                            await session.send(input={"mime_type": "image/jpeg", "data": image_data}, end_of_turn=False)
                
                except WebSocketDisconnect:
                    print("Client disconnected (receive loop)")
                except Exception as e:
                    print(f"Error in receive_from_client: {e}")

            async def send_to_client():
                """Receives text from Gemini and forwards alerts to React frontend."""
                try:
                    while True:
                        async for response in session.receive():
                            if response.server_content is None:
                                continue
                            
                            model_turn = response.server_content.model_turn
                            if model_turn:
                                for part in model_turn.parts:
                                    if part.text:
                                        text = part.text
                                        print(f"Gemini: {text}")
                                        
                                        # Parse for the Magic Word "PAIN_DETECTED" or "PAIN"
                                        if "PAIN" in text:
                                            print("!!! PAIN DETECTED (Text Trigger) !!!")
                                            await websocket.send_json({"status": "ALERT", "message": "Pain Detected"})
                                        else:
                                            # Forward normal text for debug
                                            pass
                                            
                except Exception as e:
                    print(f"Error in send_to_client: {e}")

            # Run both tasks concurrently
            await asyncio.gather(receive_from_client(), send_to_client())

    except Exception as e:
        print(f"❌ Connection closed error: {e}")
        traceback.print_exc()
    finally:
        try:
             await websocket.close()
        except:
             pass
