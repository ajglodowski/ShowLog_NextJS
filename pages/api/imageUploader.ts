import formidable from 'formidable';
import type { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { accessTokenFor } from '@/app/utils/auth/accessToken';
import { putImmutableJpeg, R2_PROFILE_PICS_BUCKET, R2_SHOW_IMAGES_BUCKET } from '@/app/utils/r2';

export const config = {
  api: {
    bodyParser: false, // Disable the default body parser as we're using formidable
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // matches the client-side limit
const PROFILE_PIC_MAX_DIMENSION = 1024;

type UploadType = 'show' | 'profile';

async function uploadShowImage(imageId: string, filepath: string): Promise<void> {
  // .rotate() applies EXIF orientation before it is stripped
  const source = sharp(filepath).rotate();
  const [original, tile, detail] = await Promise.all([
    source.clone().jpeg({ quality: 90 }).toBuffer(),
    source.clone().resize(200, 200, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer(),
    source.clone().resize(640, 640, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer(),
  ]);
  // Must match the key layout in app/utils/imageUrls.ts and the iOS app's ImageHost
  await Promise.all([
    putImmutableJpeg(R2_SHOW_IMAGES_BUCKET, `shows/${imageId}.jpeg`, original),
    putImmutableJpeg(R2_SHOW_IMAGES_BUCKET, `shows/${imageId}_200x200.jpeg`, tile),
    putImmutableJpeg(R2_SHOW_IMAGES_BUCKET, `shows/${imageId}_640x640.jpeg`, detail),
  ]);
}

async function uploadProfilePic(imageId: string, filepath: string): Promise<void> {
  const image = await sharp(filepath)
    .rotate()
    .resize(PROFILE_PIC_MAX_DIMENSION, PROFILE_PIC_MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  await putImmutableJpeg(R2_PROFILE_PICS_BUCKET, `${imageId}.jpeg`, image);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Signed in = the Better Auth session cookie still mints an API access token
    const token = await accessTokenFor(req.headers.cookie ?? '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const form = formidable({ multiples: false, maxFileSize: MAX_FILE_SIZE });

    // Parse the form data
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const type = fields.type?.[0] as UploadType | undefined;
    if (type !== 'show' && type !== 'profile') {
      return res.status(400).json({ error: 'type must be "show" or "profile"' });
    }

    // Check if an image was uploaded
    const imageFile = files.image?.[0];
    if (!imageFile) {
      return res.status(400).json({ error: 'No image found in request' });
    }

    // The UUID is what gets stored in show.pictureUrl / user.profilePhotoURL
    const imageId = randomUUID();
    if (type === 'show') await uploadShowImage(imageId, imageFile.filepath);
    else await uploadProfilePic(imageId, imageFile.filepath);

    res.status(200).json({
      success: true,
      imageId: imageId,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
}
