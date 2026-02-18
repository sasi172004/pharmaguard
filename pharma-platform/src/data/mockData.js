// ============================================
// PHARMA DATA INTEGRITY & COMPLIANCE PLATFORM
// Mock Data for MVP Prototype
// ============================================

export const currentUser = {
  id: 'USR-001',
  name: 'Dr. Priya Sharma',
  role: 'QA Manager',
  email: 'priya.sharma@pharmalab.com',
  avatar: 'PS',
  department: 'Quality Assurance',
  lastLogin: '2026-02-18T14:02:00Z',
};

export const users = [
  { id: 'USR-001', name: 'Dr. Priya Sharma', role: 'QA Manager', department: 'Quality Assurance', status: 'active', email: 'priya.sharma@pharmalab.com', avatar: 'PS' },
  { id: 'USR-002', name: 'Rahul Mehta', role: 'QC Analyst', department: 'Quality Control', status: 'active', email: 'rahul.mehta@pharmalab.com', avatar: 'RM' },
  { id: 'USR-003', name: 'Dr. Ananya Patel', role: 'Lab Director', department: 'R&D', status: 'active', email: 'ananya.patel@pharmalab.com', avatar: 'AP' },
  { id: 'USR-004', name: 'Vikram Singh', role: 'Compliance Officer', department: 'Regulatory Affairs', status: 'active', email: 'vikram.singh@pharmalab.com', avatar: 'VS' },
  { id: 'USR-005', name: 'Neha Gupta', role: 'QC Analyst', department: 'Quality Control', status: 'active', email: 'neha.gupta@pharmalab.com', avatar: 'NG' },
  { id: 'USR-006', name: 'Arjun Reddy', role: 'Lab Technician', department: 'Testing Lab', status: 'inactive', email: 'arjun.reddy@pharmalab.com', avatar: 'AR' },
];

export const instruments = [
  { id: 'INST-001', name: 'Agilent 1260 HPLC', type: 'HPLC', serialNumber: 'DE72901234', location: 'Lab A - Room 101', status: 'online', lastCalibration: '2026-01-15', nextCalibration: '2026-04-15' },
  { id: 'INST-002', name: 'Shimadzu GC-2030', type: 'GC', serialNumber: 'C12345678', location: 'Lab A - Room 102', status: 'online', lastCalibration: '2026-02-01', nextCalibration: '2026-05-01' },
  { id: 'INST-003', name: 'PerkinElmer Lambda 365', type: 'UV-Vis Spectrophotometer', serialNumber: 'UV8837291', location: 'Lab B - Room 201', status: 'offline', lastCalibration: '2025-12-20', nextCalibration: '2026-03-20' },
  { id: 'INST-004', name: 'Waters Xevo TQ-XS', type: 'Mass Spectrometer', serialNumber: 'MS4401982', location: 'Lab C - Room 301', status: 'online', lastCalibration: '2026-01-28', nextCalibration: '2026-04-28' },
  { id: 'INST-005', name: 'Mettler Toledo XPR205', type: 'Analytical Balance', serialNumber: 'B2293847', location: 'Lab A - Room 101', status: 'online', lastCalibration: '2026-02-10', nextCalibration: '2026-05-10' },
];

