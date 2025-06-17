import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { reviewApi } from '../lib/api';
import { toast } from 'react-toastify';

const reviewSchema = z.object({
  trainer_id: z.number().min(1, 'Vyberte trénera'),
  booking_id: z.number().optional(),
  rating: z.number().min(1, 'Vyberte hodnotenie').max(5),
  comment: z.string().min(10, 'Komentár musí mať aspoň 10 znakov'),
  is_public: z.boolean(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  trainerId?: number;
  bookingId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewForm({ trainerId, bookingId, onClose, onSuccess }: ReviewFormProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      trainer_id: trainerId || 0,
      booking_id: bookingId,
      rating: 0,
      comment: '',
      is_public: true,
    },
  });

  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating);
    setValue('rating', rating);
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (selectedRating === 0) {
      toast.error('Vyberte hodnotenie');
      return;
    }

    setLoading(true);
    try {
      await reviewApi.create(token!, { ...data, rating: selectedRating });
      toast.success('Recenzia bola odoslaná');
      onSuccess();
    } catch (error) {
      toast.error('Chyba pri odosielaní recenzie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Napísať recenziu
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {!trainerId && (
            <div>
              <label className="form-label">Tréner</label>
              <select {...register('trainer_id', { valueAsNumber: true })} className="form-input">
                <option value={0}>Vyberte trénera</option>
                {/* This would need to be populated with trainers list */}
              </select>
              {errors.trainer_id && (
                <p className="mt-1 text-sm text-red-600">{errors.trainer_id.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="form-label">Hodnotenie</label>
            <div className="flex space-x-1 mt-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRatingClick(rating)}
                  onMouseEnter={() => setHoveredRating(rating)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="text-2xl focus:outline-none"
                >
                  {rating <= (hoveredRating || selectedRating) ? (
                    <StarIconSolid className="h-8 w-8 text-yellow-400" />
                  ) : (
                    <StarIcon className="h-8 w-8 text-gray-300" />
                  )}
                </button>
              ))}
            </div>
            {selectedRating === 0 && (
              <p className="mt-1 text-sm text-red-600">Vyberte hodnotenie</p>
            )}
          </div>

          <div>
            <label className="form-label">Komentár</label>
            <textarea
              {...register('comment')}
              rows={4}
              className="form-input"
              placeholder="Popíšte vašu skúsenosť s trénerom..."
            />
            {errors.comment && (
              <p className="mt-1 text-sm text-red-600">{errors.comment.message}</p>
            )}
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                {...register('is_public')}
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Zverejniť recenziu verejne
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading || selectedRating === 0}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Odosielanie...' : 'Odoslať recenziu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 