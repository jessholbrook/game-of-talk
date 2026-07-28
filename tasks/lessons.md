# Lessons

- Always read the full commit SHA with `git rev-parse HEAD` immediately before
  saving a hosted version. Never expand a short commit hash by assumption.
- Inspect captured screenshot MIME types before linking them in documentation.
  Browser screenshot APIs may return JPEG bytes even when the requested
  filename uses a PNG extension.
