import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function chooseFile(selectedFile) {
    if (!selectedFile) return;

    setError("");
    setUploadedUrl("");
    setProgress(0);

    if (!ALLOWED.includes(selectedFile.type)) {
      setFile(null);
      setPreview(null);
      setError("Only image files are allowed (JPEG, PNG, WebP, GIF)");
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      setFile(null);
      setPreview(null);
      setError("File is too large (max 5MB)");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  function handleFileChange(event) {
    chooseFile(event.target.files[0]);
    event.target.value = "";
  }

  async function upload() {
    if (!file || isUploading) return;

    const formData = new FormData();
    formData.append("avatar", file);

    setError("");
    setUploadedUrl("");
    setProgress(0);
    setIsUploading(true);

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(
              Math.min(100, Math.round((event.loaded * 100) / event.total)),
            );
          }
        },
      });

      setUploadedUrl(response.data.url);
      setProgress(100);
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error ||
          uploadError.message ||
          "Upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={isDragging ? "drop-zone dragging" : "drop-zone"}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Choose or drop an avatar image"
      >
        <p>{isDragging ? "Drop to upload" : "Drag an image here, or click to choose"}</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          hidden
          onClick={(event) => event.stopPropagation()}
          onChange={handleFileChange}
        />
      </div>

      {preview && <img src={preview} alt="Avatar preview" className="preview" />}

      {error && <p className="error" role="alert">{error}</p>}

      <button onClick={upload} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {(isUploading || progress > 0) && (
        <>
          <div
            className="bar"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}%</p>
        </>
      )}

      {uploadedUrl && <p role="status">Upload complete: {uploadedUrl}</p>}
    </div>
  );
}
