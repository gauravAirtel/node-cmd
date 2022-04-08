const env = process.env.NODE_ENV || 'local';

const config = {
  common: {
    GENERATE_LOGS_IN_ROOT_DIR: true,
  },
  local: {
    GENERATE_LOGS_IN_ROOT_DIR: false,
  },
};

module.exports = Object.assign(config.common, config[env]);