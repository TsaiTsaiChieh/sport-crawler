// The NODE_ENV of test VM or localhost is [test], production is [production]
const isEmulator = process.env.NODE_ENV === 'test';
const { env } = process;
const firebaseConfig = {
  apiKey: isEmulator ? env['test-firebaseApiKey'] : env['product-firebaseApiKey'],
  authDomain: isEmulator ? env['test-firebaseAuthDomain'] : env['product-firebaseAuthDomain'],
  databaseURL: isEmulator ? env['test-firebaseDatabaseURL'] : env['product-firebaseDatabaseURL'],
  projectId: isEmulator ? env['test-GCLOUD_PROJECT'] : env['product-GCLOUD_PROJECT'],
  storageBucket: isEmulator ? env['test-firebaseStorageBucket'] : env['product-firebaseStorageBucket'],
  messagingSenderId: isEmulator ? env['test-firebaseMessagingSenderId'] : env['product-firebaseMessagingSenderId'],
  appId: isEmulator ? env['test-firebaseAppId'] : env['product-firebaseAppId'],
  measurementId: isEmulator ? env['test-firebaseMeasurementId'] : env['product-firebaseMeasurementId']
};
const betsToken = '46719-gZEnjYySo0cLKx';
const cert = isEmulator ? env['test-certPath'] : env['product-certPath'];
const hwAccount = {
  no: isEmulator ? env['test-hw_no'] : env['product-hw_no'],
  pwd: isEmulator ? env['test-hw_pwd'] : env['product-hw_pwd']
};
module.exports = {
  firebaseConfig,
  betsToken,
  cert,
  hwAccount
};
