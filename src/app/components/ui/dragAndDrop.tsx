'use client';
import { useCallback, useState } from 'react';

type DragAndDropProps = {
  onFilesDropped: (files: File[]) => void;
  accept?: string;
  children: React.ReactNode;
  className?: string;
};

const DragAndDrop = ({ onFilesDropped, accept, children, className }: DragAndDropProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        if (accept) {
          const acceptedFiles = files.filter(file => {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            return accept.split(',').some(ext => 
              ext.trim().replace('.', '').toLowerCase() === fileExtension
            );
          });
          onFilesDropped(acceptedFiles);
        } else {
          onFilesDropped(files);
        }
      }
    },
    [accept, onFilesDropped]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative ${className} ${isDragging ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center rounded-md pointer-events-none">
          <div className="bg-white p-4 rounded-md shadow-lg border border-blue-300">
            <p className="text-blue-600 font-medium">Drop files here</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DragAndDrop;