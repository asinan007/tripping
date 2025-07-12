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
    has_tickets: Optional[bool] = False
    departure_city: Optional[str] = None
    departure_country: Optional[str] = None

class Trip(TripBase):
    id: str
    created_by: str
    participants: List[str] = []
    created_at: datetime
    updated_at: datetime
    ai_suggestions: Optional[Dict[str, Any]] = None

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
        
        Suggest 8 ACTIVITIES and ATTRACTIONS only (no travel advisories or tips). For each activity, provide exactly this JSON structure:
        {{
            "name": "Activity Name",
            "description": "Brief description of the activity or attraction",
            "category": "adventure|cultural|food|shopping|nature|entertainment|historical|nightlife",
            "duration": "Duration (e.g., 2-3 hours, Half day, Full day)",
            "cost": "Cost range (e.g., $20-50, Free, $100+)",
            "bestTime": "Best time to do this activity",
            "location": "Specific area/neighborhood in the city"
        }}
        
        Focus ONLY on things to do, places to visit, and experiences. Do NOT include travel tips, advisories, or general recommendations.
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
                "bestTime": "Evening",
                "location": "City Center"
            }
        ]
    except Exception as e:
        print(f"AI suggestion error: {e}")
        return []

async def get_personalized_suggestions(context: str) -> List[Dict]:
    """Get personalized trip suggestions based on context"""
    if not GEMINI_API_KEY:
        return []
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Based on this trip context: {context}
        
        Suggest 5 personalized recommendations. For each suggestion, provide exactly this JSON structure:
        {{
            "title": "Suggestion title",
            "description": "Detailed description of the suggestion",
            "category": "tip|advisory|recommendation|warning|cultural_insight",
            "priority": "high|medium|low",
            "relevance": "Brief explanation of why this is relevant to the trip context"
        }}
        
        Include a mix of:
        - Travel advisories and safety tips (category: "advisory")
        - Cultural insights and etiquette (category: "cultural_insight") 
        - General travel recommendations (category: "recommendation")
        - Important tips (category: "tip")
        
        Return ONLY a valid JSON array with exactly 5 suggestions. Do not include any other text or markdown formatting.
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
                "title": "Travel Insurance",
                "description": "Consider getting comprehensive travel insurance for your trip",
                "category": "advisory",
                "priority": "high",
                "relevance": "Important for any international travel"
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

@app.get("/api/invitations/pending")
async def get_pending_invitations(current_user: Dict = Depends(get_current_user)):
    """Get pending invitations for the current user"""
    invitations = db.invitations.find({
        "invitee_email": current_user["email"],
        "status": "pending"
    })
    
    result = []
    for invitation in invitations:
        trip = db.trips.find_one({"_id": ObjectId(invitation["trip_id"])})
        inviter = db.users.find_one({"_id": ObjectId(invitation["inviter_id"])})
        
        if trip and inviter:
            result.append({
                "invitation_id": str(invitation["_id"]),
                "trip": {
                    "id": str(trip["_id"]),
                    "title": trip["title"],
                    "description": trip.get("description", ""),
                    "destination_city": trip.get("destination_city"),
                    "destination_country": trip.get("destination_country"),
                    "start_date": trip.get("start_date"),
                    "end_date": trip.get("end_date")
                },
                "inviter": {
                    "name": inviter["name"],
                    "email": inviter["email"]
                },
                "message": invitation.get("message", ""),
                "created_at": invitation["created_at"]
            })
    
    return result

