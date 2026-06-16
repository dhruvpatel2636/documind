import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  url: string;
  publicId: string;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder = "rag-documents",
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
        public_id: `${Date.now()}-${filename}`,
        use_filename: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error || !result)
          return reject(error || new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
}

/**
 * Recover the public_id from a stored Cloudinary delivery URL.
 * Returns null if the URL isn't a recognizable Cloudinary upload URL.
 *
 * Example:
 *   https://res.cloudinary.com/demo/raw/upload/v123/rag-documents/file.pdf
 *   → "rag-documents/file.pdf"
 */
export function publicIdFromUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  return match?.[1] ?? null;
}
