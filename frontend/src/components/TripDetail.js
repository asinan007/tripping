import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrips } from '../context/TripsContext';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  CalendarIcon, 
  MapPinIcon, 
  UsersIcon, 
  PhotoIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  SparklesIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import InviteModal from './InviteModal';

const TripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { getTrip, deleteTrip } = useTrips();
  const { connectToTrip, disconnectFromTrip } = useWebSocket();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const tripData = await getTrip(tripId);
        setTrip(tripData);
        
        // Connect to WebSocket for real-time updates
        connectToTrip(tripId);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();

    // Listen for WebSocket updates
    const handleTripUpdate = (event) => {
      if (event.detail.trip_id === tripId) {
        fetchTrip();
      }
    };

    window.addEventListener('tripUpdated', handleTripUpdate);

    return () => {
      disconnectFromTrip();
      window.removeEventListener('tripUpdated', handleTripUpdate);
    };
  }, [tripId, getTrip, connectToTrip, disconnectFromTrip]);

  const handleDeleteTrip = async () => {
    if (window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      try {
        await deleteTrip(tripId);
        toast.success('Trip deleted successfully');
        navigate('/dashboard');
      } catch (error) {
        toast.error('Failed to delete trip');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4 w-1/3"></div>
          <div className="h-4 bg-gray-300 rounded mb-2 w-1/2"></div>
          <div className="h-4 bg-gray-300 rounded mb-8 w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-8 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Trip</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Trip not found</h2>
          <p className="mt-2 text-gray-600">The trip you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 btn btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getTripStatus = () => {
    if (!trip.start_date || !trip.end_date) return 'planning';
    
    const now = new Date();
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    
    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      default: return 'Planning';
    }
  };

  const status = getTripStatus();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Trip Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h1 className="text-3xl font-bold text-gray-900">{trip.title}</h1>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(status)}`}>
                {getStatusText(status)}
              </span>
            </div>
            
            {trip.description && (
              <p className="text-gray-600 mb-4">{trip.description}</p>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {trip.destination_city && trip.destination_country && (
                <div className="flex items-center">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  <span>{trip.destination_city}, {trip.destination_country}</span>
                </div>
              )}
              
              {trip.start_date && (
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span>
                    {format(new Date(trip.start_date), 'MMM d, yyyy')}
                    {trip.end_date && ` - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`}
                  </span>
                </div>
              )}
              
              <div className="flex items-center">
                <UsersIcon className="h-4 w-4 mr-1" />
                <span>{trip.participants?.length || 1} participant{(trip.participants?.length || 1) > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => navigate(`/trip/${trip.id}/edit`)}
              className="btn btn-secondary"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </button>
            <button
              onClick={handleDeleteTrip}
              className="btn btn-danger"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => navigate(`/trip/${trip.id}/itinerary`)}
          className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <CalendarIcon className="h-6 w-6 mb-2" />
          <div className="text-sm font-medium">Itinerary</div>
        </button>
        
        <button
          onClick={() => navigate(`/trip/${trip.id}/destinations`)}
          className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 transition-colors"
        >
          <MapPinIcon className="h-6 w-6 mb-2" />
          <div className="text-sm font-medium">Destinations</div>
        </button>
        
        <button
          onClick={() => navigate(`/trip/${trip.id}/photos`)}
          className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 transition-colors"
        >
          <PhotoIcon className="h-6 w-6 mb-2" />
          <div className="text-sm font-medium">Photos</div>
        </button>
        
        <button
          onClick={() => navigate(`/ai-planning?trip=${trip.id}`)}
          className="bg-yellow-500 text-white p-4 rounded-lg hover:bg-yellow-600 transition-colors"
        >
          <SparklesIcon className="h-6 w-6 mb-2" />
          <div className="text-sm font-medium">AI Suggestions</div>
        </button>
      </div>

      {/* Trip Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Itinerary Overview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Itinerary</h2>
            <button className="btn btn-secondary btn-sm">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Day
            </button>
          </div>
          
          <div className="space-y-3">
            {trip.itinerary && trip.itinerary.length > 0 ? (
              trip.itinerary.map((day, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-900">Day {day.day}</div>
                  <div className="text-sm text-gray-500">
                    {day.activities?.length || 0} activities planned
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No itinerary yet</p>
                <p className="text-sm">Start planning your daily activities</p>
              </div>
            )}
          </div>
        </div>

        {/* Photos Overview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
            <button className="btn btn-secondary btn-sm">
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Photos
            </button>
          </div>
          
          <div className="space-y-3">
            {trip.photos && trip.photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {trip.photos.slice(0, 6).map((photo, index) => (
                  <div key={index} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={photo.url} 
                      alt={photo.caption || 'Trip photo'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <PhotoIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No photos yet</p>
                <p className="text-sm">Upload and share your memories</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetail;