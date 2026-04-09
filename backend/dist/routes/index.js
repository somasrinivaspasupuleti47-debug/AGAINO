"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiV1Router = void 0;
const express_1 = require("express");
const authRouter_1 = require("../modules/auth/authRouter");
const avatarRouter_1 = require("../modules/auth/avatarRouter");
const listingRouter_1 = require("../modules/listings/listingRouter");
const searchRouter_1 = require("../modules/search/searchRouter");
const paymentRouter_1 = require("../modules/payments/paymentRouter");
exports.apiV1Router = (0, express_1.Router)();
exports.apiV1Router.use('/auth', authRouter_1.authRouter);
exports.apiV1Router.use('/auth', avatarRouter_1.avatarRouter);
exports.apiV1Router.use('/listings', listingRouter_1.listingRouter);
exports.apiV1Router.use('/search', searchRouter_1.searchRouter);
exports.apiV1Router.use('/payments', paymentRouter_1.paymentRouter);
// Module routers will be mounted here as they are implemented
// e.g. apiV1Router.use('/auth', authRouter);
//      apiV1Router.use('/listings', listingsRouter);
//      apiV1Router.use('/search', searchRouter);
//      apiV1Router.use('/conversations', conversationsRouter);
//      apiV1Router.use('/notifications', notificationsRouter);
//      apiV1Router.use('/wishlist', wishlistRouter);
//      apiV1Router.use('/reports', reportsRouter);
//      apiV1Router.use('/admin', adminRouter);
exports.apiV1Router.get('/ping', (_req, res) => {
    res.json({ message: 'AGAINO API v1' });
});
//# sourceMappingURL=index.js.map