import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTrips } from '../context/TripsContext';
import { useAuth } from '../context/AuthContext';
import { 
  PlusIcon, 
  CalendarIcon, 
  MapPinIcon, 
  UsersIcon,
  SparklesIcon,
  PhotoIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Dashboard = () => {
  const { trips, loading, error } = useTrips();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    completedTrips: 0,
    totalDestinations: 0
  });

  useEffect(() => {
    if (trips) {
      const now = new Date();
      const upcoming = trips.filter(trip => 
        trip.start_date && new Date(trip.start_date) > now
      );
      const completed = trips.filter(trip => 
        trip.end_date && new Date(trip.end_date) < now
      );
      
      setStats({
        totalTrips: trips.length,
        upcomingTrips: upcoming.length,
        completedTrips: completed.length,
        totalDestinations: trips.reduce((acc, trip) => acc + (trip.destinations?.length || 0), 0)
      });
    }
  }, [trips]);

  const getTripStatus = (trip) => {
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4 w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Trips</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          Plan your next adventure with AI-powered suggestions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{stats.totalTrips}</div>
              <div className="text-sm text-gray-500">Total Trips</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{stats.upcomingTrips}</div>
              <div className="text-sm text-gray-500">Upcoming</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MapPinIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{stats.totalDestinations}</div>
              <div className="text-sm text-gray-500">Destinations</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{stats.completedTrips}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/create-trip"
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md p-6 text-white hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <PlusIcon className="h-8 w-8 mr-4" />
            <div>
              <div className="text-lg font-semibold">Plan New Trip</div>
              <div className="text-sm opacity-90">Start planning your next adventure</div>
            </div>
          </div>
        </Link>

        <Link
          to="/ai-planning"
          className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-md p-6 text-white hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <SparklesIcon className="h-8 w-8 mr-4" />
            <div>
              <div className="text-lg font-semibold">AI Trip Planning</div>
              <div className="text-sm opacity-90">Get personalized suggestions</div>
            </div>
          </div>
        </Link>

        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center">
            <PhotoIcon className="h-8 w-8 mr-4" />
            <div>
              <div className="text-lg font-semibold">Photo Memories</div>
              <div className="text-sm opacity-90">Create beautiful collages</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Trips</h2>
        </div>
        
        <div className="p-6">
          {trips.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No trips yet</h3>
              <p className="text-gray-500 mb-4">Start planning your first adventure!</p>
              <Link
                to="/create-trip"
                className="btn btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Trip
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => {
                const status = getTripStatus(trip);
                return (
                  <Link
                    key={trip.id}
                    to={`/trip/${trip.id}`}
                    className="trip-card"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {trip.title}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </div>
                    </div>
                    
                    {trip.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {trip.description}
                      </p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {trip.destination_city && trip.destination_country ? (
                        <span>{trip.destination_city}, {trip.destination_country}</span>
                      ) : (
                        <span>Destination TBD</span>
                      )}
                    </div>
                    
                    {trip.start_date && (
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>
                          {format(new Date(trip.start_date), 'MMM d, yyyy')}
                          {trip.end_date && ` - ${format(new Date(trip.end_date), 'MMM d, yyyy')}`}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <UsersIcon className="h-4 w-4 mr-1" />
                        <span>{trip.participants?.length || 1} participant{(trip.participants?.length || 1) > 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="text-sm text-blue-600 font-medium">
                        View Details →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;