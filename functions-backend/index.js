const sendAIRXNotification = require('./sendAIRXNotification');
const sendFCMNotification = require('./sendFCMNotification');
const scheduleFCMNotification = require('./scheduleFCMNotification');
const sendPatientOTP = require('./sendPatientOTP');
const checkVideoCallExpiry = require('./checkVideoCallExpiry');
const processScheduledNotifications = require('./processScheduledNotifications');
const translateBatch = require('./translateBatch');
const aggregateRxTrends = require('./aggregateRxTrends');

exports.sendAIRXNotification = sendAIRXNotification.sendAIRXNotification;
exports.sendFCMNotification = sendFCMNotification.sendFCMNotification;
exports.scheduleFCMNotification = scheduleFCMNotification.scheduleFCMNotification;
exports.sendPatientOTP = sendPatientOTP.sendPatientOTP;
exports.checkVideoCallExpiry = checkVideoCallExpiry.checkVideoCallExpiry;
exports.analyzeRXWithGemini = require('./analyzeRXWithGemini').analyzeRXWithGemini;
exports.processScheduledNotifications = processScheduledNotifications.processScheduledNotifications;
exports.translateBatch = translateBatch.translateBatch;
exports.healqrAssistant = require('./healqrAssistant').healqrAssistant;
exports.monitorPlatformHealth = require('./monitorPlatformHealth').monitorPlatformHealth;
exports.resolveLocationPincode = require('./resolveLocationPincode').resolveLocationPincode;
exports.migrateClinicCodes = require('./migrateClinicCodes').migrateClinicCodes;
exports.generateDemoBookings = require('./generateDemoBookings').generateDemoBookings;
exports.aggregateRxTrends = aggregateRxTrends.aggregateRxTrends;
exports.sendDailyHealthReport = require('./sendDailyHealthReport').sendDailyHealthReport;

