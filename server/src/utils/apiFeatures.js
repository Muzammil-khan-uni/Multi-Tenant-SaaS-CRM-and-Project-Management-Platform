class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.totalCount = 0;
  }

  search(searchableFields) {
    const search = this.queryString.search;
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      const orConditions = [];

      searchableFields.forEach((field) => {
        if (field.includes(".")) {
          const parts = field.split(".");
          let condition = {};
          let current = condition;
          parts.forEach((part, index) => {
            if (index === parts.length - 1) {
              current[part] = searchRegex;
            } else {
              current[part] = {};
              current = current[part];
            }
          });
          orConditions.push(condition);
        } else {
          orConditions.push({ [field]: searchRegex });
        }
      });

      if (orConditions.length > 0) {
        this.query = this.query.find({ $or: orConditions });
      }
    }
    return this;
  }

  filter(allowedFields = []) {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "limit", "sort", "search", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    if (this.queryString.startDate || this.queryString.endDate) {
      queryObj.createdAt = {};
      if (this.queryString.startDate) {
        queryObj.createdAt.$gte = new Date(this.queryString.startDate);
      }
      if (this.queryString.endDate) {
        queryObj.createdAt.$lte = new Date(this.queryString.endDate);
      }
    }

    if (this.queryString.dueDateStart || this.queryString.dueDateEnd) {
      queryObj.dueDate = {};
      if (this.queryString.dueDateStart) {
        queryObj.dueDate.$gte = new Date(this.queryString.dueDateStart);
      }
      if (this.queryString.dueDateEnd) {
        queryObj.dueDate.$lte = new Date(this.queryString.dueDateEnd);
      }
    }

    if (this.queryString.budgetMin || this.queryString.budgetMax) {
      queryObj["budget.estimated"] = {};
      if (this.queryString.budgetMin) {
        queryObj["budget.estimated"].$gte = Number(this.queryString.budgetMin);
      }
      if (this.queryString.budgetMax) {
        queryObj["budget.estimated"].$lte = Number(this.queryString.budgetMax);
      }
    }

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt|eq|ne|in|nin|exists|regex)\b/g,
      (match) => `$${match}`,
    );

    let parsedQuery = JSON.parse(queryStr);
    if (allowedFields.length > 0) {
      const filteredQuery = {};
      allowedFields.forEach((field) => {
        if (parsedQuery[field] !== undefined) {
          filteredQuery[field] = parsedQuery[field];
        }
      });
      parsedQuery = filteredQuery;
    }

    this.query = this.query.find(parsedQuery);
    return this;
  }

  sort(defaultSort = "-createdAt") {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort(defaultSort);
    }
    return this;
  }

  selectFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  paginate() {
    const page = Math.max(1, parseInt(this.queryString.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(this.queryString.limit) || 10),
    );
    const skip = (page - 1) * limit;

    this.paginationData = { page, limit, skip };
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  async execute() {
    const countQuery = this.query.model.find(this.query.getFilter());
    this.totalCount = await countQuery.countDocuments();

    const results = await this.query;

    return {
      data: results,
      pagination: {
        page: this.paginationData?.page || 1,
        limit: this.paginationData?.limit || 10,
        total: this.totalCount,
        totalPages: Math.ceil(
          this.totalCount / (this.paginationData?.limit || 10),
        ),
        hasNext: this.paginationData
          ? this.paginationData.page * this.paginationData.limit <
            this.totalCount
          : false,
        hasPrev: (this.paginationData?.page || 1) > 1,
      },
    };
  }
}

export default APIFeatures;
