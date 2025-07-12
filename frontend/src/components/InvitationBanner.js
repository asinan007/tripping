import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, UserGroupIcon, CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../services/authService';
import { format } from 'date-fns';

const InvitationBanner = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(new Set());

  useEffect(() => {
    fetchPendingInvitations();
  }, []);

  const fetchPendingInvitations = async () => {
    try {
      const response = await api.get('/api/invitations/pending');
      setInvitations(response.data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (invitationId, action) => {
    setResponding(prev => new Set([...prev, invitationId]));
    
    try {
      const response = await api.post(`/api/invitations/${invitationId}/respond`, {
        action
      });
      
      toast.success(response.data.message);
      
      // Remove invitation from list
      setInvitations(prev => prev.filter(inv => inv.invitation_id !== invitationId));
      
      // Refresh the page if accepted to show new trip
      if (action === 'accept') {
        setTimeout(() => window.location.reload(), 1000);
      }
      
    } catch (error) {
      toast.error('Failed to respond to invitation');
      console.error('Error responding to invitation:', error);
    } finally {
      setResponding(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  if (loading || invitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div key={invitation.invitation_id} className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <UserGroupIcon className="h-6 w-6 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      <span className="font-semibold">{invitation.inviter.name}</span> invited you to join:
                    </h3>
                    <p className="text-lg font-semibold text-blue-900 mt-1">
                      {invitation.trip.title}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      {invitation.trip.destination_city && invitation.trip.destination_country && (
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          <span>{invitation.trip.destination_city}, {invitation.trip.destination_country}</span>
                        </div>
                      )}
                      
                      {invitation.trip.start_date && (
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          <span>
                            {format(new Date(invitation.trip.start_date), 'MMM d, yyyy')}
                            {invitation.trip.end_date && ` - ${format(new Date(invitation.trip.end_date), 'MMM d, yyyy')}`}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {invitation.trip.description && (
                      <p className="text-sm text-gray-600 mt-2">{invitation.trip.description}</p>
                    )}
                    
                    {invitation.message && (
                      <div className="mt-2 bg-gray-50 rounded p-2">
                        <p className="text-sm text-gray-700 italic">"{invitation.message}"</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Invited {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleResponse(invitation.invitation_id, 'accept')}
                    disabled={responding.has(invitation.invitation_id)}
                    className="btn btn-success btn-sm flex items-center"
                  >
                    {responding.has(invitation.invitation_id) ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    ) : (
                      <CheckIcon className="h-3 w-3 mr-1" />
                    )}
                    Accept
                  </button>
                  
                  <button
                    onClick={() => handleResponse(invitation.invitation_id, 'reject')}
                    disabled={responding.has(invitation.invitation_id)}
                    className="btn btn-secondary btn-sm flex items-center"
                  >
                    <XMarkIcon className="h-3 w-3 mr-1" />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvitationBanner;