import { Router } from 'express';
import { authRouter } from '../modules/auth/authRouter';
import { avatarRouter } from '../modules/auth/avatarRouter';
import { listingRouter } from '../modules/listings/listingRouter';
import { searchRouter } from '../modules/search/searchRouter';
import { paymentRouter } from '../modules/payments/paymentRouter';

export const apiV1Router = Router();

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/auth', avatarRouter);
apiV1Router.use('/listings', listingRouter);
apiV1Router.use('/search', searchRouter);
apiV1Router.use('/payments', paymentRouter);

// Module routers will be mounted here as they are implemented
// e.g. apiV1Router.use('/auth', authRouter);
//      apiV1Router.use('/listings', listingsRouter);
//      apiV1Router.use('/search', searchRouter);
//      apiV1Router.use('/conversations', conversationsRouter);
//      apiV1Router.use('/notifications', notificationsRouter);
//      apiV1Router.use('/wishlist', wishlistRouter);
//      apiV1Router.use('/reports', reportsRouter);
//      apiV1Router.use('/admin', adminRouter);

apiV1Router.get('/ping', (_req, res) => {
  res.json({ message: 'AGAINO API v1' });
});
