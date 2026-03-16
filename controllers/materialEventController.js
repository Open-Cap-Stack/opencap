/**
 * MaterialEvent Controller
 * Feature: Issue #60 - Build Material Events Tracking
 *
 * Handles API endpoints for material event detection and management.
 * Migrated to ZeroDB - no Mongoose patterns (no new Model(), .save(), .populate())
 */
const MaterialEvent = require('../models/MaterialEvent');

// Create a new material event
exports.createEvent = async (req, res) => {
  try {
    const {
      companyId,
      eventType,
      eventDate,
      description,
      triggersValuation,
      impactSeverity,
      valuationImpactReason,
      relatedEntities,
      notes,
      tags,
      metadata
    } = req.body;

    const event = await MaterialEvent.create({
      companyId,
      eventType,
      eventDate: eventDate || new Date().toISOString(),
      description,
      triggersValuation,
      severity: impactSeverity,
      valuationImpactReason,
      relatedEntities,
      notes,
      tags,
      metadata,
      detectionSource: 'manual',
      detectedBy: req.user?.userId,
      createdBy: req.user?.userId,
      statusHistory: [{
        status: 'detected',
        changedAt: new Date().toISOString(),
        changedBy: req.user?.userId,
        reason: 'Event created manually'
      }]
    });

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all events for a company
exports.getCompanyEvents = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status, eventType, triggersValuation, page = 1, limit = 20 } = req.query;

    const query = { companyId };
    if (status) query.status = status;
    if (eventType) query.eventType = eventType;
    if (triggersValuation !== undefined) {
      query.triggersValuation = triggersValuation === 'true';
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const events = await MaterialEvent.find(query, {
      sort: { eventDate: -1 },
      skip: (pageNum - 1) * limitNum,
      limit: limitNum
    });

    const total = await MaterialEvent.countDocuments(query);

    res.json({
      success: true,
      data: events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get a single event
exports.getEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await MaterialEvent.findOne({ eventId });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update an event
exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const updates = { ...req.body };

    const event = await MaterialEvent.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Prevent status changes through this endpoint
    delete updates.status;
    delete updates.statusHistory;

    updates.updatedBy = req.user?.userId;

    await MaterialEvent.updateOne({ eventId }, { $set: updates });
    const updatedEvent = await MaterialEvent.findOne({ eventId });

    res.json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Acknowledge an event
exports.acknowledgeEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { notes } = req.body;

    const updatedEvent = await MaterialEvent.acknowledge(eventId, req.user?.userId, notes);

    res.json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    const statusCode = error.message === 'Event not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

// Mark event as action required
exports.markActionRequired = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { actionItems, notes } = req.body;

    const updatedEvent = await MaterialEvent.markActionRequired(eventId, req.user?.userId, actionItems || [], notes);

    res.json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    const statusCode = error.message === 'Event not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

// Resolve an event
exports.resolveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { notes, valuationRequestId } = req.body;

    const updatedEvent = await MaterialEvent.resolve(eventId, req.user?.userId, { notes, valuationRequestId });

    res.json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    const statusCode = error.message === 'Event not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

// Dismiss an event
exports.dismissEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Dismissal reason is required'
      });
    }

    const updatedEvent = await MaterialEvent.dismiss(eventId, req.user?.userId, reason);

    res.json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    const statusCode = error.message === 'Event not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

// Add action item to event
exports.addActionItem = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { action, assignedTo, dueDate } = req.body;

    const updatedEvent = await MaterialEvent.addActionItem(eventId, { action, assignedTo, dueDate }, req.user?.userId);

    res.json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    const statusCode = error.message === 'Event not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

// Complete action item
exports.completeActionItem = async (req, res) => {
  try {
    const { eventId, actionItemId } = req.params;
    const { notes } = req.body;

    const updatedEvent = await MaterialEvent.completeActionItem(eventId, actionItemId, req.user?.userId, notes);

    res.json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    const statusCode = error.message === 'Event not found' || error.message === 'Action item not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

// Get events requiring action
exports.getActionRequired = async (req, res) => {
  try {
    const { companyId } = req.query;

    const events = await MaterialEvent.findActionRequired(companyId || null);

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get events that trigger valuation
exports.getValuationTriggers = async (req, res) => {
  try {
    const { companyId } = req.query;

    const events = await MaterialEvent.findValuationTriggers(companyId || null);

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get company summary
exports.getCompanySummary = async (req, res) => {
  try {
    const { companyId } = req.params;

    const summary = await MaterialEvent.getCompanySummary(companyId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Detect event from fundraising round (webhook/internal use)
exports.detectFromFundraisingRound = async (req, res) => {
  try {
    const roundData = req.body;

    const event = await MaterialEvent.detectFromFinancingRound(roundData, req.user?.userId);

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Detect event from employee change (webhook/internal use)
exports.detectFromEmployeeChange = async (req, res) => {
  try {
    const { employeeData, changeType } = req.body;

    if (!['departure', 'hire'].includes(changeType)) {
      return res.status(400).json({
        success: false,
        error: 'changeType must be "departure" or "hire"'
      });
    }

    const event = await MaterialEvent.detectFromEmployeeChange(
      employeeData,
      changeType,
      req.user?.userId
    );

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get compliance dashboard data
exports.getComplianceDashboard = async (req, res) => {
  try {
    const { companyId } = req.params;

    const [
      actionRequired,
      valuationTriggers,
      summary,
      allEvents
    ] = await Promise.all([
      MaterialEvent.findActionRequired(companyId),
      MaterialEvent.findValuationTriggers(companyId),
      MaterialEvent.getCompanySummary(companyId),
      MaterialEvent.find({ companyId })
    ]);

    // Sort and limit recent events in-memory
    const recentEvents = allEvents
      .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
      .slice(0, 10)
      .map(e => ({
        eventId: e.eventId,
        eventType: e.eventType,
        eventDate: e.eventDate,
        status: e.status,
        triggersValuation: e.triggersValuation,
        impactSeverity: e.severity
      }));

    res.json({
      success: true,
      data: {
        actionRequiredCount: actionRequired.length,
        valuationTriggersCount: valuationTriggers.length,
        summary,
        actionRequired: actionRequired.slice(0, 5),
        valuationTriggers: valuationTriggers.slice(0, 5),
        recentEvents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
