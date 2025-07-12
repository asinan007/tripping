import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  HomeIcon, 
  PlusIcon, 
  SparklesIcon, 
  PhotoIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  SignalIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  if (!user) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Tripping</span>
            </Link>
            <div className="text-sm text-gray-500">
              Your AI-powered trip planning companion
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Tripping</span>
            </Link>
            
            <nav className="hidden md:flex space-x-6">
              <Link
                to="/dashboard"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <HomeIcon className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              
              <Link
                to="/create-trip"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/create-trip') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <PlusIcon className="w-4 h-4" />
                <span>New Trip</span>
              </Link>
              
              <Link
                to="/ai-planning"
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/ai-planning') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <SparklesIcon className="w-4 h-4" />
                <span>AI Planning</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* WebSocket Status */}
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <SignalIcon className="w-4 h-4 text-green-500" />
              ) : (
                <SignalSlashIcon className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-xs text-gray-500">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <nav className="flex justify-around py-2">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center space-y-1 px-3 py-2 text-xs ${
              isActive('/dashboard') 
                ? 'text-blue-600' 
                : 'text-gray-600'
            }`}
          >
            <HomeIcon className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          
          <Link
            to="/create-trip"
            className={`flex flex-col items-center space-y-1 px-3 py-2 text-xs ${
              isActive('/create-trip') 
                ? 'text-blue-600' 
                : 'text-gray-600'
            }`}
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Trip</span>
          </Link>
          
          <Link
            to="/ai-planning"
            className={`flex flex-col items-center space-y-1 px-3 py-2 text-xs ${
              isActive('/ai-planning') 
                ? 'text-blue-600' 
                : 'text-gray-600'
            }`}
          >
            <SparklesIcon className="w-5 h-5" />
            <span>AI Planning</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;