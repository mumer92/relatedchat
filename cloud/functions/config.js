const USER_THUMBNAIL_WIDTH = 60; // Square thumbnail width (60x60)
const WORKSPACE_THUMBNAIL_WIDTH = 60; // Square thumbnail width (60x60)
const MESSAGE_THUMBNAIL_WIDTH = 400; // Auto thumbnail height (400xauto)

// If a media file is larger than this value (in megabytes), then no thumbnail will be generated.
const MAX_FILE_SIZE_MB = 300;

// The backend version number. PLEASE DO NOT CHANGE THIS NUMBER.
const BACKEND_VERSION = "1.0.0";

// The backend compatibility. PLEASE DO NOT CHANGE THESE NUMBERS.
const BACKEND_CLIENT_COMPATIBILITY = ["1.0.0"];
const BACKEND_DATABASE_COMPATIBILITY = ["1.0.0"];

module.exports = {
  USER_THUMBNAIL_WIDTH,
  WORKSPACE_THUMBNAIL_WIDTH,
  MESSAGE_THUMBNAIL_WIDTH,
  MAX_FILE_SIZE_MB,
  BACKEND_VERSION,
  BACKEND_CLIENT_COMPATIBILITY,
  BACKEND_DATABASE_COMPATIBILITY,
};
