// In-memory handoff of the just-finished visit's photos from the Camera screen
// to the Summary screen. We don't pass these through router/history state
// because photo blobs are large and shouldn't be serialized into history.
export const visitHandoff = { photos: [] }
