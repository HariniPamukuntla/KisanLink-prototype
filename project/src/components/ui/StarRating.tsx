import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: number;
  showValue?: boolean;
}

export function StarRating({ rating, size = 16, showValue = true }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={size}
            className={i <= Math.round(rating) ? 'text-market fill-market' : 'text-line'}
            strokeWidth={2}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-bold text-ink tabular-nums">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
