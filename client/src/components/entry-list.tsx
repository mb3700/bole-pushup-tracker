import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type Entry = {
  id: number;
  date: string;
  count?: number;
  miles?: number;
};

type EntryListProps = {
  title: string;
  icon: React.ReactNode;
  entries: Entry[];
  type: 'pushups' | 'walks';
  onDelete: () => void;
};

// Parse date without timezone shift
const parseLocalDate = (dateString: string): Date => {
  const dateOnly = dateString.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
};

function SwipeableEntry({
  entry,
  type,
  onDelete
}: {
  entry: Entry;
  type: 'pushups' | 'walks';
  onDelete: (id: number) => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = startX.current - currentX;
    const diffY = Math.abs(startY.current - currentY);

    // Only swipe horizontally if not scrolling vertically
    if (diffY < 10 && diffX > 5) {
      setIsSwiping(true);
      e.preventDefault();
      if (diffX > 0) {
        setOffsetX(Math.min(diffX, 80));
      } else {
        setOffsetX(Math.max(0, offsetX + diffX));
      }
    }
  };

  const handleTouchEnd = () => {
    if (offsetX > 40) {
      setOffsetX(80);
    } else {
      setOffsetX(0);
    }
    setIsSwiping(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(entry.id);
  };

  const value = type === 'pushups' ? entry.count : entry.miles;
  const unit = type === 'pushups' ? 'pushups' : 'miles';

  return (
    <div
      className="relative overflow-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button background */}
      <div
        className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center"
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full h-full flex items-center justify-center text-white"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Entry content */}
      <div
        className="relative bg-white flex items-center justify-between p-3 border-b"
        style={{
          transform: `translateX(-${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        <div className="flex flex-col">
          <span className="font-medium">{value} {unit}</span>
          <span className="text-sm text-gray-500">
            {format(parseLocalDate(entry.date), 'MMM d, yyyy')}
          </span>
        </div>
        {offsetX < 20 && (
          <span className="text-xs text-gray-400">← swipe</span>
        )}
      </div>
    </div>
  );
}

export function EntryList({ title, icon, entries, type, onDelete }: EntryListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  // Sort entries by date (newest first)
  const sortedEntries = [...entries].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Show only recent 5 when collapsed
  const displayedEntries = isExpanded ? sortedEntries : sortedEntries.slice(0, 5);

  const handleDelete = async (id: number) => {
    try {
      await apiRequest('DELETE', `/api/${type}/${id}`);
      toast({ title: 'Deleted', description: 'Entry removed' });
      onDelete();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete entry',
        variant: 'destructive'
      });
    }
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
          <span className="text-sm font-normal text-gray-500">
            ({entries.length} entries)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {displayedEntries.map((entry) => (
            <SwipeableEntry
              key={entry.id}
              entry={entry}
              type={type}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {entries.length > 5 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-3 text-sm text-blue-500 flex items-center justify-center gap-1 border-t"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show all {entries.length} entries <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
