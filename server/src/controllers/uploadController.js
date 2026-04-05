const { uploadToCloudinary } = require('../config/cloudinary');

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const result = await uploadToCloudinary(req.file.buffer, 'allconnect');
    res.status(200).json({
      url: result.secure_url,
      mediaType: req.file.mimetype.startsWith('image') ? 'image' : 'file',
      publicId: result.public_id,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadFile };