"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.verifyPayment = verifyPayment;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const AppError_1 = require("../../utils/AppError");
// Ensure you have these in your env type definitions or use process.env
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});
async function createOrder(req, res) {
    try {
        const { amount, currency = 'INR', receipt = 'receipt_1' } = req.body;
        const options = {
            amount: amount * 100, // Razorpay works in subunits (e.g. paisa for INR)
            currency,
            receipt,
        };
        const order = await razorpay.orders.create(options);
        res.status(200).json({
            status: 'success',
            data: order,
        });
    }
    catch (error) {
        console.error('Razorpay Order Creation Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create payment order' });
    }
}
async function verifyPayment(req, res) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
        const generatedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');
        if (generatedSignature === razorpay_signature) {
            // Payment is verified
            res.status(200).json({ status: 'success', message: 'Payment verified successfully' });
        }
        else {
            throw new AppError_1.AppError('Invalid payment signature', 400);
        }
    }
    catch (error) {
        console.error('Payment Verification Error:', error);
        if (error instanceof AppError_1.AppError) {
            res.status(error.statusCode).json({ status: error.status, message: error.message });
            return;
        }
        res.status(500).json({ status: 'error', message: 'Verification failed' });
    }
}
//# sourceMappingURL=paymentController.js.map