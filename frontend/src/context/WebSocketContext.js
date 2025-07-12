import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [currentTripId, setCurrentTripId] = useState(null);
  const socketRef = useRef(null);
  const wsRef = useRef(null);

  const connectToTrip = (tripId) => {
    if (!user || !tripId) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Create WebSocket connection
    const wsUrl = `${process.env.REACT_APP_BACKEND_URL?.replace('http', 'ws')}/ws/${tripId}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      setCurrentTripId(tripId);
      console.log('WebSocket connected to trip:', tripId);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      setCurrentTripId(null);
      console.log('WebSocket disconnected');
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  };

  const disconnectFromTrip = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setCurrentTripId(null);
  };

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const handleWebSocketMessage = (data) => {
    // Handle different types of WebSocket messages
    switch (data.type) {
      case 'trip_updated':
        // Trigger trip refresh
        window.dispatchEvent(new CustomEvent('tripUpdated', { detail: data }));
        break;
      case 'trip_created':
        // Trigger trips list refresh
        window.dispatchEvent(new CustomEvent('tripCreated', { detail: data }));
        break;
      case 'user_joined':
        // Show notification
        window.dispatchEvent(new CustomEvent('userJoined', { detail: data }));
        break;
      case 'user_left':
        // Show notification
        window.dispatchEvent(new CustomEvent('userLeft', { detail: data }));
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      disconnectFromTrip();
    };
  }, []);

  useEffect(() => {
    // Reconnect when user changes
    if (!user && wsRef.current) {
      disconnectFromTrip();
    }
  }, [user]);

  const value = {
    isConnected,
    currentTripId,
    connectToTrip,
    disconnectFromTrip,
    sendMessage
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};