import React, { useState } from 'react';
import { XMarkIcon, UserPlusIcon, LinkIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../services/authService';

const InviteModal = ({ isOpen, onClose, tripId, tripTitle }) => {
  const [loading, setLoading] = useState(false);
  const [inviteMethod, setInviteMethod] = useState('email'); // 'email' or 'link'
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [shareLink, setShareLink] = useState('');

  const handleEmailInvite = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/trips/${tripId}/invite`, {
        email: email.trim(),
        message: message.trim()
      });

      toast.success(`Invitation sent to ${email}!`);
      setEmail('');
      setMessage('');
      onClose();
      
    } catch (error) {
      toast.error('Failed to send invitation. Please try again.');
      console.error('Error sending invitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/trips/${tripId}/share-link`);
      const fullLink = `${window.location.origin}${response.data.share_link}`;
      setShareLink(fullLink);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(fullLink);
      toast.success('Share link copied to clipboard!');
      
    } catch (error) {
      toast.error('Failed to generate share link');
      console.error('Error generating share link:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Invite People to {tripTitle}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Invitation Method Selection */}
          <div className="mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setInviteMethod('email')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                  inviteMethod === 'email'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <EnvelopeIcon className="h-4 w-4" />
                <span>Email Invite</span>
              </button>
              
              <button
                onClick={() => setInviteMethod('link')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                  inviteMethod === 'link'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LinkIcon className="h-4 w-4" />
                <span>Share Link</span>
              </button>
            </div>
          </div>

          {/* Email Invitation Form */}
          {inviteMethod === 'email' && (
            <form onSubmit={handleEmailInvite} className="space-y-4">
              <div>
                <label className="form-label">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="friend@example.com"
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="form-textarea"
                  placeholder="Hey! I'd love for you to join me on this trip..."
                  rows="3"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </button>
            </form>
          )}

          {/* Share Link */}
          {inviteMethod === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="form-label">
                  Share Link
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="form-input flex-1"
                    placeholder="Click 'Generate Link' to create a shareable link"
                  />
                  <button
                    onClick={handleGenerateLink}
                    disabled={loading}
                    className="btn btn-secondary"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    ) : (
                      'Generate'
                    )}
                  </button>
                </div>
              </div>

              {shareLink && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <LinkIcon className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800">
                        Link Generated!
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Share this link with anyone you want to invite to your trip. 
                        The link has been copied to your clipboard.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">
                      How it works
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Anyone with this link can join your trip. They'll need to 
                      sign in to their account to become a participant.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteModal;