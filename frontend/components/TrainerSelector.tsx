import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { FaSearch, FaStar, FaUser, FaSpinner } from 'react-icons/fa';

interface Trainer {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  received_reviews_avg_rating: number | null;
  received_reviews_count: number;
  client_relationships_count: number;
}

interface TrainerSelectorProps {
  selectedTrainerId: string | null;
  onSelect: (trainerId: string | null) => void;
  required?: boolean;
}

const TrainerSelector = ({ selectedTrainerId, onSelect, required = false }: TrainerSelectorProps) => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        const response = await api.get('/public/trainers');
        
        // Extract trainers from paginated response
        const trainersData = response.data?.data?.data || response.data?.data || [];
        setTrainers(Array.isArray(trainersData) ? trainersData : []);
      } catch (err: any) {
        console.error('Error fetching trainers:', err);
        setError('Nepodarilo sa načítať zoznam trénerov');
        setTrainers([]); // Ensure we always have an array
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrainers();
  }, []);

  // Ensure trainers is always an array before filtering
  const safeTrainers = Array.isArray(trainers) ? trainers : [];
  const filteredTrainers = safeTrainers.filter(trainer =>
    trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (trainer.bio && trainer.bio.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTrainerSelect = (trainerId: string) => {
    if (selectedTrainerId === trainerId) {
      onSelect(null); // Deselect if already selected
    } else {
      onSelect(trainerId);
    }
  };

  const renderStarRating = (rating: number | null, reviewCount: number) => {
    if (rating === null || reviewCount === 0) {
      return (
        <span className="text-gray-400 text-sm">Bez hodnotení</span>
      );
    }

    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStar key={i} className="text-yellow-200" />);
      } else {
        stars.push(<FaStar key={i} className="text-gray-300" />);
      }
    }

    return (
      <div className="flex items-center gap-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600">
          {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'hodnotenie' : 'hodnotení'})
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <FaSpinner className="animate-spin text-indigo-500 text-2xl mr-2" />
        <span className="text-gray-600">Načítavam trénerov...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Výber trénera {required && <span className="text-red-500">*</span>}
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Vyberte si trénera, ktorý bude spravovať vaše tréningy. Tréner musí potvrdiť vašu žiadosť predtým, ako budete môcť rezervovať tréningy.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Hľadať trénera..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Skip option */}
      {!required && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`w-full p-3 border rounded-lg text-left transition-all duration-200 ${
            selectedTrainerId === null
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="font-medium">Zatiaľ nevyberať trénera</div>
          <div className="text-sm text-gray-500">Môžete si vybrať trénera neskôr</div>
        </button>
      )}

      {/* Trainers list */}
      <div className="max-h-96 overflow-y-auto space-y-3">
        {filteredTrainers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'Žiadni tréneri sa nezhodujú s vaším vyhľadávaním' : 'Žiadni tréneri k dispozícii'}
          </div>
        ) : (
          filteredTrainers.map((trainer) => (
            <button
              key={trainer.id}
              type="button"
              onClick={() => handleTrainerSelect(trainer.id)}
              className={`w-full p-4 border rounded-lg text-left transition-all duration-200 hover:shadow-md ${
                selectedTrainerId === trainer.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {trainer.avatar_url ? (
                    <img
                      src={trainer.avatar_url}
                      alt={trainer.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <FaUser className="text-gray-500 text-xl" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{trainer.name}</div>
                  
                  {trainer.bio && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {trainer.bio}
                    </p>
                  )}
                  
                  <div className="mt-2 flex flex-col gap-1">
                    {renderStarRating(trainer.received_reviews_avg_rating, trainer.received_reviews_count)}
                    
                    <div className="text-sm text-gray-500">
                      {trainer.client_relationships_count} {trainer.client_relationships_count === 1 ? 'klient' : 'klientov'}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default TrainerSelector; 