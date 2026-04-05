const cloudinary = require('cloudinary').v2;
require('dotenv').config();   // or however you're loading .env (you mentioned dotenvx)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true   // recommended
});

module.exports = cloudinary;