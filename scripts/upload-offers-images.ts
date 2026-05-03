import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const IMAGES_DIR = path.resolve(process.cwd(), "images");
const CLOUDINARY_FOLDER = "offers";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

async function main(): Promise<void> {
  cloudinary.config({ secure: true });

  const entries = await readdir(IMAGES_DIR);
  const imageFiles: string[] = [];

  for (const entry of entries) {
    const filePath = path.join(IMAGES_DIR, entry);
    const fileStats = await stat(filePath);

    if (fileStats.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
      imageFiles.push(entry);
    }
  }

  if (imageFiles.length === 0) {
    console.log(`No image files found in ${IMAGES_DIR}.`);
    return;
  }

  const uploadedAssets: Array<{ file: string; secureUrl: string }> = [];

  for (const fileName of imageFiles) {
    const filePath = path.join(IMAGES_DIR, fileName);
    const publicId = path.parse(fileName).name;

    const result = await cloudinary.uploader.upload(filePath, {
      folder: CLOUDINARY_FOLDER,
      public_id: publicId,
      overwrite: true,
      resource_type: "image",
      use_filename: false,
      unique_filename: false,
    });

    uploadedAssets.push({ file: fileName, secureUrl: result.secure_url });
    console.log(`Uploaded ${fileName} -> ${result.secure_url}`);
  }

  console.log("\nUpload complete.");
  console.log(`Folder: ${CLOUDINARY_FOLDER}`);
  console.log(JSON.stringify(uploadedAssets, null, 2));
}

void main().catch((error: unknown) => {
  console.error("Cloudinary upload failed.");
  console.error(error);
  process.exit(1);
});
