import ApiResponse from "../utils/apiResponse.js";
import APIFeatures from "../utils/apiFeatures.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";

class BaseController {
  constructor(Model, searchableFields = [], allowedFilterFields = []) {
    this.Model = Model;
    this.searchableFields = searchableFields;
    this.allowedFilterFields = allowedFilterFields;
  }

  getAll = (populateOptions = null) => {
    return asyncHandler(async (req, res) => {
      const filter = { workspace: req.workspace._id };

      let query = this.Model.find(filter);
      const features = new APIFeatures(query, req.query)
        .search(this.searchableFields)
        .filter(this.allowedFilterFields)
        .sort()
        .selectFields()
        .paginate();

      if (populateOptions) {
        features.query = features.query.populate(populateOptions);
      }

      const result = await features.execute();

      return ApiResponse.success(res, result.data, "Success", 200, {
        pagination: result.pagination,
        filters: {
          search: req.query.search || null,
          sort: req.query.sort || "-createdAt",
          ...Object.fromEntries(
            Object.entries(req.query).filter(([key]) =>
              this.allowedFilterFields.includes(key),
            ),
          ),
        },
      });
    });
  };

  getOne = (populateOptions = null) => {
    return asyncHandler(async (req, res) => {
      let query = this.Model.findOne({
        _id: req.params.id,
        workspace: req.workspace._id,
      });

      if (populateOptions) {
        query = query.populate(populateOptions);
      }

      const doc = await query;

      if (!doc) {
        throw new AppError(`${this.Model.modelName} not found`, 404);
      }

      return ApiResponse.success(res, doc);
    });
  };

  create = () => {
    return asyncHandler(async (req, res) => {
      req.body.workspace = req.workspace._id;
      req.body.createdBy = req.user._id;

      const doc = await this.Model.create(req.body);

      return ApiResponse.created(
        res,
        doc,
        `${this.Model.modelName} created successfully`,
      );
    });
  };

  update = () => {
    return asyncHandler(async (req, res) => {
      const doc = await this.Model.findOneAndUpdate(
        { _id: req.params.id, workspace: req.workspace._id },
        req.body,
        { new: true, runValidators: true },
      );

      if (!doc) {
        throw new AppError(`${this.Model.modelName} not found`, 404);
      }

      return ApiResponse.success(
        res,
        doc,
        `${this.Model.modelName} updated successfully`,
      );
    });
  };

  delete = (softDelete = true) => {
    return asyncHandler(async (req, res) => {
      let doc;

      if (softDelete) {
        doc = await this.Model.findOneAndUpdate(
          { _id: req.params.id, workspace: req.workspace._id },
          { isActive: false, deletedAt: new Date() },
          { new: true },
        );
      } else {
        doc = await this.Model.findOneAndDelete({
          _id: req.params.id,
          workspace: req.workspace._id,
        });
      }

      if (!doc) {
        throw new AppError(`${this.Model.modelName} not found`, 404);
      }

      return ApiResponse.success(
        res,
        null,
        `${this.Model.modelName} deleted successfully`,
      );
    });
  };
}

export default BaseController;
