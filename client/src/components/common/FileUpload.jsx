import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  File,
  Image,
  FileText,
  Archive,
  Loader2,
} from 'lucide-react';
import { useFileUpload } from '../../hooks/useFileUpload';
import { Button } from './Button';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const getFileIcon = (type) => {
  if (type?.startsWith('image/')) return Image;
  if (type?.includes('pdf')) return FileText;
  if (type?.includes('zip') || type?.includes('rar')) return Archive;
  return File;
};

const FileUpload = ({
  onUploadComplete,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = '*',
  className,
}) => {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const { uploading, progress, uploadMultiple } = useFileUpload();

  const handleFiles = useCallback(
    (files) => {
      const validFiles = files.filter((file) => {
        if (file.size > maxSize) {
          toast.error(
            `${file.name} is too large. Max size is ${maxSize / 1024 / 1024}MB`
          );
          return false;
        }
        return true;
      });

      setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, maxFiles));
    },
    [maxSize, maxFiles]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [handleFiles]
  );

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      handleFiles(files);
    },
    [handleFiles]
  );

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      const results = await uploadMultiple(selectedFiles);
      onUploadComplete?.(results);
      setSelectedFiles([]);
    } catch {
      // Error handled in hook with toast
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer',
          dragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        <div className="text-center">
          <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Drag & drop files here, or{' '}
            <span className="text-primary-600 dark:text-primary-400">
              browse
            </span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Max {maxFiles} files, up to {maxSize / 1024 / 1024}MB each
          </p>
        </div>
      </div>

      {/* Selected Files */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            {selectedFiles.map((file, index) => {
              const Icon = getFileIcon(file.type);
              return (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleUpload}
                loading={uploading}
                icon={uploading ? Loader2 : Upload}
                size="sm"
              >
                {uploading ? `Uploading ${progress}%` : 'Upload Files'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedFiles([])}
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
