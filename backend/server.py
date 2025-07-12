from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
import os
import jwt
import google.generativeai as genai
from google.cloud import storage
import json
import uuid
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Tripping - Trip Planning App", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here")
JWT_ALGORITHM = "HS256"

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/tripping")
client = MongoClient(MONGO_URL)
db = client.tripping

# Initialize Google Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = defaultdict(list)
    
    async def connect(self, websocket: WebSocket, trip_id: str):
        await websocket.accept()
        self.active_connections[trip_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, trip_id: str):
        if websocket in self.active_connections[trip_id]:
            self.active_connections[trip_id].remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast_to_trip(self, message: str, trip_id: str):
        for connection in self.active_connections[trip_id]:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Pydantic models
class UserBase(BaseModel):
    name: str
    email: str
    avatar: Optional[str] = None

class User(UserBase):
    id: str
    created_at: datetime
    provider: str  # google, facebook, twitter

class TripBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    destination_country: Optional[str] = None
    destination_city: Optional[str] = None

class Trip(TripBase):
    id: str
    created_by: str
    participants: List[str] = []
    created_at: datetime
    updated_at: datetime

class DestinationBase(BaseModel):
    name: str
    location: str
    coordinates: Optional[Dict[str, float]] = None
    description: Optional[str] = None
    category: Optional[str] = None

class Destination(DestinationBase):
    id: str
    trip_id: str
    created_at: datetime

class ActivityBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[int] = None  # in minutes
    cost: Optional[float] = None
    location: Optional[str] = None

class Activity(ActivityBase):
    id: str
    destination_id: Optional[str] = None
    created_at: datetime

class ItineraryBase(BaseModel):
    day: int
    date: datetime
    activities: List[str] = []
    transport: Optional[str] = None
    transport_time: Optional[str] = None
    tickets: Optional[str] = None
    notes: Optional[str] = None

class Itinerary(ItineraryBase):
    id: str
    trip_id: str
    created_at: datetime

class PhotoBase(BaseModel):
    url: str
    caption: Optional[str] = None
    location: Optional[str] = None

class Photo(PhotoBase):
    id: str
    trip_id: str
    uploaded_by: str
    created_at: datetime

class InvitationBase(BaseModel):
    trip_id: str
    invitee_email: str
    message: Optional[str] = None

class Invitation(InvitationBase):
    id: str
    inviter_id: str
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime

# Utility functions
def create_jwt_token(user_id: str) -> str:
    from jose import jwt as jose_jwt
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jose_jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Optional[str]:
    try:
        from jose import jwt as jose_jwt
        payload = jose_jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("user_id")
    except Exception:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = verify_jwt_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "avatar": user.get("avatar"),
        "provider": user.get("provider"),
        "created_at": user.get("created_at", datetime.utcnow())
    }

# AI Helper Functions
async def get_destination_suggestions(preferences: str) -> List[Dict]:
    """Get destination suggestions based on user preferences"""
    if not GEMINI_API_KEY:
        return []
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Based on these travel preferences: {preferences}
        
        Suggest 5 travel destinations. For each destination, provide exactly this JSON structure:
        {{
            "name": "City Name",
            "country": "Country Name", 
            "description": "Brief 2-3 sentence description",
            "bestTime": "Best time to visit",
            "keyActivities": ["activity1", "activity2", "activity3"],
            "budgetRange": "Budget range (e.g., $1000-2000 per person)"
        }}
        
        Return ONLY a valid JSON array with exactly 5 destinations. Do not include any other text or markdown formatting.
        """
        
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Remove any markdown formatting if present
        if response_text.startswith('```json'):
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        # Parse the JSON response
        suggestions = json.loads(response_text)
        
        # Ensure it's a list
        if isinstance(suggestions, dict):
            suggestions = [suggestions]
        
        return suggestions[:5]  # Limit to 5 suggestions
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Raw response: {response.text}")
        # Return fallback suggestions
        return [
            {
                "name": "Tokyo",
                "country": "Japan",
                "description": "A vibrant metropolis blending traditional culture with modern innovation. Experience world-class cuisine, historic temples, and bustling city life.",
                "bestTime": "March-May and September-November",
                "keyActivities": ["Temple visits", "Sushi experiences", "Shopping in Shibuya"],
                "budgetRange": "$1500-3000 per person"
            }
        ]
    except Exception as e:
        print(f"AI suggestion error: {e}")
        return []

async def get_activity_suggestions(destination: str) -> List[Dict]:
    """Get activity suggestions for a specific destination"""
    if not GEMINI_API_KEY:
        return []
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        For the destination: {destination}
        
        Suggest 8 activities/attractions. For each activity, provide exactly this JSON structure:
        {{
            "name": "Activity Name",
            "description": "Brief description of the activity",
            "category": "adventure|cultural|food|shopping|nature|entertainment|historical",
            "duration": "Duration (e.g., 2-3 hours, Half day, Full day)",
            "cost": "Cost range (e.g., $20-50, Free, $100+)",
            "bestTime": "Best time to do this activity"
        }}
        
        Return ONLY a valid JSON array with exactly 8 activities. Do not include any other text or markdown formatting.
        """
        
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Remove any markdown formatting if present
        if response_text.startswith('```json'):
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        # Parse the JSON response
        suggestions = json.loads(response_text)
        
        # Ensure it's a list
        if isinstance(suggestions, dict):
            suggestions = [suggestions]
            
        return suggestions[:8]  # Limit to 8 suggestions
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Raw response: {response.text}")
        # Return fallback suggestions
        return [
            {
                "name": "Local Food Tour",
                "description": "Explore authentic local cuisine with a guided food tour",
                "category": "food",
                "duration": "3-4 hours",
                "cost": "$50-80",
                "bestTime": "Evening"
            }
        ]
    except Exception as e:
        print(f"AI suggestion error: {e}")
        return []

