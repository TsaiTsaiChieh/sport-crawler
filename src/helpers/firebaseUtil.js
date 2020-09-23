const envValues = require('../configs/envValues');
const admin = require('firebase-admin');
const ServerErrors = require('./ServerErrors');
const realtime = initialize().database();

function initialize() {
  if (admin.apps.length === 0) {
    console.log('initializing firebase database');
    const cert = require(envValues.cert);
    return admin.initializeApp({
      credential: admin.credential.cert(cert),
      databaseURL: envValues.firebaseConfig.databaseURL,
      storageBucket: envValues.firebaseConfig.storageBucket
    });
  } else return admin;
}

async function set2realtime(path, data) {
  try {
    await realtime.ref(path).set(data);
    return Promise.resolve();
  } catch (err) {
    return new Error(new ServerErrors.RealtimeError(err.stack));
  }
}

module.exports = {
  initialize,
  set2realtime
};
