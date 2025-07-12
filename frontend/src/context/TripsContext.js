import React, { createContext, useContext, useState, useEffect } from 'react';
import { tripsService } from '../services/tripsService';
import { useAuth } from './AuthContext';

const TripsContext = createContext();

export const useTrips = () => {
  const context = useContext(TripsContext);
  if (!context) {
    throw new Error('useTrips must be used within a TripsProvider');
  }
  return context;
};

export const TripsProvider = ({ children }) => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTrips = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userTrips = await tripsService.getTrips();
      setTrips(userTrips);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [user]);

  const createTrip = async (tripData) => {
    try {
      const newTrip = await tripsService.createTrip(tripData);
      setTrips(prev => [...prev, newTrip]);
      return newTrip;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTrip = async (tripId, tripData) => {
    try {
      const updatedTrip = await tripsService.updateTrip(tripId, tripData);
      setTrips(prev => prev.map(trip => 
        trip.id === tripId ? updatedTrip : trip
      ));
      return updatedTrip;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteTrip = async (tripId) => {
    try {
      await tripsService.deleteTrip(tripId);
      setTrips(prev => prev.filter(trip => trip.id !== tripId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getTrip = async (tripId) => {
    try {
      return await tripsService.getTrip(tripId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    trips,
    loading,
    error,
    createTrip,
    updateTrip,
    deleteTrip,
    getTrip,
    fetchTrips
  };

  return (
    <TripsContext.Provider value={value}>
      {children}
    </TripsContext.Provider>
  );
};