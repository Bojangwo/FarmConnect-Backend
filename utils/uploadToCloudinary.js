const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "farmconnect/products",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result?.secure_url) {
          return reject(new Error("Cloudinary did not return an image URL"));
        }

        resolve(result.secure_url);
      },
    );

    stream.end(file.buffer);
  });
};

const uploadProductImages = async (files = []) => {
  const urls = [];

  for (const file of files) {
    urls.push(await uploadToCloudinary(file));
  }

  return urls;
};

module.exports = { uploadProductImages };