# API Routes

@app.get("/")
async def root():
    return {"message": "Tripping API - Trip Planning Made Easy!"}

# Auth routes (simplified for now - will need proper OAuth implementation)
@app.post("/api/auth/social", response_model=Dict)
async def social_auth(user_data: Dict):
    """Handle social authentication"""
    # In a real implementation, verify the token with the social provider
    
    user = db.users.find_one({"email": user_data["email"]})
    if not user:
        # Create new user
        user_doc = {
            "name": user_data["name"],
            "email": user_data["email"],
            "avatar": user_data.get("avatar"),
            "provider": user_data["provider"],
            "created_at": datetime.utcnow()
        }
        result = db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
    else:
        user_id = str(user["_id"])
    
    token = create_jwt_token(user_id)
    return {"token": token, "user_id": user_id}

@app.get("/api/auth/me", response_model=User)
async def get_current_user_info(current_user: Dict = Depends(get_current_user)):
    return current_user

# Trip routes
@app.post("/api/trips", response_model=Trip)
async def create_trip(trip: TripBase, current_user: Dict = Depends(get_current_user)):
    trip_doc = {
        **trip.dict(),
        "created_by": current_user["id"],
        "participants": [current_user["id"]],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = db.trips.insert_one(trip_doc)
    
    # Broadcast to WebSocket connections
    await manager.broadcast_to_trip(
        json.dumps({"type": "trip_created", "trip_id": str(result.inserted_id)}),
        str(result.inserted_id)
    )
    
    return {
        "id": str(result.inserted_id),
        **trip.dict(),
        "created_by": current_user["id"],
        "participants": [current_user["id"]],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

@app.get("/api/trips", response_model=List[Trip])
async def get_trips(current_user: Dict = Depends(get_current_user)):
    trips = db.trips.find({"participants": current_user["id"]})
    return [
        {
            "id": str(trip["_id"]),
            **{k: v for k, v in trip.items() if k != "_id"}
        }
        for trip in trips
    ]

@app.get("/api/trips/{trip_id}", response_model=Trip)
async def get_trip(trip_id: str, current_user: Dict = Depends(get_current_user)):
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "participants": current_user["id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return {
        "id": str(trip["_id"]),
        **{k: v for k, v in trip.items() if k != "_id"}
    }

@app.put("/api/trips/{trip_id}", response_model=Trip)
async def update_trip(trip_id: str, trip_update: TripBase, current_user: Dict = Depends(get_current_user)):
    result = db.trips.find_one_and_update(
        {"_id": ObjectId(trip_id), "participants": current_user["id"]},
        {"$set": {**trip_update.dict(), "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Broadcast update to WebSocket connections
    await manager.broadcast_to_trip(
        json.dumps({"type": "trip_updated", "trip_id": trip_id}),
        trip_id
    )
    
    return {
        "id": str(result["_id"]),
        **{k: v for k, v in result.items() if k != "_id"}
    }

@app.delete("/api/trips/{trip_id}")
async def delete_trip(trip_id: str, current_user: Dict = Depends(get_current_user)):
    result = db.trips.delete_one({"_id": ObjectId(trip_id), "created_by": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return {"message": "Trip deleted successfully"}

# AI suggestion routes
@app.post("/api/ai/destinations")
async def suggest_destinations(preferences: Dict[str, Any], current_user: Dict = Depends(get_current_user)):
    suggestions = await get_destination_suggestions(preferences.get("preferences", ""))
    return {"suggestions": suggestions}

@app.post("/api/ai/activities")
async def suggest_activities(destination_data: Dict[str, Any], current_user: Dict = Depends(get_current_user)):
    suggestions = await get_activity_suggestions(destination_data.get("destination", ""))
    return {"suggestions": suggestions}

# WebSocket endpoint
@app.websocket("/ws/{trip_id}")
async def websocket_endpoint(websocket: WebSocket, trip_id: str):
    await manager.connect(websocket, trip_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast_to_trip(data, trip_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, trip_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)