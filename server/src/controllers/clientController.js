import Client from "../models/Client.js";
import APIFeatures from "../utils/apiFeatures.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";

export const getClients = asyncHandler(async (req, res) => {
  const searchableFields = [
    "company.name",
    "company.industry",
    "company.legalName",
    "contacts.email",
    "contacts.firstName",
    "contacts.lastName",
    "address.city",
    "address.country",
  ];

  const filter = { workspace: req.workspace._id };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.industry) {
    filter["company.industry"] = req.query.industry;
  }

  if (req.query.source) {
    filter.source = req.query.source;
  }

  if (req.query.assignedTo) {
    filter.assignedTo = req.query.assignedTo;
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");
    filter.$or = [
      { "company.name": searchRegex },
      { "company.industry": searchRegex },
      { "contacts.email": searchRegex },
      { "contacts.firstName": searchRegex },
      { "contacts.lastName": searchRegex },
      { "address.city": searchRegex },
      { "address.country": searchRegex },
    ];
  }

  // Sort
  const sortField = req.query.sort || "-createdAt";

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [clients, totalCount] = await Promise.all([
    Client.find(filter)
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("accountManager", "firstName lastName email")
      .sort(sortField)
      .skip(skip)
      .limit(limit),
    Client.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: clients.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    },
    data: clients,
  });
});

export const getClientById = asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  })
    .populate("assignedTo", "firstName lastName email avatar")
    .populate("accountManager", "firstName lastName email")
    .populate("projects", "name status progress timeline.deadline")
    .populate("invoices", "number status total amountPaid dueDate")
    .populate("notes.createdBy", "firstName lastName avatar")
    .populate("activityTimeline.performedBy", "firstName lastName avatar")
    .populate("documents.uploadedBy", "firstName lastName");

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  res.status(200).json({
    success: true,
    data: client,
  });
});

export const createClient = asyncHandler(async (req, res) => {
  const clientData = {
    ...req.body,
    workspace: req.workspace._id,
  };

  clientData.activityTimeline = [
    {
      type: "status_change",
      title: "Client Created",
      description: "Client was added to the system",
      performedBy: req.user._id,
      timestamp: new Date(),
    },
  ];

  const client = await Client.create(clientData);

  const populatedClient = await Client.findById(client._id).populate(
    "assignedTo",
    "firstName lastName email avatar",
  );

  res.status(201).json({
    success: true,
    message: "Client created successfully",
    data: populatedClient,
  });
});

export const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  const statusChanged = req.body.status && req.body.status !== client.status;
  const oldStatus = client.status; // Store old status before updating

  if (req.body.company) {
    const companyUpdate = {};
    Object.keys(req.body.company).forEach((key) => {
      const value = req.body.company[key];
      if (value !== "" && value !== undefined && value !== null) {
        companyUpdate[key] = value;
      }
    });
    if (Object.keys(companyUpdate).length > 0) {
      client.company = { ...client.company.toObject(), ...companyUpdate };
      client.markModified("company");
    }
  }

  const stringFields = ["status", "source", "type", "paymentTerms"];
  stringFields.forEach((field) => {
    if (req.body[field] !== undefined && req.body[field] !== "") {
      client[field] = req.body[field]; // Status gets updated HERE
    }
  });

  if (req.body.address) {
    const addressUpdate = {};
    Object.keys(req.body.address).forEach((key) => {
      if (req.body.address[key] !== "") {
        addressUpdate[key] = req.body.address[key];
      }
    });
    if (Object.keys(addressUpdate).length > 0) {
      client.address = { ...client.address?.toObject(), ...addressUpdate };
      client.markModified("address");
    }
  }

  if (req.body.billingAddress) {
    const billingUpdate = {};
    Object.keys(req.body.billingAddress).forEach((key) => {
      if (req.body.billingAddress[key] !== "") {
        billingUpdate[key] = req.body.billingAddress[key];
      }
    });
    if (Object.keys(billingUpdate).length > 0) {
      client.billingAddress = {
        ...client.billingAddress?.toObject(),
        ...billingUpdate,
      };
      client.markModified("billingAddress");
    }
  }

  if (req.body.tags !== undefined) {
    client.tags = req.body.tags;
  }

  if (req.body.creditLimit !== undefined && req.body.creditLimit !== "") {
    client.creditLimit = Number(req.body.creditLimit);
  }

  if (req.body.creditCurrency) {
    client.creditCurrency = req.body.creditCurrency;
  }

  if (statusChanged) {
    client.activityTimeline.push({
      type: "status_change",
      title: "Status Changed",
      description: `Status changed from "${oldStatus}" to "${req.body.status}"`,
      performedBy: req.user._id,
      timestamp: new Date(),
    });
  }

  client.activityTimeline.push({
    type: "other",
    title: "Client Updated",
    description: "Client details were updated",
    performedBy: req.user._id,
    timestamp: new Date(),
  });

  client.markModified("activityTimeline");

  await client.save();

  const updatedClient = await Client.findById(client._id)
    .populate("assignedTo", "firstName lastName email avatar")
    .populate("accountManager", "firstName lastName email");

  res.status(200).json({
    success: true,
    message: "Client updated successfully",
    data: updatedClient,
  });
});

export const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  await Client.findByIdAndDelete(client._id);

  res.status(200).json({
    success: true,
    message: "Client deleted permanently",
  });
});

export const addContact = asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  if (req.body.isPrimary || client.contacts.length === 0) {
    client.contacts.forEach((c) => (c.isPrimary = false));
  }

  client.contacts.push(req.body);

  client.activityTimeline.push({
    type: "note",
    title: "Contact Added",
    description: `${req.body.firstName} ${req.body.lastName} added as contact`,
    performedBy: req.user._id,
    timestamp: new Date(),
  });

  await client.save();

  res.status(200).json({
    success: true,
    message: "Contact added successfully",
    data: client.contacts,
  });
});

export const updateContact = asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
    "contacts._id": req.params.contactId,
  });

  if (!client) {
    throw new AppError("Client or contact not found", 404);
  }

  const contact = client.contacts.id(req.params.contactId);
  if (!contact) {
    throw new AppError("Contact not found", 404);
  }

  if (req.body.isPrimary) {
    client.contacts.forEach((c) => (c.isPrimary = false));
  }

  Object.assign(contact, req.body);
  client.markModified("contacts");
  await client.save();

  res.status(200).json({
    success: true,
    message: "Contact updated successfully",
    data: client.contacts,
  });
});

export const deleteContact = asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  client.contacts = client.contacts.filter(
    (c) => c._id.toString() !== req.params.contactId,
  );

  await client.save();

  res.status(200).json({
    success: true,
    message: "Contact deleted successfully",
    data: client.contacts,
  });
});

export const addNote = asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  const note = {
    content: req.body.content,
    createdBy: req.user._id,
    isPrivate: req.body.isPrivate || false,
  };

  client.notes.push(note);

  client.activityTimeline.push({
    type: "note",
    title: "Note Added",
    description: req.body.content.substring(0, 200),
    performedBy: req.user._id,
    timestamp: new Date(),
  });

  await client.save();

  const updatedClient = await Client.findById(client._id).populate(
    "notes.createdBy",
    "firstName lastName avatar",
  );

  res.status(200).json({
    success: true,
    message: "Note added successfully",
    data: updatedClient.notes,
  });
});

export const deleteNote = asyncHandler(async (req, res) => {
  const client = await Client.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  client.notes = client.notes.filter(
    (n) => n._id.toString() !== req.params.noteId,
  );

  await client.save();

  res.status(200).json({
    success: true,
    message: "Note deleted successfully",
  });
});
