import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

export function Slider({ 
  value = [0], 
  onValueChange, 
  onValueCommit,
  min = 0, 
  max = 100, 
  step = 1, 
  className,
  ...props 
}) {
  const [localValue, setLocalValue] = useState(value);
  const sliderRef = useRef(null);
  const isDragging = useRef(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleMouseDown = (e, index) => {
    isDragging.current = true;
    document.addEventListener('mousemove', (e) => handleMouseMove(e, index));
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e, index) => {
    if (!isDragging.current || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newValue = Math.round((min + percentage * (max - min)) / step) * step;
    
    const newValues = [...localValue];
    newValues[index] = newValue;
    
    // Ensure values don't cross over
    if (localValue.length === 2) {
      if (index === 0 && newValue > newValues[1]) {
        newValues[0] = newValues[1];
      } else if (index === 1 && newValue < newValues[0]) {
        newValues[1] = newValues[0];
      }
    }
    
    setLocalValue(newValues);
    onValueChange?.(newValues);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    onValueCommit?.(localValue);
  };

  const getPercentage = (val) => ((val - min) / (max - min)) * 100;

  return (
    <div className={cn('relative w-full', className)} {...props}>
      <div
        ref={sliderRef}
        className="relative h-2 bg-slate-200 rounded-full cursor-pointer"
        onClick={(e) => {
          const rect = sliderRef.current.getBoundingClientRect();
          const percentage = (e.clientX - rect.left) / rect.width;
          const newValue = Math.round((min + percentage * (max - min)) / step) * step;
          
          if (localValue.length === 1) {
            const newValues = [newValue];
            setLocalValue(newValues);
            onValueChange?.(newValues);
            onValueCommit?.(newValues);
          } else {
            // For range slider, update the closest handle
            const distances = localValue.map(val => Math.abs(val - newValue));
            const closestIndex = distances.indexOf(Math.min(...distances));
            const newValues = [...localValue];
            newValues[closestIndex] = newValue;
            
            // Ensure values don't cross over
            if (closestIndex === 0 && newValue > newValues[1]) {
              newValues[0] = newValues[1];
            } else if (closestIndex === 1 && newValue < newValues[0]) {
              newValues[1] = newValues[0];
            }
            
            setLocalValue(newValues);
            onValueChange?.(newValues);
            onValueCommit?.(newValues);
          }
        }}
      >
        {/* Track fill */}
        {localValue.length === 2 ? (
          <div
            className="absolute h-2 bg-primary rounded-full"
            style={{
              left: `${getPercentage(localValue[0])}%`,
              width: `${getPercentage(localValue[1]) - getPercentage(localValue[0])}%`,
            }}
          />
        ) : (
          <div
            className="absolute h-2 bg-primary rounded-full"
            style={{
              width: `${getPercentage(localValue[0])}%`,
            }}
          />
        )}
        
        {/* Handles */}
        {localValue.map((val, index) => (
          <div
            key={index}
            className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 top-1/2 hover:scale-110 transition-transform"
            style={{ left: `${getPercentage(val)}%` }}
            onMouseDown={(e) => handleMouseDown(e, index)}
          />
        ))}
      </div>
    </div>
  );
}