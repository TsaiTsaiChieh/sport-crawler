const { INTERNAL_SERVER_ERROR } = require('http-status');
class ExtendableError extends Error {
  constructor(message, status, isPublic, code) {
    super(message);
    this.message = message;
    this.name = this.constructor.name;
    this.status = status;
    this.isPublic = isPublic;
    this.code = code;
    this.isOperational = true; // This is required since bluebird 4 doesn't append it anymore.
    Error.captureStackTrace(this, this.constructor.name);
  }
}

class AxiosGetMethodError extends ExtendableError {
  constructor(message = 'Axios GET 請求失敗', status = 50000, isPublic = true, code = INTERNAL_SERVER_ERROR) {
    super(message, status, isPublic, code);
  }
}

class RepackageError extends ExtendableError {
  constructor(message = '資料打包失敗', status = 50001, isPublic = true, code = INTERNAL_SERVER_ERROR) {
    super(message, status, isPublic, code);
  }
}

class MySQLError extends ExtendableError {
  constructor(message = 'MySQL 錯誤', status = 50002, isPublic = true, code = INTERNAL_SERVER_ERROR) {
    super(message, status, isPublic, code);
  }
}

class RealtimeError extends ExtendableError {
  constructor(message = 'Realtime 錯誤', status = 50003, isPublic = true, code = INTERNAL_SERVER_ERROR) {
    super(message, status, isPublic, code);
  }
}

module.exports = {
  AxiosGetMethodError,
  RepackageError,
  MySQLError,
  RealtimeError
};
