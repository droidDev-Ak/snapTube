import express from "express";
import cors from "cors";
import ytdl from "yt-dlp-exec";
import progressEstimator from "progress-estimator";

const app = express();
const logger = progressEstimator();
app.use(
  cors({
    origin: "https://snap-tube-ui.vercel.app",
    credentials: true,
  })
);
app.use(express.json());
const port = process.env.PORT || 3000;

app.post("/getVideoInfo", async (req, res) => {
  try {
    const url = req.body.videoURL;
    const infoPromise = ytdl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
    });
    const info = await logger(infoPromise, `Obtaining ${url}`);

    res.json({
      message: "Request received successfully",
      data: info,
    });
  } catch (error) {
    res.status(500);
    console.log(error);
    res.send(error);
  }
});

app.post("/downloadVideo", (req, res) => {
  try {
    console.log(req.body.format.asr);
    const videoURL = req.body.videoURL;
    const formatId = req.body.format.format_id;
    const videoTitle = req.body.title;
    const fileExtension = req.body.format.ext;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${videoTitle}.${fileExtension}"`
    );
    res.setHeader("Content-Type", `video/${fileExtension}`);

    const downloadProcess = ytdl.exec(videoURL, {
      format: formatId,
      output: "-",
    });

    downloadProcess.stdout.pipe(res);

    downloadProcess.on("error", (err) => {
      console.error("Error during download process:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Download failed." });
      }
      res.end();
    });

    downloadProcess.on("close", (code) => {
      if (code === 0) {
        console.log("Download completed successfully.");
      } else {
        console.error(`Download process exited with error code: ${code}`);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: `Download failed with exit code ${code}.`,
          });
        }
        res.end();
      }
    });
  } catch (error) {
    console.error("Failed to initiate download:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to start the download.",
      });
    }
    res.end();
  }
});
app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
