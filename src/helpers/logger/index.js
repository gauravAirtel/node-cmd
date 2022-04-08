const logger = require('./logger.service');

module.exports = { info: logger.info.bind(logger), error: logger.error.bind(logger) };
