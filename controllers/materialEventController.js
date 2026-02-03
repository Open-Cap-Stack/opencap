/**
 * MaterialEvent Controller
 * Feature: Issue #60 - Build Material Events Tracking
 *
 * Handles API endpoints for material event detection and management.
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

    const event = new MaterialEvent({
      companyId,
      eventType,
      eventDate: eventDate || new Date(),
      description,
      triggersValuation,
      impactSeverity,
      valuationImpactReason,
      relatedEntities,
      notes,
      tags,
      metadata,
      detectionSource: 'manual',
      detectedBy: req.user._id,
      createdBy: req.user._id,
      statusHistory: [{
        status: 'detected',
        changedAt: new Date(),
        changedBy: req.user._id,
        reason: 'Event created manually'
      }]
    });

    await event.save();

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

    const events = await MaterialEvent.find(query)
      .populate('companyId', 'name')
      .populate('detectedBy', 'firstName lastName email')
      .sort({ eventDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MaterialEvent.countDocuments(query);

    res.json({
      success: true,
      data: events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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

    const event = await MaterialEvent.findOne({ eventId })
      .populate('companyId', 'name')
      .populate('detectedBy', 'firstName lastName email')
      .populate('resolution.resolvedBy', 'firstName lastName email')
      .populate('resolution.valuationRequestId')
      .populate('actionItems.assignedTo', 'firstName lastName email')
      .populate('statusHistory.changedBy', 'firstName lastName email');

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
    const updates = req.body;

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

    Object.assign(event, updates);
    event.updatedBy = req.user._id;
    await event.save();

    res.json({
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

// Acknowledge an event
exports.acknowledgeEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { notes } = req.body;

    const event = await MaterialEvent.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    await event.acknowledge(req.user._id, notes);

    res.json({
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

// Mark event as action required
exports.markActionRequired = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { actionItems, notes } = req.body;

    const event = await MaterialEvent.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    await event.markActionRequired(req.user._id, actionItems || [], notes);

    res.json({
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

// Resolve an event
exports.resolveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { notes, valuationRequestId } = req.body;

    const event = await MaterialEvent.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    await event.resolve(req.user._id, { notes, valuationRequestId });

    res.json({
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

    const event = await MaterialEvent.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    await event.dismiss(req.user._id, reason);

    res.json({
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

// Add action item to event
exports.addActionItem = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { action, assignedTo, dueDate } = req.body;

    const event = await MaterialEvent.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    await event.addActionItem({ action, assignedTo, dueDate }, req.user._id);

    res.json({
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

// Complete action item
exports.completeActionItem = async (req, res) => {
  try {
    const { eventId, actionItemId } = req.params;
    const { notes } = req.body;

    const event = await MaterialEvent.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    await event.completeActionItem(actionItemId, req.user._id, notes);

    res.json({
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

    const event = await MaterialEvent.detectFromFundraisingRound(roundData, req.user._id);

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
      req.user._id
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
      recentEvents
    ] = await Promise.all([
      MaterialEvent.findActionRequired(companyId),
      MaterialEvent.findValuationTriggers(companyId),
      MaterialEvent.getCompanySummary(companyId),
      MaterialEvent.find({ companyId })
        .sort({ eventDate: -1 })
        .limit(10)
        .select('eventId eventType eventDate status triggersValuation impactSeverity')
    ]);

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
