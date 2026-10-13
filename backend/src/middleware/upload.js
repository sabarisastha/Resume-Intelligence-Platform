import multer from 'multer';

// Use memory storage so we don't have to clean up temp files.
// The file is parsed immediately in the controller and discarded.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const supported = (file.mimetype === 'application/pdf' && /\.pdf$/i.test(file.originalname))
    || (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && /\.docx$/i.test(file.originalname));
  if (supported) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only PDF and DOCX are allowed.');
    error.status = 400;
    cb(error, false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
