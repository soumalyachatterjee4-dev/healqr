const sendAIRXNotification = require('./sendAIRXNotification');
const sendFCMNotification = require('./sendFCMNotification');
const scheduleFCMNotification = require('./scheduleFCMNotification');
const sendPatientOTP = require('./sendPatientOTP');
const checkVideoCallExpiry = require('./checkVideoCallExpiry');
const processScheduledNotifications = require('./processScheduledNotifications');
const translateBatch = require('./translateBatch');

exports.sendAIRXNotification = sendAIRXNotification.sendAIRXNotification;
exports.sendFCMNotification = sendFCMNotification.sendFCMNotification;
exports.scheduleFCMNotification = scheduleFCMNotification.scheduleFCMNotification;
exports.sendPatientOTP = sendPatientOTP.sendPatientOTP;
exports.checkVideoCallExpiry = checkVideoCallExpiry.checkVideoCallExpiry;
exports.analyzeRXWithGemini = require('./analyzeRXWithGemini').analyzeRXWithGemini;
exports.processScheduledNotifications = processScheduledNotifications.processScheduledNotifications;
exports.translateBatch = translateBatch.translateBatch;

