const express = require("express");
const { exec } = require("child_process");
const app = express();
const port = 3000;

app.use(express.json());

app.post("/ingest", async (req, res) => {
  const { cmd } = req.body;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json(stderr);
      return;
    }
    res.json({ message: "Success" });
  });
});

app.listen(port, () => console.log(`Example app listening on ${port}`));
