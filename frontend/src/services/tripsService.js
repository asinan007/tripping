import api from './authService';

export const tripsService = {
  async getTrips() {
    try {
      const response = await api.get('/api/trips');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch trips');
    }
  },

  async getTrip(tripId) {
    try {
      const response = await api.get(`/api/trips/${tripId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch trip');
    }
  },

  async createTrip(tripData) {
    try {
      const response = await api.post('/api/trips', tripData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to create trip');
    }
  },

  async updateTrip(tripId, tripData) {
    try {
      const response = await api.put(`/api/trips/${tripId}`, tripData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to update trip');
    }
  },

  async deleteTrip(tripId) {
    try {
      await api.delete(`/api/trips/${tripId}`);
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to delete trip');
    }
  }
};

export const aiService = {
  async getDestinationSuggestions(preferences) {
    try {
      const response = await api.post('/api/ai/destinations', { preferences });
      return response.data.suggestions;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get destination suggestions');
    }
  },

  async getActivitySuggestions(destination) {
    try {
      const response = await api.post('/api/ai/activities', { destination });
      return response.data.suggestions;
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to get activity suggestions');
    }
  }
};