export const recentUploads = [
  { id: 'UPL-001', fileName: 'HPLC_Batch_2026-0218_001.cdf', instrument: 'Agilent 1260 HPLC', uploadedBy: 'Rahul Mehta', uploadedAt: '2026-02-18T13:45:00Z', size: '4.2 MB', status: 'verified', hash: 'sha256:a3f9b2c1...', batchId: 'BATCH-2026-018' },
  { id: 'UPL-002', fileName: 'GC_Analysis_Run47.csv', instrument: 'Shimadzu GC-2030', uploadedBy: 'Neha Gupta', uploadedAt: '2026-02-18T12:30:00Z', size: '1.8 MB', status: 'verified', hash: 'sha256:d4e8f1a7...', batchId: 'BATCH-2026-018' },
  { id: 'UPL-003', fileName: 'UV_Spectrum_Sample_B12.txt', instrument: 'PerkinElmer Lambda 365', uploadedBy: 'Rahul Mehta', uploadedAt: '2026-02-18T11:15:00Z', size: '0.5 MB', status: 'pending_review', hash: 'sha256:b7c3d9e2...', batchId: 'BATCH-2026-017' },
  { id: 'UPL-004', fileName: 'MS_Impurity_Profile_X42.raw', instrument: 'Waters Xevo TQ-XS', uploadedBy: 'Dr. Ananya Patel', uploadedAt: '2026-02-18T10:00:00Z', size: '12.7 MB', status: 'verified', hash: 'sha256:e1f5a8b3...', batchId: 'BATCH-2026-017' },
  { id: 'UPL-005', fileName: 'HPLC_Stability_T3M.cdf', instrument: 'Agilent 1260 HPLC', uploadedBy: 'Neha Gupta', uploadedAt: '2026-02-17T16:20:00Z', size: '3.9 MB', status: 'verified', hash: 'sha256:c9d2e6f4...', batchId: 'BATCH-2026-016' },
  { id: 'UPL-006', fileName: 'GC_Residual_Solvents_B18.csv', instrument: 'Shimadzu GC-2030', uploadedBy: 'Rahul Mehta', uploadedAt: '2026-02-17T14:45:00Z', size: '2.1 MB', status: 'flagged', hash: 'sha256:a2b4c6d8...', batchId: 'BATCH-2026-016' },
  { id: 'UPL-007', fileName: 'Balance_Calibration_Log.xlsx', instrument: 'Mettler Toledo XPR205', uploadedBy: 'Vikram Singh', uploadedAt: '2026-02-17T09:30:00Z', size: '0.3 MB', status: 'verified', hash: 'sha256:f1e2d3c4...', batchId: null },
  { id: 'UPL-008', fileName: 'HPLC_Method_Validation_R12.cdf', instrument: 'Agilent 1260 HPLC', uploadedBy: 'Dr. Ananya Patel', uploadedAt: '2026-02-16T15:10:00Z', size: '5.8 MB', status: 'verified', hash: 'sha256:b5a4c3d2...', batchId: 'BATCH-2026-015' },
];

export const auditTrail = [
  { id: 'AUD-001', timestamp: '2026-02-18T13:45:12Z', user: 'Rahul Mehta', action: 'File Upload', target: 'HPLC_Batch_2026-0218_001.cdf', details: 'Automated upload from HPLC Watch Agent', category: 'data_capture', severity: 'info' },
  { id: 'AUD-002', timestamp: '2026-02-18T13:46:00Z', user: 'System', action: 'Integrity Check', target: 'HPLC_Batch_2026-0218_001.cdf', details: 'SHA-256 hash verified. File stored to immutable storage.', category: 'integrity', severity: 'info' },
  { id: 'AUD-003', timestamp: '2026-02-18T12:30:45Z', user: 'Neha Gupta', action: 'File Upload', target: 'GC_Analysis_Run47.csv', details: 'Manual upload via dashboard', category: 'data_capture', severity: 'info' },
  { id: 'AUD-004', timestamp: '2026-02-18T11:20:00Z', user: 'Dr. Priya Sharma', action: 'Document Approved', target: 'SOP-QC-012 v3.1', details: 'Electronic signature applied. Reason: Annual review completed.', category: 'document_control', severity: 'info' },
  { id: 'AUD-005', timestamp: '2026-02-18T10:15:00Z', user: 'Vikram Singh', action: 'Permission Changed', target: 'User: Arjun Reddy', details: 'Account deactivated. Reason: Employee departure.', category: 'access_control', severity: 'warning' },
  { id: 'AUD-006', timestamp: '2026-02-18T09:30:00Z', user: 'System', action: 'Anomaly Detected', target: 'GC_Residual_Solvents_B18.csv', details: 'Peak area deviation >15% from expected range. Flagged for review.', category: 'integrity', severity: 'critical' },
  { id: 'AUD-007', timestamp: '2026-02-17T16:45:00Z', user: 'Dr. Ananya Patel', action: 'Batch Record Updated', target: 'BATCH-2026-016', details: 'Stability test results appended to batch record.', category: 'batch_tracking', severity: 'info' },
  { id: 'AUD-008', timestamp: '2026-02-17T15:00:00Z', user: 'Rahul Mehta', action: 'Document Edited', target: 'SOP-QC-008 v2.4', details: 'Section 4.2 updated: sampling frequency changed from 2h to 1h.', category: 'document_control', severity: 'warning' },
  { id: 'AUD-009', timestamp: '2026-02-17T14:00:00Z', user: 'Neha Gupta', action: 'E-Signature Applied', target: 'Batch Release - BATCH-2026-015', details: 'First approval for batch release.', category: 'signature', severity: 'info' },
  { id: 'AUD-010', timestamp: '2026-02-17T11:30:00Z', user: 'System', action: 'Calibration Alert', target: 'PerkinElmer Lambda 365', details: 'Calibration due in 30 days. Schedule maintenance.', category: 'instrument', severity: 'warning' },
  { id: 'AUD-011', timestamp: '2026-02-16T16:00:00Z', user: 'Dr. Priya Sharma', action: 'Compliance Report Generated', target: 'Monthly Compliance Summary - Jan 2026', details: 'Report exported as PDF. 47 records reviewed.', category: 'reporting', severity: 'info' },
  { id: 'AUD-012', timestamp: '2026-02-16T10:00:00Z', user: 'Vikram Singh', action: 'Login Attempt Failed', target: 'User: unknown@external.com', details: 'Unauthorized login attempt blocked. IP: 203.94.xx.xx', category: 'access_control', severity: 'critical' },
];

