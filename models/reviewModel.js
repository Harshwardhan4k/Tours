const mongoose = require('mongoose');
const Tour = require('./tourModels');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour', //name of the field in the reviewSchema
  //   select: 'name', //select only the name field from the tour document
  // }).populate({
  //   path: 'user', //name of the field in the reviewSchema
  //   select: 'name photo', //select only the name and photo field from the user document
  // });
  this.populate({
    path: 'user', //name of the field in the reviewSchema
    select: 'name photo', //select only the name and photo field from the user document
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  //this points to the current model
  // console.log(tourId);
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 }, //add 1 for each document
        avgRating: { $avg: '$rating' }, //calculate average rating
      },
    },
  ]);
  console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingQuantity: stats[0].nRating, //stats[0] because stats is an array with only 1 element
      ratingAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingQuantity: 0, //stats[0] because stats is an array with only 1 element
      ratingAverage: 4.5,
    });
  }
};

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); //each combination of tour and user must be unique

reviewSchema.post('save', function () {
  //this points to current review
  //this.constructor points to the current model
  this.constructor.calcAverageRatings(this.tour); //this.tour is the tour id in the current review
});

//findByIdAndUpdate
//findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //this points to the current query
  this.r = await this.findOne(); //this.r is the current review
  console.log(this.r);
  next();
});
reviewSchema.post(/^findOneAnd/, async function () {
  //this.r = await this.findOne(); //this.r is the current review
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
