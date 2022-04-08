const express = require('express');
const { spawn } = require('child_process');
const logger = require('./src/helpers/logger')
const app = express();
const port = 3000;
let _process = null;
app.use(express.json());

app.post('/ingest', async (req, res) => {
  try {
    const { cmd } = req.body;
    const message = await startProcess(cmd);
    res.status(200).json({ message, processId: _process.pid });
  } catch (error) {
    logger.error(`Start FFMPEG error: ${error}`);
    res.status(500).json({ error });
  }
});

app.post('/close', async (req, res) => {
  try {
    const { pid } = req.body;
    const message = await stopProcess(pid);
    res.status(200).json({ message, processId: _process.pid, closed: true, exitCode: code });
  } catch (error) {
    logger.error(`Stop FFMPEG error: ${error}`);
    res.status(500).json({ error });
  }
});

async function startProcess(cmd) {
  return new Promise((resolve, reject) => {
    const args = cmd.substr(7).split(' ');
    logger.info(`FFMPEG Arguments: ${args}`)
    _process = spawn('ffmpeg', args);

    if (_process.stderr) {
      _process.stderr.setEncoding('utf-8');

      _process.stderr.on('data', data =>
        logger.info(`ffmpeg::process::stderr ${data}`)
      );
    }

    if (_process.stdout) {
      _process.stdout.setEncoding('utf-8');

      _process.stdout.on('data', data =>
        logger.info(`ffmpeg::process::stderr ${data}`)
      );
    }

    _process.on('message', message =>
      logger.info(`ffmpeg::process::message ${message}`)
    );

    _process.on('error', error => {
      logger.error(`Child Process::error ${error}`);
      reject('Child Process::error:: ' + error.message);
    });

    _process.once('close', (code) => {
      logger.info(`ffmpeg::process::close ${code}`);
      if (code) {
        logger.info('FFMPEG Exited with code 1');
        reject('FFMPEG Exited with code 1');
      } else {
        resolve('FFMPEG Exited with code 0');
      }
    });
    resolve('Child Process Spawned. Check logs for execution status.');
  });
}

async function stopProcess(pid) {
  return new Promise((resolve, reject) => {
    logger.info('kill() [pid:%d]', pid);
    _process.kill('SIGINT');
    _process.on('exit', (code) => {
      logger.info(`About to exit with code: ${code}`);
      if (code) {
        logger.error('FFMPEG Exited with code 1');
        reject('FFMPEG Exited with code 1');
      } else {
        resolve('FFMPEG Exited with code 0')
      }
    });
  });
}

app.listen(port, () => console.log(`Example app listening on ${port}`));
