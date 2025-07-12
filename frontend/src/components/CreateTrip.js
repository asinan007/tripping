import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../context/TripsContext';
import { CalendarIcon, MapPinIcon, UsersIcon, SparklesIcon, CheckIcon, PlusIcon, ExclamationTriangleIcon, InformationCircleIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';
import api from '../services/authService';

const CreateTrip = () => {
  const navigate = useNavigate();
  const { createTrip } = useTrips();
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tripSuggestions, setTripSuggestions] = useState(null);
  const [createdTrip, setCreatedTrip] = useState(null);
  const [addingActivities, setAddingActivities] = useState(new Set());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination_city: '',
    destination_country: '',
    start_date: null,
    end_date: null,
    has_tickets: false,
    departure_city: '',
    departure_country: ''
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDateChange = (date, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: date
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a trip title');
      return;
    }

    if (!formData.destination_city.trim() || !formData.destination_country.trim()) {
      toast.error('Please enter both destination city and country for AI suggestions');
      return;
    }

    setLoading(true);
    try {
      const tripData = {
        ...formData,
        start_date: formData.start_date ? formData.start_date.toISOString() : null,
        end_date: formData.end_date ? formData.end_date.toISOString() : null
      };

      const newTrip = await createTrip(tripData);
      setCreatedTrip(newTrip);
      
      // Check if trip has AI suggestions
      if (newTrip.ai_suggestions) {
        setTripSuggestions(newTrip.ai_suggestions);
        setShowSuggestions(true);
        toast.success('Trip created with AI suggestions!');
      } else {
        toast.success('Trip created successfully!');
        navigate(`/trip/${newTrip.id}`);
      }
      
    } catch (error) {
      toast.error('Failed to create trip. Please try again.');
      console.error('Error creating trip:', error);
    } finally {

  const handleAddToItinerary = async (activity) => {
    setAddingActivities(prev => new Set([...prev, activity.name]));
    
    try {
      await api.post(`/api/trips/${createdTrip.id}/itinerary/add-activity`, {
        name: activity.name,
        description: activity.description,
        category: activity.category,
        duration: activity.duration,
        cost: activity.cost,
        location: activity.location,
        day: 1 // Default to day 1, user can organize later
      });
      
      toast.success(`Added "${activity.name}" to itinerary!`);
    } catch (error) {
      toast.error('Failed to add activity to itinerary');
      console.error('Error adding activity:', error);
    } finally {
      setAddingActivities(prev => {
        const newSet = new Set(prev);
        newSet.delete(activity.name);
        return newSet;
      });
    }
  };
      setLoading(false);
    }
  };

  const generateFlightSearchUrl = () => {
    if (!formData.departure_city || !formData.destination_city || !formData.start_date) {
      return null;
    }

    const departureDate = formData.start_date.toISOString().split('T')[0];
    const returnDate = formData.end_date ? formData.end_date.toISOString().split('T')[0] : null;
    
    // Google Flights URL format
    const baseUrl = 'https://www.google.com/travel/flights';
    const params = new URLSearchParams({
      q: `flights from ${formData.departure_city} to ${formData.destination_city}`,
      curr: 'USD',
      hl: 'en'
    });

    // Add dates if available
    if (departureDate) {
      params.append('departure', departureDate);
    }
    if (returnDate) {
      params.append('return', returnDate);
    }

    return `${baseUrl}?${params.toString()}`;
  };

  const handleContinueToTrip = () => {
    navigate(`/trip/${createdTrip.id}`);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'adventure': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'cultural': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'food': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'nature': return 'bg-green-100 text-green-800 border-green-300';
      case 'entertainment': return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'historical': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'shopping': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'nightlife': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'advisory':
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />;
      case 'tip':
      case 'recommendation':
        return <InformationCircleIcon className="h-5 w-5 text-blue-600" />;
      case 'cultural_insight':
        return <SparklesIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  if (showSuggestions && tripSuggestions) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">AI Trip Suggestions</h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Here are personalized suggestions for your trip: {createdTrip.title}
            </p>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Destination Activities */}
            {tripSuggestions.destination_activities && tripSuggestions.destination_activities.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2 text-green-600" />
                  Things to Do in {formData.destination_city}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tripSuggestions.destination_activities.slice(0, 6).map((activity, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-medium text-gray-900 mb-2">{activity.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{activity.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${getCategoryColor(activity.category)}`}>
                          {activity.category}
                        </span>
                        {activity.duration && (
                          <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                            {activity.duration}
                          </span>
                        )}
                        {activity.cost && (
                          <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {activity.cost}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personalized Recommendations */}
            {tripSuggestions.personalized_recommendations && tripSuggestions.personalized_recommendations.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Personalized Recommendations
                </h2>
                <div className="space-y-4">
                  {tripSuggestions.personalized_recommendations.map((rec, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{rec.title}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${getPriorityColor(rec.priority)}`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          {rec.category}
                        </span>
                        <span className="text-xs text-gray-500">{rec.relevance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200">
              <button
                onClick={handleContinueToTrip}
                className="btn btn-primary flex items-center"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Continue to Trip Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Create New Trip</h1>
          <p className="mt-1 text-sm text-gray-600">
            Start planning your next adventure with AI-powered suggestions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Trip Title */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Trip Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="form-input"
              placeholder="e.g., Summer Adventure in Japan"
              required
            />
          </div>

          {/* Trip Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Help AI suggest better activities)
              </span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="Tell us about your trip plans, interests, and what you'd like to experience..."
              rows="4"
            />
          </div>

          {/* Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="destination_city" className="form-label">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                Destination City *
              </label>
              <input
                type="text"
                id="destination_city"
                name="destination_city"
                value={formData.destination_city}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g., Tokyo"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="destination_country" className="form-label">
                Country *
              </label>
              <input
                type="text"
                id="destination_country"
                name="destination_country"
                value={formData.destination_country}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g., Japan"
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Start Date
              </label>
              <DatePicker
                selected={formData.start_date}
                onChange={(date) => handleDateChange(date, 'start_date')}
                className="form-input"
                placeholderText="Select start date"
                dateFormat="MMM d, yyyy"
                minDate={new Date()}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                End Date
              </label>
              <DatePicker
                selected={formData.end_date}
                onChange={(date) => handleDateChange(date, 'end_date')}
                className="form-input"
                placeholderText="Select end date"
                dateFormat="MMM d, yyyy"
                minDate={formData.start_date || new Date()}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Creating Trip...' : 'Create Trip with AI Suggestions'}
            </button>
          </div>
        </form>
      </div>

      {/* Enhanced Tips */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <SparklesIcon className="h-6 w-6 text-blue-600 mt-1" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              🤖 AI-Powered Trip Planning
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Add destination details to get activity suggestions automatically</li>
              <li>• Include trip description for personalized recommendations and travel advisories</li>
              <li>• Add suggested activities directly to your itinerary</li>
              <li>• Invite friends and family to collaborate on planning</li>
              <li>• Upload photos during your trip to create beautiful memories</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTrip;