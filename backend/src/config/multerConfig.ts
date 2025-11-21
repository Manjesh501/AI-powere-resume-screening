import multer from 'multer';

// Configure multer for file uploads with better error handling
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased from 5MB)
    files: 2, // Only allow 2 files
    fields: 10 // Limit number of fields
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF and TXT files
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'text/plain' || 
        file.originalname.toLowerCase().endsWith('.pdf') || 
        file.originalname.toLowerCase().endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed') as any, false);
    }
  }
});

export default upload;