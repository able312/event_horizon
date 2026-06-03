import React from 'react';
import { Clock } from 'lucide-react';

/**
 * DetailsTimeblock - Generic timeblock for detail sections (Golf, Cart, Course Setup)
 * 
 * Simplified version without title field - the section context provides the meaning.
 * Used for storing configuration data that generates timeline blocks.
 * 
 * @param {Object} props
 * @param {Object} props.details - The details object containing time and other fields
 * @param {Function} props.onEdit - Callback when editing: (id, updates) => void
 * @param {Function} props.onRemove - Callback when removing: (id) => void
 * @param {ReactNode} props.children - Detail-specific fields to render
 */

interface DetailsTimeblockProps {
    time: string,
    onTimeChange: (time: string) => void
    children: React.ReactNode
}

const GolfDetailsTimeblock: React.FC<DetailsTimeblockProps> = ({ time, onTimeChange, children }) => {
  return (
    <div className="border-y-1 border-stone-100 px-2 py-4 flex items-start hover:bg-stone-50 hover:border-stone-200 w-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1.5 mr-4">
          <Clock size={14} className="text-stone-400" />
          <input
            type="time"
            defaultValue={time ?? ""}
            onBlur={(e) => onTimeChange(e.target.value)}
            className="border-none bg-transparent text-sm font-mono text-stone-600 outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {children}
      </div>
    </div>
  );
};

export default GolfDetailsTimeblock;