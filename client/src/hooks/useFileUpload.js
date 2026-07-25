import { useState, useCallback } from 'react';
import axios from '../api/axios';
import toast from 'react-hot-toast';

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const uploadFile = useCallback(async (file, onProgress) => {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percent);
          onProgress?.(percent);
        },
      });

      setUploadedFiles((prev) => [...prev, data.data]);
      toast.success('File uploaded successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
      throw error;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadMultiple = useCallback(async (files, onProgress) => {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const { data } = await axios.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percent);
          onProgress?.(percent);
        },
      });

      setUploadedFiles((prev) => [...prev, ...data.data]);
      toast.success(`${data.data.length} files uploaded`);
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
      throw error;
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteFile = useCallback(async (publicId) => {
    try {
      await axios.delete(`/upload/${publicId}`);
      setUploadedFiles((prev) => prev.filter((f) => f.publicId !== publicId));
      toast.success('File deleted');
    } catch (error) {
      toast.error('Failed to delete file');
      throw error;
    }
  }, []);

  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
    setProgress(0);
  }, []);

  return {
    uploading,
    progress,
    uploadedFiles,
    uploadFile,
    uploadMultiple,
    deleteFile,
    clearFiles,
  };
};
