import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { aiService } from '../services/tripsService';
import { SparklesIcon, MapPinIcon, HeartIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AIPlanning = () => {
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('trip');
  
  const [activeTab, setActiveTab] = useState('destinations');
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState('');
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const handleDestinationSuggestions = async () => {
    if (!preferences.trim()) {
      toast.error('Please enter your travel preferences');
      return;
    }

    setLoading(true);
    try {
      const results = await aiService.getDestinationSuggestions(preferences);
      setSuggestions(results);
    } catch (error) {
      toast.error('Failed to get suggestions. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivitySuggestions = async () => {
    if (!destination.trim()) {
      toast.error('Please enter a destination');
      return;
    }

    setLoading(true);
    try {
      const results = await aiService.getActivitySuggestions(destination);
      setSuggestions(results);
    } catch (error) {
      toast.error('Failed to get suggestions. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDestinationSuggestions = () => (
    <div className="space-y-4">
      {suggestions.map((suggestion, index) => (
        <div key={index} className="suggestion-card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {suggestion.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {suggestion.country}
              </p>
              <p className="text-gray-700 mb-3">
                {suggestion.description}
              </p>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span>{suggestion.bestTime}</span>
                </div>
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                  <span>{suggestion.budgetRange}</span>
                </div>
              </div>
              
              {suggestion.keyActivities && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Key Activities:</h4>
                  <div className="flex flex-wrap gap-1">
                    {suggestion.keyActivities.map((activity, idx) => (
                      <span key={idx} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {activity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button className="btn btn-primary btn-sm ml-4">
              <HeartIcon className="h-4 w-4 mr-1" />
              Save
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderActivitySuggestions = () => (
    <div className="space-y-4">
      {suggestions.map((suggestion, index) => (
        <div key={index} className="suggestion-card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {suggestion.name}
              </h3>
              <p className="text-gray-700 mb-3">
                {suggestion.description}
              </p>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className={`inline-flex px-2 py-1 text-xs rounded-full category-${suggestion.category || 'default'}`}>
                  {suggestion.category}
                </span>
                
                {suggestion.duration && (
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    <span>{suggestion.duration}</span>
                  </div>
                )}
                
                {suggestion.cost && (
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                    <span>{suggestion.cost}</span>
                  </div>
                )}
              </div>
              
              {suggestion.bestTime && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Best time:</span> {suggestion.bestTime}
                </div>
              )}
            </div>
            
            <button className="btn btn-primary btn-sm ml-4">
              <HeartIcon className="h-4 w-4 mr-1" />
              Add to Trip
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center items-center space-x-2 mb-4">
          <SparklesIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">AI Trip Planning</h1>
        </div>
        <p className="text-gray-600">
          Get personalized recommendations powered by artificial intelligence
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('destinations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'destinations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MapPinIcon className="h-5 w-5 inline mr-2" />
              Destination Suggestions
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'activities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SparklesIcon className="h-5 w-5 inline mr-2" />
              Activity Suggestions
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'destinations' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Where would you like to go?
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">
                      Tell us about your travel preferences
                    </label>
                    <textarea
                      value={preferences}
                      onChange={(e) => setPreferences(e.target.value)}
                      className="form-textarea"
                      placeholder="e.g., I love adventure activities, cultural experiences, and good food. I'm looking for a warm destination with beautiful beaches and historical sites. Budget is around $2000 per person."
                      rows="4"
                    />
                  </div>
                  
                  <button
                    onClick={handleDestinationSuggestions}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Getting Suggestions...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4 mr-2" />
                        Get Destination Suggestions
                      </>
                    )}
                  </button>
                </div>
              </div>

              {suggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recommended Destinations
                  </h3>
                  {renderDestinationSuggestions()}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  What activities are you interested in?
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">
                      Enter your destination
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="form-input"
                      placeholder="e.g., Tokyo, Japan"
                    />
                  </div>
                  
                  <button
                    onClick={handleActivitySuggestions}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Getting Suggestions...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4 mr-2" />
                        Get Activity Suggestions
                      </>
                    )}
                  </button>
                </div>
              </div>

              {suggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recommended Activities
                  </h3>
                  {renderActivitySuggestions()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <div className="flex items-start">
          <SparklesIcon className="h-6 w-6 text-blue-600 mr-3 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Powered by AI
            </h3>
            <p className="text-gray-700">
              Our AI assistant uses advanced machine learning to provide personalized travel recommendations 
              based on your preferences, budget, and interests. Get suggestions for destinations, activities, 
              restaurants, and more to make your trip planning easier and more enjoyable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPlanning;