
const User = require("../models/User");

const getMyPayoutDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("name role payoutDetails");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      payoutDetails: user.payoutDetails,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not load payout details",
    });
  }
};

const updateMyPayoutDetails = async (req, res) => {
  try {
    const { provider, phoneNumber, accountHolderName } =
      req.body || {};

    if (!["wave", "aps"].includes(provider)) {
      return res.status(400).json({
        message: "Choose Wave or APS",
      });
    }

    const phone = String(phoneNumber || "")
      .replace(/[\s-]/g, "");

    if (!/^(?:\+220|220)?[0-9]{7}$/.test(phone)) {
      return res.status(400).json({
        message: "Enter a valid 7-digit Gambian phone number",
      });
    }

    const name = String(accountHolderName || "").trim();

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        message: "Enter a valid account holder name",
      });
    }

    const normalizedPhone = phone.slice(-7);

    const user = await User.findOneAndUpdate(
      {
        _id: req.user.id,
        role: { $in: ["farmer", "deliveryAgent"] },
      },
      {
        $set: {
          "payoutDetails.provider": provider,
          "payoutDetails.phoneNumber": normalizedPhone,
          "payoutDetails.accountHolderName": name,
          "payoutDetails.isVerified": false,
          "payoutDetails.updatedAt": new Date(),
        },
      },
      { new: true, runValidators: true }
    ).select("name role payoutDetails");

    if (!user) {
      return res.status(404).json({
        message: "Eligible user not found",
      });
    }

    return res.json({
      message: "Payout details saved. Verification required.",
      payoutDetails: user.payoutDetails,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not update payout details",
    });
  }
};

module.exports = {
  getMyPayoutDetails,
  updateMyPayoutDetails,
};
