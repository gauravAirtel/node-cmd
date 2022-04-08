const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { ONE_DAY, FOUR_HOURS, ONE_WEEK, LOG_FILE_PATH, ROTATING_PERIOD_IN_HOURS } = require('./config');
const { Logger: loggerConfig } = require('../../config');

const projectRootDir = loggerConfig.GENERATE_LOGS_IN_ROOT_DIR ? '/' : path.join(__dirname, '..', '..', '..');
const logDirPath = path.join(projectRootDir, ...LOG_FILE_PATH.split('/'));

class Logger {
  constructor() {
    this.currentDirPath = path.join(logDirPath, 'current');
    this.infoLogFilePath = path.join(this.currentDirPath, 'info.log');

    fs.mkdirSync(this.currentDirPath, { recursive: true });
    fs.closeSync(fs.openSync(this.infoLogFilePath, 'a'));
    this.loggerMap = {
      info: pino({}, pino.destination(this.infoLogFilePath)),
      error: pino({}, pino.destination(this.infoLogFilePath)),
    };
    this.logRotation({ LOG_FILE_PATH, ROTATING_PERIOD: ROTATING_PERIOD_IN_HOURS });
  }

  info(logObject) {
    this.loggerMap['info'].info(logObject);
    // console.log(' [INFO] ', logObject);
  }

  error(logObject) {
    this.loggerMap['error'].error(logObject);
    // console.error(' [ERROR] ', logObject);
  }

  logRotation(logObject) {
    if (process.env.NODE_APP_INSTANCE == 0 || process.env.NODE_APP_INSTANCE === undefined) {
      let { ROTATING_PERIOD } = logObject;
      if (ROTATING_PERIOD) {
        ROTATING_PERIOD = ROTATING_PERIOD * 60 * 60 * 1000;
      } else {
        ROTATING_PERIOD = ONE_DAY;
      }

      setInterval(() => {
        // create a new log file every four hours
        const source = this.infoLogFilePath;
        const destination = path.join(this.currentDirPath, `${new Date().toISOString()}.log`);
        fs.copyFile(source, destination, (err) => {
          if (err) {
            throw err;
          } else {
            fs.truncate(this.infoLogFilePath, 0, function () {});
          }
        });
      }, FOUR_HOURS);

      // rename the current folder in order to archive previous logs
      setInterval(() => {
        const newName = new Date().toISOString().split('T')[0];

        const newPath = path.join(logDirPath, newName);
        fs.mkdirSync(newPath, { recursive: true });
        // move files in the current folder to old date folder
        fs.readdir(this.currentDirPath, (err, files) => {
          //handling error
          if (err) {
            throw err;
          }
          //listing all files using forEach
          files.forEach((file) => {
            // Do whatever you want to do with the file
            if (file !== 'info.log') {
              // archieving all the older log files

              const source = path.join(this.currentDirPath, file);
              const destination = path.join(newPath, file);
              fs.copyFile(source, destination, (err) => {
                if (err) {
                  throw err;
                } else {
                  const fileToUnlink = path.join(this.currentDirPath, file);
                  fs.unlink(fileToUnlink, (err) => {
                    if (err) {
                      throw err;
                    }
                  });
                }
              });
            }
          });
        });
        // delete all previous logs - we will keep all logs for only 7days/1 week
        const oldDate = new Date() - ONE_WEEK;
        const olderFolders = fs
          .readdirSync(logDirPath, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);
        //[ 'current',2021-06-23 , 2021-06-22]
        olderFolders.forEach(function (file) {
          const arr = file.split('-');
          const olderTimestamp = new Date(arr[0], arr[1] - 1, arr[2]);
          if (olderTimestamp < oldDate) {
            Logger.removeDir(path.join(logDirPath, file));
          }
        });

        // creates a new log every day
      }, ROTATING_PERIOD);
    }
  }

  // recursive function to remove the older than one week directory
  static removeDir(path) {
    if (fs.existsSync(path)) {
      const files = fs.readdirSync(path);

      if (files.length > 0) {
        files.forEach(function (filename) {
          if (fs.statSync(path + '/' + filename).isDirectory()) {
            Logger.removeDir(path + '/' + filename);
          } else {
            fs.unlinkSync(path + '/' + filename);
          }
        });
        fs.rmdirSync(path);
      } else {
        fs.rmdirSync(path);
      }
    }
  }
}

module.exports = new Logger();
