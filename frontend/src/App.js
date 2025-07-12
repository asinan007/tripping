import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Components
import Header from './components/Header';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TripDetail from './components/TripDetail';
import CreateTrip from './components/CreateTrip';
import AIPlanning from './components/AIPlanning';
import PhotoGallery from './components/PhotoGallery';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { TripsProvider } from './context/TripsContext';
import { WebSocketProvider } from './context/WebSocketContext';

function App() {
  return (
    <AuthProvider>
      <TripsProvider>
        <WebSocketProvider>
          <div className="App">
            <Router>
              <Header />
              <main className="min-h-screen bg-gray-50">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
                  <Route path="/trip/:tripId" element={<ProtectedRoute><TripDetail /></ProtectedRoute>} />
                  <Route path="/ai-planning" element={<ProtectedRoute><AIPlanning /></ProtectedRoute>} />
                  <Route path="/trip/:tripId/photos" element={<ProtectedRoute><PhotoGallery /></ProtectedRoute>} />
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
              </main>
              <Toaster position="top-right" />
            </Router>
          </div>
        </WebSocketProvider>
      </TripsProvider>
    </AuthProvider>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
}

export default App;