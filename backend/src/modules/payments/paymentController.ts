import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';

export async function createOrder(req: Request, res: Response) {
  try {
    const { amount, currency = 'INR', receipt = 'receipt_1' } = req.body;

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
    });

    const options = {
      amount: Math.round(Number(amount) * 100), // Razorpay requires integer subunits
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      status: 'success',
      data: order,
    });
  } catch (error: any) {
    console.error('Razorpay Order Creation Error:', error);
    // Extract actual razorpay error description if available
    const razorpayError = error?.error?.description || error?.message || 'Failed to create payment order';
    res.status(500).json({ status: 'error', message: razorpayError });
  }
}

export async function verifyPayment(req: Request, res: Response) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      // Payment is verified
      res.status(200).json({ status: 'success', message: 'Payment verified successfully' });
    } else {
      throw new AppError('Invalid payment signature', 400);
    }
  } catch (error: any) {
    console.error('Payment Verification Error:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ status: error.status, message: error.message });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Verification failed' });
  }
}
