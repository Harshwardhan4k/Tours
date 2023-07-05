const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authControler');

const router = express.Router({ mergeParams: true }); // mergeParams: true - to get access to the tourId from the tour router

router.use(authController.protect); // Protect all routes after this middleware

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  );
module.exports = router;
