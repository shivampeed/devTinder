export const DEFAULT_PHOTO = "/default-avatar.svg";

// Swap a broken profile photo for the built-in avatar; the check stops an endless error loop
export const handleImageError = (e) => {
  if (!e.currentTarget.src.endsWith(DEFAULT_PHOTO)) {
    e.currentTarget.src = DEFAULT_PHOTO;
  }
};
