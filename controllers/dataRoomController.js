/**
 * DataRoom Controller
 * Issue #194: Build Data Room Backend Infrastructure
 */

const DataRoom = require('../models/DataRoom');

exports.createDataRoom = async (req, res) => {
  try {
    const { name, description, accessSettings, metadata, companyId, settings } = req.body;
    if (!name) return res.status(400).json({ message: 'Data room name is required' });
    // Support both frontend (companyId, settings) and backend (ownerCompany, accessSettings) formats
    const targetCompanyId = companyId || req.user?.companyId;
    const roomAccessSettings = accessSettings || {
      downloadEnabled: settings?.allowDownload !== false,
      watermarkEnabled: settings?.watermarkDocuments || false,
      requireNDA: settings?.requireAuthentication || false
    };

    const createData = {
      name,
      description: description || '',
      ownerCompany: targetCompanyId,
      createdBy: req.user?.userId,
      accessSettings: roomAccessSettings,
      metadata: metadata || {}
    };

    console.log('Creating data room with data:', JSON.stringify(createData, null, 2));

    const dataRoom = await DataRoom.create(createData);

    console.log('Data room created:', JSON.stringify(dataRoom, null, 2));

    // Ensure dataRoomId is present
    if (!dataRoom || !dataRoom.dataRoomId) {
      console.error('Data room created but missing dataRoomId:', dataRoom);
      // Try to use the _id or row_id as fallback
      if (dataRoom && (dataRoom._id || dataRoom.row_id)) {
        dataRoom.dataRoomId = dataRoom._id || dataRoom.row_id;
      }
    }

    try { await DataRoom.logActivity(dataRoom.dataRoomId, { action: 'data_room_created', userId: req.user?.userId, details: { name } }); } catch (e) {
      console.error('Failed to log activity:', e.message);
    }
    res.status(201).json(transformDataRoom(dataRoom));
  } catch (error) {
    console.error('Failed to create data room:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getDataRooms = async (req, res) => {
  try {
    const { page = 1, limit = 100, status, search, companyId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    // Use companyId from query or fall back to user's companyId
    const targetCompanyId = companyId || req.user?.companyId;
    let dataRooms = await DataRoom.findByCompany(targetCompanyId, { skip, limit: parseInt(limit), sort: { createdAt: -1 } });
    if (status) dataRooms = dataRooms.filter(dr => dr.status === status);
    if (search) { const searchLower = search.toLowerCase(); dataRooms = dataRooms.filter(dr => dr.name.toLowerCase().includes(searchLower) || dr.description?.toLowerCase().includes(searchLower)); }
    // Transform to frontend format
    const transformedRooms = dataRooms.map(transformDataRoom);
    res.status(200).json(transformedRooms);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// Helper to transform backend data room to frontend format
function transformDataRoom(room) {
  return {
    _id: room.dataRoomId,
    dataRoomId: room.dataRoomId,
    name: room.name,
    description: room.description || '',
    companyId: room.ownerCompany,
    createdBy: room.createdBy,
    status: room.status,
    documents: (room.documents || []).map(doc => ({
      _id: doc.documentId,
      documentId: doc.documentId,
      documentName: doc.documentName || doc.documentId,
      documentType: doc.documentType || 'unknown',
      fileSize: doc.fileSize || 0,
      contentType: doc.contentType || 'application/octet-stream',
      uploadedBy: doc.addedBy,
      uploadedAt: doc.addedAt,
      accessCount: doc.accessCount || 0,
      lastAccessedAt: doc.lastAccessedAt
    })),
    members: (room.permissions || []).map(perm => ({
      userId: perm.userId,
      email: perm.email || '',
      role: perm.level === 'admin' ? 'admin' : perm.level === 'upload' ? 'contributor' : 'viewer',
      permissions: {
        canView: ['view', 'download', 'upload', 'admin'].includes(perm.level),
        canDownload: ['download', 'upload', 'admin'].includes(perm.level),
        canUpload: ['upload', 'admin'].includes(perm.level),
        canDelete: perm.level === 'admin',
        canShare: perm.level === 'admin'
      },
      addedAt: perm.grantedAt,
      addedBy: perm.grantedBy
    })),
    settings: {
      allowDownload: room.accessSettings?.downloadEnabled !== false,
      watermarkDocuments: room.accessSettings?.watermarkEnabled || false,
      requireAuthentication: room.accessSettings?.requireNDA || false,
      expiresAt: room.accessSettings?.externalAccess?.expiresAt,
      maxDownloads: room.accessSettings?.externalAccess?.maxViews
    },
    externalLink: room.accessSettings?.externalAccess?.enabled ? {
      url: room.accessSettings.externalAccess.accessUrl,
      token: room.accessSettings.externalAccess.accessToken,
      expiresAt: room.accessSettings.externalAccess.expiresAt,
      requirePassword: false
    } : undefined,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt
  };
}

exports.getDataRoomStats = async (req, res) => {
  try {
    const { companyId } = req.query;
    const targetCompanyId = companyId || req.user?.companyId;

    // Get all data rooms for this company
    const allRooms = await DataRoom.findByCompany(targetCompanyId, { limit: 1000 });

    // Calculate stats
    const activeRooms = allRooms.filter(r => r.status === 'active');
    const archivedRooms = allRooms.filter(r => r.status === 'archived');

    // Count total documents across all rooms
    const totalDocuments = allRooms.reduce((sum, room) => sum + (room.documents?.length || 0), 0);

    // Count unique members (permissions) across all rooms
    const allMemberIds = new Set();
    allRooms.forEach(room => {
      (room.permissions || []).forEach(perm => {
        if (perm.userId) allMemberIds.add(perm.userId);
      });
    });

    // Count recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let recentActivity = 0;
    allRooms.forEach(room => {
      (room.activityLog || []).forEach(activity => {
        if (new Date(activity.timestamp) > sevenDaysAgo) {
          recentActivity++;
        }
      });
    });

    res.status(200).json({
      totalRooms: allRooms.length,
      activeRooms: activeRooms.length,
      archivedRooms: archivedRooms.length,
      totalDocuments,
      totalMembers: allMemberIds.size,
      recentActivity
    });
  } catch (error) {
    console.error('Failed to get data room stats:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getDataRoomById = async (req, res) => {
  try {
    const dataRoom = await DataRoom.findByDataRoomId(req.params.id);
    if (!dataRoom) return res.status(404).json({ message: 'Data room not found' });
    const hasAccess = DataRoom.hasPermission(dataRoom, req.user?.userId, 'view');
    const isCompanyMember = dataRoom.ownerCompany === req.user?.companyId;
    if (!hasAccess && !isCompanyMember && req.user?.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    res.status(200).json(transformDataRoom(dataRoom));
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
    if (req.body.settings !== undefined) {
      // Handle frontend settings format
      updateData.accessSettings = {
        ...dataRoom.accessSettings,
        downloadEnabled: req.body.settings.allowDownload !== false,
        watermarkEnabled: req.body.settings.watermarkDocuments || false,
        requireNDA: req.body.settings.requireAuthentication || false
      };
    }
    if (req.body.metadata !== undefined) updateData.metadata = { ...dataRoom.metadata, ...req.body.metadata };
    if (req.body.status !== undefined && DataRoom.dataRoomStatuses.includes(req.body.status)) updateData.status = req.body.status;
    await DataRoom.updateOne({ dataRoomId: req.params.id }, { $set: updateData });
    try { await DataRoom.logActivity(req.params.id, { action: 'data_room_updated', userId: req.user?.userId, details: { updatedFields: Object.keys(updateData) } }); } catch (e) {}
    const updatedRoom = await DataRoom.findByDataRoomId(req.params.id);
    res.status(200).json(transformDataRoom(updatedRoom));
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
