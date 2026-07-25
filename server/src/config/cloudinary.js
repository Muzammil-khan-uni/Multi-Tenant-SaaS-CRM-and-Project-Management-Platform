import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Helper function to determine resource type
export const getResourceType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'raw'; // For PDFs, docs, zips, etc.
};

// Helper to generate transformation options
export const getTransformationOptions = (mimetype) => {
  if (mimetype.startsWith('image/')) {
    return {
      quality: 'auto',
      fetch_format: 'auto',
      width: 2000,
      height: 2000,
      crop: 'limit',
    };
  }
  return {};
};