export const documents = [
  { id: 'DOC-001', title: 'SOP-QC-012: HPLC Method for Assay Testing', category: 'SOP', version: '3.1', status: 'approved', author: 'Dr. Ananya Patel', approvedBy: 'Dr. Priya Sharma', createdAt: '2025-06-15', updatedAt: '2026-02-18', effectiveDate: '2026-02-20', expiryDate: '2027-02-20', department: 'Quality Control' },
  { id: 'DOC-002', title: 'SOP-QC-008: Residual Solvents by GC', category: 'SOP', version: '2.4', status: 'under_review', author: 'Rahul Mehta', approvedBy: null, createdAt: '2025-03-10', updatedAt: '2026-02-17', effectiveDate: null, expiryDate: null, department: 'Quality Control' },
  { id: 'DOC-003', title: 'SOP-LAB-003: Instrument Calibration Protocol', category: 'SOP', version: '1.2', status: 'approved', author: 'Vikram Singh', approvedBy: 'Dr. Priya Sharma', createdAt: '2025-09-01', updatedAt: '2026-01-05', effectiveDate: '2026-01-10', expiryDate: '2027-01-10', department: 'Lab Operations' },
  { id: 'DOC-004', title: 'Batch Manufacturing Record Template', category: 'Template', version: '4.0', status: 'approved', author: 'Dr. Priya Sharma', approvedBy: 'Dr. Ananya Patel', createdAt: '2024-11-20', updatedAt: '2025-12-15', effectiveDate: '2026-01-01', expiryDate: '2027-01-01', department: 'Manufacturing' },
  { id: 'DOC-005', title: 'Stability Testing Protocol - ICH Q1A', category: 'Protocol', version: '2.0', status: 'approved', author: 'Dr. Ananya Patel', approvedBy: 'Dr. Priya Sharma', createdAt: '2025-04-25', updatedAt: '2025-11-30', effectiveDate: '2025-12-01', expiryDate: '2026-12-01', department: 'R&D' },
  { id: 'DOC-006', title: 'Deviation Report DR-2026-003', category: 'Deviation', version: '1.0', status: 'pending_signature', author: 'Neha Gupta', approvedBy: null, createdAt: '2026-02-15', updatedAt: '2026-02-17', effectiveDate: null, expiryDate: null, department: 'Quality Control' },
  { id: 'DOC-007', title: 'CAPA-2026-001: OOS Investigation', category: 'CAPA', version: '1.1', status: 'in_progress', author: 'Rahul Mehta', approvedBy: null, createdAt: '2026-01-20', updatedAt: '2026-02-10', effectiveDate: null, expiryDate: null, department: 'Quality Assurance' },
  { id: 'DOC-008', title: 'Annual Product Quality Review - 2025', category: 'Report', version: '1.0', status: 'draft', author: 'Dr. Priya Sharma', approvedBy: null, createdAt: '2026-02-01', updatedAt: '2026-02-16', effectiveDate: null, expiryDate: null, department: 'Quality Assurance' },
];

export const batches = [
  { id: 'BATCH-2026-018', product: 'Amoxicillin 500mg Capsules', stage: 'In-Process Testing', status: 'active', startDate: '2026-02-17', completionDate: null, assignedTo: 'Rahul Mehta', filesCount: 4, compliance: 85 },
  { id: 'BATCH-2026-017', product: 'Metformin 850mg Tablets', stage: 'Final QC Review', status: 'pending_release', startDate: '2026-02-14', completionDate: null, assignedTo: 'Neha Gupta', filesCount: 8, compliance: 95 },
  { id: 'BATCH-2026-016', product: 'Omeprazole 20mg Capsules', stage: 'Stability Testing', status: 'active', startDate: '2026-02-10', completionDate: null, assignedTo: 'Dr. Ananya Patel', filesCount: 6, compliance: 90 },
  { id: 'BATCH-2026-015', product: 'Ciprofloxacin 250mg Tablets', stage: 'Released', status: 'released', startDate: '2026-02-01', completionDate: '2026-02-16', assignedTo: 'Rahul Mehta', filesCount: 12, compliance: 100 },
  { id: 'BATCH-2026-014', product: 'Paracetamol 500mg Tablets', stage: 'Released', status: 'released', startDate: '2026-01-25', completionDate: '2026-02-08', assignedTo: 'Neha Gupta', filesCount: 10, compliance: 100 },
  { id: 'BATCH-2026-013', product: 'Azithromycin 250mg Tablets', stage: 'Rejected', status: 'rejected', startDate: '2026-01-20', completionDate: '2026-02-05', assignedTo: 'Rahul Mehta', filesCount: 9, compliance: 45 },
];

