// Simple PDF parser using pdf-parse
const pdfParse = require('pdf-parse');

export const parsePDF = async (buffer: Buffer) => {
  console.log(`📄 Parsing PDF buffer (${buffer.length} bytes)`);
  const startTime = Date.now();
  
  try {
    // Try to parse the PDF
    console.log('🔍 Attempting to parse PDF...');
    const data = await pdfParse(buffer);
    const parseTime = Date.now() - startTime;
    console.log(`✅ PDF parsed successfully in ${parseTime}ms (${data.text.length} characters extracted)`);
    return data.text;
  } catch (error: any) {
    const parseTime = Date.now() - startTime;
    console.error(`💥 Error parsing PDF after ${parseTime}ms:`, error.message);
    // Return empty string if parsing fails
    return '';
  }
};

export const extractText = async (data: Buffer) => {
  console.log(`🔍 Extracting text from buffer (${data.length} bytes)`);
  const startTime = Date.now();
  
  // Check if it's a PDF or plain text
  if (isPDF(data)) {
    console.log('📄 Detected PDF file');
    const text = await parsePDF(data);
    const extractTime = Date.now() - startTime;
    console.log(`✅ PDF text extracted in ${extractTime}ms (${text.length} characters)`);
    return text;
  } else {
    console.log('📝 Detected plain text file');
    // Assume it's plain text
    const text = data.toString('utf-8');
    const extractTime = Date.now() - startTime;
    console.log(`✅ Text extracted in ${extractTime}ms (${text.length} characters)`);
    return text;
  }
};

const isPDF = (buffer: Buffer) => {
  // Check if the buffer starts with the PDF signature
  const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && 
         buffer[2] === 0x44 && buffer[3] === 0x46;
  console.log(`🔍 PDF signature check: ${isPdf ? 'PDF detected' : 'Not a PDF'}`);
  return isPdf;
};