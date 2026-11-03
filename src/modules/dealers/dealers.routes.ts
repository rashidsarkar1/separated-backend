import express from "express";
import mongoose from "mongoose";
import { Dealer } from "./dealers.model";
import sendResponse from "../../utils/sendResponse";
import { localStore } from "../common/localStore";
import { getDateRangeStart } from "../../utils/dateRange";

const router = express.Router();

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildDealerFilter(range: string, search: string) {
  const rangeStart = getDateRangeStart(range);
  const query: Record<string, any> = {};
  if (rangeStart) query.createdAt = { $gte: rangeStart };

  const searchStr = search.trim();
  if (searchStr) {
    const rx = new RegExp(escapeRegex(searchStr), "i");
    query.$or = [
      { name: rx },
      { address: rx },
      { "contactInfo.phone": rx },
      { "contactInfo.email": rx },
    ];
  }

  return { query, rangeStart, searchStr };
}

function matchesDealerSearch(dealer: any, searchStr: string) {
  if (!searchStr) return true;
  const term = searchStr.toLowerCase();
  return [
    dealer.name,
    dealer.address,
    dealer.contactInfo?.phone,
    dealer.contactInfo?.email,
    dealer.phone,
    dealer.email,
  ].some((value) => String(value || "").toLowerCase().includes(term));
}

router.get("/", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "10",
      range = "all",
      search = "",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(10, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;
    const sortField = sortBy === "name" ? "name" : "createdAt";
    const sortDirection = order === "asc" ? 1 : -1;
    const { query, rangeStart, searchStr } = buildDealerFilter(
      String(range),
      String(search || ""),
    );

    if (mongoose.connection.readyState === 1) {
      try {
        const [dealers, total] = await Promise.all([
          Dealer.find(query)
            .sort({ [sortField]: sortDirection, _id: 1 })
            .skip(skip)
            .limit(limitNum),
          Dealer.countDocuments(query),
        ]);

        return sendResponse(res, {
          statusCode: 200,
          success: true,
          message: "Dealers fetched successfully",
          data: dealers,
          meta: {
            page: pageNum,
            limit: limitNum,
            total,
          },
        });
      } catch (err) {
        console.warn(
          "DB fetch dealers failed, falling back to localStore:",
          err,
        );
      }
    }

    const filteredDealers = localStore.dealers.filter((dealer) => {
      const matchesRange =
        !rangeStart || new Date(dealer.createdAt) >= rangeStart;
      return matchesRange && matchesDealerSearch(dealer, searchStr);
    });
    filteredDealers.sort((left: any, right: any) => {
      const comparison = sortField === "name"
        ? String(left.name || "").localeCompare(String(right.name || ""))
        : new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return comparison * sortDirection;
    });
    const total = filteredDealers.length;
    const paginated = filteredDealers.slice(skip, skip + limitNum);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Dealers fetched successfully",
      data: paginated,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let dealer: any;

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      try {
        dealer = await Dealer.findById(id);
      } catch (err) {
        console.warn("DB get dealer failed, falling back to localStore:", err);
      }
    }

    if (!dealer) {
      dealer = localStore.dealers.find(
        (entry) => String(entry._id || (entry as any).id) === String(id),
      );
    }

    if (!dealer) {
      return res.status(404).json({ success: false, message: "Dealer not found" });
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Dealer fetched successfully",
      data: dealer,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    let dealer;
    if (mongoose.connection.readyState === 1) {
      try {
        dealer = await Dealer.create(req.body);
      } catch (err) {
        console.warn(
          "DB create dealer failed, falling back to localStore:",
          err,
        );
      }
    }

    if (!dealer) {
      dealer = {
        _id: `d_${Date.now()}`,
        name: req.body.name,
        address: req.body.address,
        contactInfo: req.body.contactInfo || {
          phone: req.body.phone,
          email: req.body.email,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStore.dealers.unshift(dealer);
    }

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Dealer created successfully",
      data: dealer,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const update = {
      name: String(req.body.name || "").trim(),
      address: String(req.body.address || "").trim(),
      contactInfo: {
        email: String(req.body.contactInfo?.email || "").trim(),
        phone: String(req.body.contactInfo?.phone || "").trim(),
      },
    };
    if (!update.name) {
      return res.status(400).json({
        success: false,
        message: "Dealer name is required",
      });
    }

    let dealer: any;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      dealer = await Dealer.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });
    } else {
      const existing = localStore.dealers.find(
        (entry) => String(entry._id || (entry as any).id) === id,
      );
      if (existing) {
        dealer = Object.assign(existing, update, {
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (!dealer) {
      return res.status(404).json({ success: false, message: "Dealer not found" });
    }

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Dealer updated successfully",
      data: dealer,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export const DealerRoutes = router;
