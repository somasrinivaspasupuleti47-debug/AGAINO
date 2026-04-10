"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRouter = void 0;
const express_1 = require("express");
const paymentController_1 = require("./paymentController");
exports.paymentRouter = (0, express_1.Router)();
exports.paymentRouter.post('/create-order', paymentController_1.createOrder);
exports.paymentRouter.post('/verify', paymentController_1.verifyPayment);
//# sourceMappingURL=paymentRouter.js.map