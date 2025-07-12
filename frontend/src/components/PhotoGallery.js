import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTrips } from '../context/TripsContext';
import { PhotoIcon, PlusIcon, HeartIcon, ShareIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PhotoGallery = () => {
  const { tripId } = useParams();
  const { getTrip } = useTrips();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [collageMode, setCollageMode] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const tripData = await getTrip(tripId);
        setTrip(tripData);
        setPhotos(tripData.photos || []);
      } catch (error) {
        toast.error('Failed to load trip photos');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, getTrip]);

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhoto = {
          id: Date.now() + Math.random(),
          url: e.target.result,
          caption: '',
          location: '',
          uploaded_by: 'current_user',
          created_at: new Date().toISOString()
        };
        setPhotos(prev => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });
    
    toast.success('Photos uploaded successfully!');
  };

  const createCollage = () => {
    setCollageMode(true);
    toast.success('Collage mode activated! Select photos to create a collage.');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4 w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-square bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {trip?.title} Photos
          </h1>
          <p className="mt-1 text-gray-600">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <label className="btn btn-primary cursor-pointer">
            <PlusIcon className="h-4 w-4 mr-2" />
            Upload Photos
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
          
          <button
            onClick={createCollage}
            className="btn btn-secondary"
          >
            <HeartIcon className="h-4 w-4 mr-2" />
            Create Collage
          </button>
        </div>
      </div>

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12">
          <PhotoIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
          <p className="text-gray-500 mb-6">
            Start uploading photos to capture your trip memories
          </p>
          <label className="btn btn-primary cursor-pointer">
            <PlusIcon className="h-4 w-4 mr-2" />
            Upload Your First Photo
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="photo-item group"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Trip photo'}
                className="w-full h-48 object-cover cursor-pointer"
              />
              <div className="photo-overlay">
                <div className="flex space-x-2">
                  <button className="p-2 bg-white rounded-full text-gray-600 hover:text-red-500">
                    <HeartIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 bg-white rounded-full text-gray-600 hover:text-blue-500">
                    <ShareIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                {selectedPhoto.caption || 'Trip Photo'}
              </h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || 'Trip photo'}
                className="w-full h-auto max-h-96 object-contain mx-auto"
              />
              
              <div className="mt-4 space-y-2">
                <div>
                  <label className="form-label">Caption</label>
                  <input
                    type="text"
                    value={selectedPhoto.caption || ''}
                    onChange={(e) => {
                      const updatedPhotos = photos.map(p => 
                        p.id === selectedPhoto.id 
                          ? { ...p, caption: e.target.value }
                          : p
                      );
                      setPhotos(updatedPhotos);
                      setSelectedPhoto({ ...selectedPhoto, caption: e.target.value });
                    }}
                    className="form-input"
                    placeholder="Add a caption..."
                  />
                </div>
                
                <div>
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    value={selectedPhoto.location || ''}
                    onChange={(e) => {
                      const updatedPhotos = photos.map(p => 
                        p.id === selectedPhoto.id 
                          ? { ...p, location: e.target.value }
                          : p
                      );
                      setPhotos(updatedPhotos);
                      setSelectedPhoto({ ...selectedPhoto, location: e.target.value });
                    }}
                    className="form-input"
                    placeholder="Where was this taken?"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collage Mode */}
      {collageMode && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Create Photo Collage</h3>
              <button
                onClick={() => setCollageMode(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <div className="text-center py-8">
                <HeartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Collage Feature Coming Soon!
                </h3>
                <p className="text-gray-500">
                  We're working on an amazing collage creator that will let you 
                  arrange your photos into beautiful layouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;