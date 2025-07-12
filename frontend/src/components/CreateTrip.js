import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../context/TripsContext';
import { CalendarIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';

const CreateTrip = () => {
  const navigate = useNavigate();
  const { createTrip } = useTrips();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination_city: '',
    destination_country: '',
    start_date: null,
    end_date: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

    setLoading(true);
    try {
      const tripData = {
        ...formData,
        start_date: formData.start_date ? formData.start_date.toISOString() : null,
        end_date: formData.end_date ? formData.end_date.toISOString() : null
      };

      const newTrip = await createTrip(tripData);
      toast.success('Trip created successfully!');
      navigate(`/trip/${newTrip.id}`);
    } catch (error) {
      toast.error('Failed to create trip. Please try again.');
      console.error('Error creating trip:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Create New Trip</h1>
          <p className="mt-1 text-sm text-gray-600">
            Start planning your next adventure
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
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="Tell us about your trip plans..."
              rows="4"
            />
          </div>

          {/* Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="destination_city" className="form-label">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                Destination City
              </label>
              <input
                type="text"
                id="destination_city"
                name="destination_city"
                value={formData.destination_city}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g., Tokyo"
              />
            </div>

            <div className="form-group">
              <label htmlFor="destination_country" className="form-label">
                Country
              </label>
              <input
                type="text"
                id="destination_country"
                name="destination_country"
                value={formData.destination_country}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g., Japan"
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
              {loading ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          💡 Planning Tips
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Add destinations and dates to get AI-powered activity suggestions</li>
          <li>• Invite friends and family to collaborate on planning</li>
          <li>• Upload photos during your trip to create beautiful memories</li>
          <li>• Use our AI planning assistant for personalized recommendations</li>
        </ul>
      </div>
    </div>
  );
};

export default CreateTrip;