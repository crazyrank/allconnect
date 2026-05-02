const { uploadToCloudinary } = require('../config/cloudinary');

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname, req.file.mimetype);
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    });

    const result = await uploadToCloudinary(req.file.buffer, 'allconnect');

    res.status(200).json({
      url: result.secure_url,
      mediaType: req.file.mimetype.startsWith('image') ? 'image' : 'file',
      publicId: result.public_id,
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    next(err);
  }
};

module.exports = { uploadFile };