import { useState } from 'react';
import { Play, ArrowLeft, Video, Clock, Eye } from 'lucide-react';

interface VideoLibraryProps {
  onBack: () => void;
  source: 'landing' | 'dashboard' | 'patient-search';
}

interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: string;
  videoUrl: string;
}

export default function VideoLibrary({ onBack, source }: VideoLibraryProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  const videos: VideoItem[] = [
    {
      id: '1',
      title: 'Getting Started with HealQR',
      description: 'Learn how to set up your profile and create your first QR code for patient bookings.',
      thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
      duration: '5:30',
      views: '2.5K',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    },
    {
      id: '2',
      title: 'Managing Your Schedule',
      description: 'Efficiently manage your chambers, schedules, and appointments with HealQR.',
      thumbnail: 'https://images.unsplash.com/photo-1504813184591-01572f98c85f?w=800&q=80',
      duration: '8:15',
      views: '1.8K',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    },
    {
      id: '3',
      title: 'Understanding Analytics',
      description: 'Deep dive into your practice analytics and patient insights.',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
      duration: '6:45',
      views: '1.2K',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    },
    {
      id: '4',
      title: 'Premium Add-On Services',
      description: 'Explore all premium features including personalized templates, e-commerce, and more.',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      duration: '10:20',
      views: '3.1K',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    },
    {
      id: '5',
      title: 'Patient Communication Best Practices',
      description: 'Learn how to effectively communicate with patients using HealQR tools.',
      thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
      duration: '7:30',
      views: '980',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    },
    {
      id: '6',
      title: 'Advanced QR Code Features',
      description: 'Master advanced QR code customization and tracking features.',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
      duration: '9:00',
      views: '1.5K',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    }
  ];

  if (selectedVideo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => setSelectedVideo(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Videos</span>
          </button>

          {/* Video Player */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={selectedVideo.videoUrl}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>

            <div className="p-6">
              <h1 className="text-2xl mb-3 text-gray-900">{selectedVideo.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{selectedVideo.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{selectedVideo.views} views</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">{selectedVideo.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to {source === 'landing' ? 'Home' : source === 'patient-search' ? 'Search' : 'Dashboard'}</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl text-gray-900">Video Library</h1>
              <p className="text-gray-600">Learn how to make the most of HealQR</p>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              onClick={() => setSelectedVideo(video)}
              className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-200 group">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-emerald-600 ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg mb-2 text-gray-900 line-clamp-2">{video.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{video.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Eye className="w-4 h-4" />
                  <span>{video.views} views</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