@app.post("/api/invitations/{invitation_id}/respond")
async def respond_to_invitation(
    invitation_id: str, 
    response_data: Dict[str, Any], 
    current_user: Dict = Depends(get_current_user)
):
    """Accept or reject an invitation"""
    invitation = db.invitations.find_one({
        "_id": ObjectId(invitation_id),
        "invitee_email": current_user["email"],
        "status": "pending"
    })
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    action = response_data.get("action")  # "accept" or "reject"
    
    if action == "accept":
        # Add user to trip participants
        db.trips.update_one(
            {"_id": ObjectId(invitation["trip_id"])},
            {"$addToSet": {"participants": current_user["id"]}}
        )
        
        # Update invitation status
        db.invitations.update_one(
            {"_id": ObjectId(invitation_id)},
            {"$set": {"status": "accepted", "responded_at": datetime.utcnow()}}
        )
        
        trip = db.trips.find_one({"_id": ObjectId(invitation["trip_id"])})
        return {
            "message": "Invitation accepted successfully",
            "trip": {
                "id": str(trip["_id"]),
                "title": trip["title"]
            }
        }
    
    elif action == "reject":
        # Update invitation status
        db.invitations.update_one(
            {"_id": ObjectId(invitation_id)},
            {"$set": {"status": "rejected", "responded_at": datetime.utcnow()}}
        )
        
        return {"message": "Invitation rejected"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'accept' or 'reject'")

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
    
    # Get AI suggestions for the newly created trip
    trip_id = str(result.inserted_id)
    destination = f"{trip.destination_city}, {trip.destination_country}" if trip.destination_city and trip.destination_country else None
    ai_suggestions = []
    
    if destination:
        try:
            # Get activity suggestions based on destination
            activity_suggestions = await get_activity_suggestions(destination)
            
            # If we have trip description, get more personalized suggestions
            if trip.description:
                context = f"Trip to {destination}. {trip.description}"
                personalized_suggestions = await get_personalized_suggestions(context)
                ai_suggestions = {
                    "destination_activities": activity_suggestions,
                    "personalized_recommendations": personalized_suggestions
                }
            else:
                ai_suggestions = {
                    "destination_activities": activity_suggestions,
                    "personalized_recommendations": []
                }
            
            # Store AI suggestions with the trip
            db.trips.update_one(
                {"_id": result.inserted_id},
                {"$set": {"ai_suggestions": ai_suggestions, "updated_at": datetime.utcnow()}}
            )
            
        except Exception as e:
            print(f"Error generating AI suggestions: {e}")
            # Continue without suggestions if AI fails
    
    # Broadcast to WebSocket connections
    await manager.broadcast_to_trip(
        json.dumps({
            "type": "trip_created", 
            "trip_id": trip_id,
            "has_suggestions": bool(ai_suggestions)
        }),
        trip_id
    )
    
    trip_response = {
        "id": trip_id,
        **trip.dict(),
        "created_by": current_user["id"],
        "participants": [current_user["id"]],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Add AI suggestions to response if available
    if ai_suggestions:
        trip_response["ai_suggestions"] = ai_suggestions
    
    return trip_response

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

# Itinerary management routes
@app.post("/api/trips/{trip_id}/itinerary/add-activity")
async def add_activity_to_itinerary(
    trip_id: str,
    activity_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Add an activity to the trip itinerary"""
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "participants": current_user["id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    activity = {
        "id": str(uuid.uuid4()),
        "name": activity_data["name"],
        "description": activity_data.get("description", ""),
        "category": activity_data.get("category", ""),
        "duration": activity_data.get("duration", ""),
        "cost": activity_data.get("cost", ""),
        "location": activity_data.get("location", ""),
        "day": activity_data.get("day", 1),
        "time": activity_data.get("time", ""),
        "added_at": datetime.utcnow(),
        "added_by": current_user["id"]
    }
    
    # Add to trip's itinerary
    db.trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"itinerary": activity}, "$set": {"updated_at": datetime.utcnow()}}
    )
    
    # Broadcast to WebSocket connections
    await manager.broadcast_to_trip(
        json.dumps({
            "type": "activity_added",
            "trip_id": trip_id,
            "activity": activity
        }),
        trip_id
    )
    
    return {
        "message": "Activity added to itinerary",
        "activity": activity
    }

@app.get("/api/trips/{trip_id}/itinerary")
async def get_trip_itinerary(trip_id: str, current_user: Dict = Depends(get_current_user)):
    """Get the trip itinerary"""
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "participants": current_user["id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return {
        "itinerary": trip.get("itinerary", []),
        "trip_title": trip["title"]
    }
@app.post("/api/trips/{trip_id}/invite")
async def invite_to_trip(
    trip_id: str, 
    invitation_data: Dict[str, Any], 
    current_user: Dict = Depends(get_current_user)
):
    """Invite someone to a trip via email"""
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "participants": current_user["id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    invitee_email = invitation_data.get("email")
    message = invitation_data.get("message", "")
    
    if not invitee_email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Check if user is already invited or is a participant
    existing_invitation = db.invitations.find_one({
        "trip_id": trip_id,
        "invitee_email": invitee_email,
        "status": {"$in": ["pending", "accepted"]}
    })
    
    if existing_invitation:
        raise HTTPException(status_code=400, detail="User is already invited or participating")
    
    # Create invitation
    invitation_doc = {
        "trip_id": trip_id,
        "inviter_id": current_user["id"],
        "invitee_email": invitee_email,
        "message": message,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "invite_token": str(uuid.uuid4())
    }
    
    result = db.invitations.insert_one(invitation_doc)
    
    # In a real app, you would send an email here
    # For now, we'll return the invitation details
    
    return {
        "invitation_id": str(result.inserted_id),
        "trip_title": trip["title"],
        "invitee_email": invitee_email,
        "invite_link": f"/invite/{invitation_doc['invite_token']}",
        "status": "pending"
    }

@app.get("/api/trips/{trip_id}/invitations")
async def get_trip_invitations(trip_id: str, current_user: Dict = Depends(get_current_user)):
    """Get all invitations for a trip"""
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "participants": current_user["id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    invitations = db.invitations.find({"trip_id": trip_id})
    return [
        {
            "id": str(inv["_id"]),
            "invitee_email": inv["invitee_email"],
            "status": inv["status"],
            "created_at": inv["created_at"],
            "message": inv.get("message", "")
        }
        for inv in invitations
    ]

@app.post("/api/invitations/{invite_token}/accept")
async def accept_invitation(invite_token: str, current_user: Dict = Depends(get_current_user)):
    """Accept a trip invitation"""
    invitation = db.invitations.find_one({"invite_token": invite_token, "status": "pending"})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or already processed")
    
    # Add user to trip participants
    db.trips.update_one(
        {"_id": ObjectId(invitation["trip_id"])},
        {"$addToSet": {"participants": current_user["id"]}}
    )
    
    # Update invitation status
    db.invitations.update_one(
        {"_id": invitation["_id"]},
        {"$set": {"status": "accepted", "accepted_at": datetime.utcnow()}}
    )
    
    trip = db.trips.find_one({"_id": ObjectId(invitation["trip_id"])})
    
    return {
        "message": "Invitation accepted successfully",
        "trip": {
            "id": str(trip["_id"]),
            "title": trip["title"],
            "description": trip.get("description")
        }
    }

@app.get("/api/trips/{trip_id}/share-link")
async def get_trip_share_link(trip_id: str, current_user: Dict = Depends(get_current_user)):
    """Get a shareable link for the trip"""
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "participants": current_user["id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Generate or get existing share token
    share_token = trip.get("share_token")
    if not share_token:
        share_token = str(uuid.uuid4())
        db.trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"share_token": share_token}}
        )
    
    return {
        "share_link": f"/join/{share_token}",
        "trip_title": trip["title"]
    }

@app.post("/api/trips/join/{share_token}")
async def join_trip_via_link(share_token: str, current_user: Dict = Depends(get_current_user)):
    """Join a trip via share link"""
    trip = db.trips.find_one({"share_token": share_token})
    if not trip:
        raise HTTPException(status_code=404, detail="Invalid share link")
    
    # Check if user is already a participant
    if current_user["id"] in trip.get("participants", []):
        return {
            "message": "You are already a participant in this trip",
            "trip": {
                "id": str(trip["_id"]),
                "title": trip["title"]
            }
        }
    
    # Add user to trip participants
    db.trips.update_one(
        {"_id": trip["_id"]},
        {"$addToSet": {"participants": current_user["id"]}}
    )
    
    return {
        "message": "Successfully joined the trip",
        "trip": {
            "id": str(trip["_id"]),
            "title": trip["title"],
            "description": trip.get("description")
        }
    }
@app.post("/api/ai/destinations")
async def suggest_destinations(preferences: Dict[str, Any], current_user: Dict = Depends(get_current_user)):
    suggestions = await get_destination_suggestions(preferences.get("preferences", ""))
    return {"suggestions": suggestions}

@app.post("/api/ai/activities")
async def suggest_activities(destination_data: Dict[str, Any], current_user: Dict = Depends(get_current_user)):
    suggestions = await get_activity_suggestions(destination_data.get("destination", ""))
    return {"suggestions": suggestions}

@app.post("/api/trips/{trip_id}/suggestions")
async def get_trip_suggestions(trip_id: str, current_user: Dict = Depends(get_current_user)):
    """Get AI suggestions for a specific trip"""
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "participants": current_user["id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    destination = f"{trip.get('destination_city')}, {trip.get('destination_country')}" if trip.get('destination_city') and trip.get('destination_country') else None
    
    if not destination:
        raise HTTPException(status_code=400, detail="Trip must have destination information for suggestions")
    
    try:
        # Get activity suggestions based on destination
        activity_suggestions = await get_activity_suggestions(destination)
        
        # Get personalized suggestions if trip has description
        personalized_suggestions = []
        if trip.get('description'):
            context = f"Trip to {destination}. {trip['description']}"
            personalized_suggestions = await get_personalized_suggestions(context)
        
        suggestions = {
            "destination_activities": activity_suggestions,
            "personalized_recommendations": personalized_suggestions,
            "destination": destination
        }
        
        # Update trip with new suggestions
        db.trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"ai_suggestions": suggestions, "updated_at": datetime.utcnow()}}
        )
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")

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