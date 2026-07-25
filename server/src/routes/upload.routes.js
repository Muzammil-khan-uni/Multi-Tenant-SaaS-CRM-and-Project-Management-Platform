import express from "express";
import multer from "multer";
import cloudinary, {
  getResourceType,
  getTransformationOptions,
} from "../config/cloudinary.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { requirePermission } from "../middleware/rbac.js";

const router = express.Router();

const ALLOWED_TYPES = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  // Other
  "application/json",
  "text/html",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} is not allowed`, 400), false);
    }
  },
});

router.post(
  "/",
  authenticate,
  requirePermission("upload_files"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        throw new AppError("Please upload a file", 400);
      }

      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;

      const resourceType = getResourceType(req.file.mimetype);
      const transformation = getTransformationOptions(req.file.mimetype);

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: `workspace-${req.workspace._id}`,
        resource_type: resourceType,
        transformation: [transformation],
        context: {
          workspace: req.workspace._id.toString(),
          uploadedBy: req.user._id.toString(),
          originalName: req.file.originalname,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
          format: result.format,
          width: result.width,
          height: result.height,
          resourceType: result.resource_type,
          createdAt: result.created_at,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error uploading file",
      });
    }
  },
);

router.post(
  "/multiple",
  authenticate,
  requirePermission("upload_files"),
  upload.array("files", 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        throw new AppError("Please upload files", 400);
      }

      const uploadPromises = req.files.map((file) => {
        const b64 = Buffer.from(file.buffer).toString("base64");
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        const resourceType = getResourceType(file.mimetype);
        const transformation = getTransformationOptions(file.mimetype);

        return cloudinary.uploader.upload(dataURI, {
          folder: `workspace-${req.workspace._id}`,
          resource_type: resourceType,
          transformation: [transformation],
          context: {
            workspace: req.workspace._id.toString(),
            uploadedBy: req.user._id.toString(),
            originalName: file.originalname,
          },
        });
      });

      const results = await Promise.all(uploadPromises);

      const files = results.map((result, index) => ({
        url: result.secure_url,
        publicId: result.public_id,
        name: req.files[index].originalname,
        type: req.files[index].mimetype,
        size: req.files[index].size,
        format: result.format,
        resourceType: result.resource_type,
      }));

      res.status(200).json({
        success: true,
        data: files,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error uploading files",
      });
    }
  },
);

router.delete("/:publicId", authenticate, async (req, res) => {
  try {
    const result = await cloudinary.uploader.destroy(req.params.publicId);

    if (result.result === "ok") {
      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
    } else {
      throw new AppError("Failed to delete file", 400);
    }
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting file",
    });
  }
});

router.get("/:publicId/info", authenticate, async (req, res) => {
  try {
    const result = await cloudinary.api.resource(req.params.publicId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching file info",
    });
  }
});

export default router;
