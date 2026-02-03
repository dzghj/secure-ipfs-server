import fs from "fs";
import path from "path";
import { ipfs } from "./ipfs-client.js";

async function testUploadAndDownload() {
  try {
    const filePath = path.resolve("./test-files/imm5644e.pdf"); // adjust to your test PDF
    const fileBuffer = fs.readFileSync(filePath);

    // --- Upload ---
    console.log("⬆️ Uploading file to remote IPFS node...");
    const result = await ipfs.add(fileBuffer);
    const cid = result.cid.toString();
    console.log("✅ File uploaded!");
    console.log("CID:", cid);

    // --- Download ---
    console.log("⬇️ Downloading file from IPFS...");

    // ipfs.cat returns an async iterable
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    const downloadedBuffer = Buffer.concat(chunks);

    // Save the downloaded file locally
    const downloadPath = path.resolve("./downloads", `downloaded-${path.basename(filePath)}`);
    fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
    fs.writeFileSync(downloadPath, downloadedBuffer);

    console.log(`✅ File downloaded successfully! Saved to: ${downloadPath}`);
  } catch (err) {
    console.error("❌ Upload/download test failed:", err);
  }
}

// Run the test
testUploadAndDownload();
