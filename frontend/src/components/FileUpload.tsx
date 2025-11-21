import React, { useState, useRef } from 'react';
import './FileUpload.css';

interface FileUploadProps {
  label: string;
  onFileSelect: (file: File) => void;
}

const FileUpload = ({ label, onFileSelect }: FileUploadProps) => {
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload">
      <label>{label}</label>
      <div className="upload-area">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt"
          style={{ display: 'none' }}
        />
        <button type="button" onClick={handleBrowseClick}>
          Choose File
        </button>
        <span className="file-name">{fileName || 'No file chosen'}</span>
      </div>
    </div>
  );
};

export default FileUpload;