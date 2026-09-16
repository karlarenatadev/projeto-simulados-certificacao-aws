import { Router } from "express";
import { requireAuth } from "../middleware/requireRole.js";
import {
  claimLocalLink,
  completeLocalLink,
  getLocalLink,
} from "../../database/localLinks.js";

const router = Router();
router.use(requireAuth);

function bodyKeys(req, allowed) {
  if (
    !req.body ||
    Object.keys(req.body).some((key) => !allowed.includes(key))
  ) {
    throw Object.assign(new Error("invalid_local_link_payload"), {
      statusCode: 400,
    });
  }
}

router.post("/claim", async (req, res, next) => {
  try {
    bodyKeys(req, ["localIdentityId"]);
    res.json({
      success: true,
      data: await claimLocalLink(req.user.id, req.body.localIdentityId),
    });
  } catch (error) {
    next(error);
  }
});
router.get("/:localIdentityId", async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await getLocalLink(req.user.id, req.params.localIdentityId),
    });
  } catch (error) {
    next(error);
  }
});
router.post("/:localIdentityId/complete", async (req, res, next) => {
  try {
    bodyKeys(req, ["receipts"]);
    res.json({
      success: true,
      data: await completeLocalLink(
        req.user.id,
        req.params.localIdentityId,
        req.body.receipts,
      ),
    });
  } catch (error) {
    next(error);
  }
});
export default router;