export const complianceChecklist = [
  { id: 'CHK-001', item: 'All instrument data files uploaded', status: 'complete', category: 'Data Integrity', dueDate: '2026-02-28' },
  { id: 'CHK-002', item: 'Audit trail completeness verified', status: 'complete', category: 'Audit Trail', dueDate: '2026-02-28' },
  { id: 'CHK-003', item: 'SOPs reviewed and current', status: 'in_progress', category: 'Document Control', dueDate: '2026-02-28' },
  { id: 'CHK-004', item: 'User access permissions reviewed', status: 'complete', category: 'Access Control', dueDate: '2026-02-28' },
  { id: 'CHK-005', item: 'Instrument calibration records current', status: 'warning', category: 'Instrument Mgmt', dueDate: '2026-03-20' },
  { id: 'CHK-006', item: 'Electronic signatures validated', status: 'complete', category: '21 CFR Part 11', dueDate: '2026-02-28' },
  { id: 'CHK-007', item: 'Deviation reports closed', status: 'in_progress', category: 'CAPA', dueDate: '2026-03-15' },
  { id: 'CHK-008', item: 'Annual product review completed', status: 'pending', category: 'Quality Review', dueDate: '2026-03-31' },
];

export const dashboardMetrics = {
  totalUploads: 1247,
  uploadsThisWeek: 34,
  uploadsTrend: 12,
  auditCompleteness: 97.3,
  auditCompletenessTrend: 2.1,
  activeDocuments: 156,
  pendingReviews: 8,
  activeBatches: 3,
  releasedBatches: 14,
  complianceScore: 94,
  complianceTrend: 3,
  openDeviations: 2,
  pendingCAPAs: 1,
};

export const uploadTrendData = [
  { date: 'Jan 13', uploads: 28, verified: 26 },
  { date: 'Jan 20', uploads: 35, verified: 34 },
  { date: 'Jan 27', uploads: 31, verified: 30 },
  { date: 'Feb 03', uploads: 42, verified: 41 },
  { date: 'Feb 10', uploads: 38, verified: 36 },
  { date: 'Feb 17', uploads: 34, verified: 32 },
];

export const complianceTrendData = [
  { month: 'Sep', score: 82 },
  { month: 'Oct', score: 85 },
  { month: 'Nov', score: 88 },
  { month: 'Dec', score: 91 },
  { month: 'Jan', score: 92 },
  { month: 'Feb', score: 94 },
];

export const instrumentActivityData = [
  { name: 'HPLC', uploads: 482, label: 'Agilent 1260' },
  { name: 'GC', uploads: 318, label: 'Shimadzu GC-2030' },
  { name: 'UV-Vis', uploads: 215, label: 'PerkinElmer Lambda' },
  { name: 'MS', uploads: 156, label: 'Waters Xevo' },
  { name: 'Balance', uploads: 76, label: 'Mettler Toledo' },
];

export const notifications = [
  { id: 'NOT-001', type: 'critical', title: 'Data Anomaly Detected', message: 'GC residual solvents result flagged — review required', time: '3h ago', read: false },
  { id: 'NOT-002', type: 'warning', title: 'Calibration Due', message: 'PerkinElmer Lambda 365 calibration due in 30 days', time: '6h ago', read: false },
  { id: 'NOT-003', type: 'info', title: 'Document Approved', message: 'SOP-QC-012 v3.1 approved and effective Feb 20', time: '8h ago', read: true },
  { id: 'NOT-004', type: 'warning', title: 'Pending Review', message: 'SOP-QC-008 v2.4 awaiting your review', time: '1d ago', read: false },
  { id: 'NOT-005', type: 'info', title: 'Batch Released', message: 'BATCH-2026-015 successfully released', time: '2d ago', read: true },
];
