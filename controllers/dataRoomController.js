/**
 * DataRoom Controller
 * Issue #194: Build Data Room Backend Infrastructure
 */

const DataRoom = require('../models/DataRoom');

exports.createDataRoom = async (req, res) => {
  try {
    const { name, description, accessSettings, metadata } = req.body;
    if (!name) return res.status(400).json({ message: 'Data room name is required' });
    const dataRoom = await DataRoom.create({ name, description: description || '', ownerCompany: req.user?.companyId, createdBy: req.user?.userId, accessSettings: accessSettings || {}, metadata: metadata || {} });
    try { await DataRoom.logActivity(dataRoom.dataRoomId, { action: 'data_room_created', userId: req.user?.userId, details: { name } }); } catch (e) {}
    res.status(201).json(dataRoom);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getDataRooms = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let dataRooms = await DataRoom.findByCompany(req.user?.companyId, { skip, limit: parseInt(limit), sort: { createdAt: -1 } });
    if (status) dataRooms = dataRooms.filter(dr => dr.status === status);
    if (search) { const searchLower = search.toLowerCase(); dataRooms = dataRooms.filter(dr => dr.name.toLowerCase().includes(searchLower) || dr.description?.toLowerCase().includes(searchLower)); }
    res.status(200).json({ dataRooms, pagination: { page: parseInt(page), limit: parseInt(limit), total: dataRooms.length } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getDataRoomById = async (req, res) => {
  try {
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    if (!dataRoom) return res.status(404).json({ message: 'Data room not found' });
    const hasAccess = DataRoom.hasPermission(dataRoom, req.user?.userId, 'view');
    const isCompanyMember = dataRoom.ownerCompany === req.user?.companyId;
    if (!hasAccess && !isCompanyMember && req.user?.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    res.status(200).json(dataRoom);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.updateDataRoom = async (req, res) => {
  try {
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    if (!dataRoom) return res.status(404).json({ message: 'Data room not found' });
    if (!DataRoom.hasPermission(dataRoom, req.user?.userId, 'admin') && req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin permission required' });
    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.accessSettings !== undefined) updateData.accessSettings = { ...dataRoom.accessSettings, ...req.body.accessSettings };
    if (req.body.metadata !== undefined) updateData.metadata = { ...dataRoom.metadata, ...req.body.metadata };
    if (req.body.status !== undefined && DataRoom.dataRoomStatuses.includes(req.body.status)) updateData.status = req.body.status;
    await DataRoom.updateOne({ dataRoomId: req.params.id }, { $set: updateData });
    try { await DataRoom.logActivity(req.params.id, { action: 'data_room_updated', userId: req.user?.userId, details: { updatedFields: Object.keys(updateData) } }); } catch (e) {}
    res.status(200).json(await DataRoom.findByDataRoomId(req.params.id));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.deleteDataRoom = async (req, res) => {
  try {
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    if (!dataRoom) return res.status(404).json({ message: 'Data room not found' });
    if (!DataRoom.hasPermission(dataRoom, req.user?.userId, 'admin') && req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin permission required' });
    await DataRoom.softDelete(req.params.id);
    res.status(200).json({ message: 'Data room deleted successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.addDocument = async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    if (!dataRoom) return res.status(404).json({ message: 'Data room not found' });
    if (!DataRoom.hasPermission(dataRoom, req.user?.userId, 'upload') && req.user?.role !== 'admin') return res.status(403).json({ message: 'Upload permission required' });
    await DataRoom.addDocument(req.params.id, documentId, req.user?.userId);
    try { await DataRoom.logActivity(req.params.id, { action: 'document_added', userId: req.user?.userId, details: { documentId } }); } catch (e) {}
    res.status(201).json({ message: 'Document added successfully', documentId });
  } catch (error) {
    if (error.message === 'Document already in data room') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: error.message });
  }
};

exports.removeDocument = async (req, res) => {
  try {
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    if (!dataRoom) return res.status(404).json({ message: 'Data room not found' });
    if (!DataRoom.hasPermission(dataRoom, req.user?.userId, 'admin') && req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin permission required' });
    await DataRoom.removeDocument(req.params.id, req.params.docId);
    try { await DataRoom.logActivity(req.params.id, { action: 'document_removed', userId: req.user?.userId, details: { documentId: req.params.docId } }); } catch (e) {}
    res.status(200).json({ message: 'Document removed successfully' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.managePermissions = async (req, res) => {
  try {
    const { action, userId, email, level, expiresAt } = req.body;
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    if (!dataRoom) return res.status(404).json({ message: 'Data room not found' });
    if (!DataRoom.hasPermission(dataRoom, req.user?.userId, 'admin') && req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin permission required' });
    if (!['add', 'remove', 'update'].includes(action)) return res.status(400).json({ message: 'Invalid action. Use add, remove, or update' });
    if ((action === 'add' || action === 'update') && (!level || !DataRoom.permissionLevels.includes(level))) return res.status(400).json({ message: `Invalid permission level. Use: ${DataRoom.permissionLevels.join(', ')}` });
    if (action === 'add' || action === 'update') { const permission = { userId, email, level }; if (expiresAt) permission.expiresAt = expiresAt; await DataRoom.addPermission(req.params.id, permission, req.user?.userId); }
    else if (action === 'remove') { if (!userId) return res.status(400).json({ message: 'userId is required for removing permission' }); await DataRoom.removePermission(req.params.id, userId); }
    try { await DataRoom.logActivity(req.params.id, { action: `permission_${action}`, userId: req.user?.userId, details: { targetUser: userId || email, level } }); } catch (e) {}
    const updated = await DataRoom.findByDataRoomId(req.params.id);
    res.status(200).json({ message: `Permission ${action} successful`, permissions: updated.permissions });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getActivityLog = async (req, res) => {
  try {
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    if (!dataRoom) return res.status(404).json({ message: 'Data room not found' });
    const hasAccess = DataRoom.hasPermission(dataRoom, req.user?.userId, 'view');
    if (!hasAccess && dataRoom.ownerCompany !== req.user?.companyId && req.user?.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const activities = await DataRoom.getActivityLog(req.params.id, { skip, limit: parseInt(limit) });
    res.status(200).json({ activities, pagination: { page: parseInt(page), limit: parseInt(limit), total: activities.length } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.exportAsZip = async (req, res) => {
  try {
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    if (!dataRoom) return res.status(404).json({ message: 'Data room not found' });
    if (!DataRoom.hasPermission(dataRoom, req.user?.userId, 'download') && req.user?.role !== 'admin') return res.status(403).json({ message: 'Download permission required' });
    try { await DataRoom.logActivity(req.params.id, { action: 'zip_export_initiated', userId: req.user?.userId, details: { documentCount: dataRoom.documents.length } }); } catch (e) {}
    res.status(200).json({ message: 'ZIP export initiated', dataRoomId: req.params.id, dataRoomName: dataRoom.name, documentCount: dataRoom.documents.length, status: 'processing', downloadUrl: `/api/v1/data-rooms/${req.params.id}/download` });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.generateExternalLink = async (req, res) => {
  try {
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    if (!dataRoom) return res.status(404).json({ message: 'Data room not found' });
    if (!DataRoom.hasPermission(dataRoom, req.user?.userId, 'admin') && req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin permission required' });
    const { expiresInHours = 24, maxViews } = req.body;
    const accessLink = await DataRoom.generateAccessLink(req.params.id, expiresInHours, { createdBy: req.user?.userId, maxViews });
    try { await DataRoom.logActivity(req.params.id, { action: 'external_link_generated', userId: req.user?.userId, details: { expiresInHours, maxViews } }); } catch (e) {}
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    res.status(200).json({ ...accessLink, accessUrl: `${baseUrl}/data-room/${req.params.id}/external?token=${accessLink.accessToken}` });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.validateExternalAccess = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Access token is required' });
    const isValid = await DataRoom.validateAccessToken(req.params.id, token);
    if (!isValid) return res.status(403).json({ message: 'Invalid or expired access token' });
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    res.status(200).json({ dataRoomId: dataRoom.dataRoomId, name: dataRoom.name, description: dataRoom.description, documentCount: dataRoom.documents.length });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
