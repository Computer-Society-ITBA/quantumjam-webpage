import {FieldValue} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

import {db} from "./admin";
import {collections} from "./lib/collections";

// Tokens are opaque hashes minted by scripts/campaign. Only the local
// campaign data can map one back to a person, so no email is stored here.
const TOKEN_RE = /^[a-f0-9]{32}$/;
const EVENT_TYPES = new Set(["open", "click"]);

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

/**
 * Records that a campaign email was opened (tracking pixel) or that its link
 * was followed (the site loads this same URL as an image). Always answers
 * with the pixel, so a failed write never shows up as a broken image.
 */
export const campaignEvent = onRequest(
  {region: "us-central1", maxInstances: 5},
  async (req, res) => {
    const token = String(req.query.t ?? "");
    const type = String(req.query.e ?? "");

    if (TOKEN_RE.test(token) && EVENT_TYPES.has(type)) {
      try {
        await db
          .collection(collections.campaignEvents)
          .doc(`${type}_${token}`)
          .set(
            {
              token,
              type,
              count: FieldValue.increment(1),
              lastAt: FieldValue.serverTimestamp(),
            },
            {merge: true},
          );
      } catch (err) {
        logger.error("Failed to record campaign event", {type, err});
      }
    }

    res.set("Cache-Control", "private, no-store");
    res.type("image/gif").send(PIXEL);
  },
);
