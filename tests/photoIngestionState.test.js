import assert from "node:assert/strict";
import { getPhotoPublishState, validatePhoto } from "../src/photoIngestionState.js";

export function registerPhotoIngestionStateTests(register) {
  const pending = { id: 1, title: "Rayuela", author: "Cortázar", status: "pending_store_review" };
  register("photo publication requires explicit selection and valid required metadata", () => {
    assert.equal(getPhotoPublishState([pending], [], 3).canPublish, false);
    assert.equal(getPhotoPublishState([{ ...pending, author: "  " }], [1], 3).canPublish, false);
    assert.equal(getPhotoPublishState([pending], [1], 3).canPublish, true);
  });
  register("photo publication excludes completed drafts and enforces current capacity", () => {
    const rows = [pending, { ...pending, id: 2, status: "published" }, { ...pending, id: 3, status: "omitted_by_store" }];
    assert.deepEqual(getPhotoPublishState(rows, [1, 2, 3], 1).ids, [1]);
    assert.equal(getPhotoPublishState(rows, [1], 0).overLimit, true);
    assert.equal(getPhotoPublishState(rows, [1], 0).canPublish, false);
  });
  register("photo selection rejects oversized files and unsupported image types", () => {
    assert.equal(validatePhoto({ type: "image/jpeg", size: 1024 }), "");
    assert.ok(validatePhoto({ type: "image/svg+xml", size: 1024 }));
    assert.ok(validatePhoto({ type: "image/png", size: 11 * 1024 * 1024 }));
    assert.ok(validatePhoto({ type: "image/png", size: 0 }));
  });
}
