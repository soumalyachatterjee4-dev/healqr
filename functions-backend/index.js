const sendAIRXNotification = require('./sendAIRXNotification');
const sendFCMNotification = require('./sendFCMNotification');
const scheduleFCMNotification = require('./scheduleFCMNotification');
const sendPatientOTP = require('./sendPatientOTP');

exports.sendAIRXNotification = sendAIRXNotification.sendAIRXNotification;
exports.sendFCMNotification = sendFCMNotification.sendFCMNotification;
exports.scheduleFCMNotification = scheduleFCMNotification.scheduleFCMNotification;
exports.sendPatientOTP = sendPatientOTP.sendPatientOTP;

