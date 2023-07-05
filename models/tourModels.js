const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator'); //npm i validator
const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      //schema type options
      type: String,
      required: [true, 'A tour must have a name'], //validator
      unique: true,
      trim: true, //remove all white spaces in the beginning and end of the string
      maxlength: [40, 'A tour name must have less or equal than 40 characters'], //validator
      minlength: [10, 'A tour name must have more or equal than 10 characters'], //validator
      // validate: [validator.isAlpha, 'Tour name must only contain characters'], //validatornl
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'], //validator
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'], //validator
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'], //validator
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, //4.66666, 46.6666, 47, 4.7
      // set: val => Math.round(val * 10) / 10 //4.66666, 46.6666, 47, 4.7
    },
    ratingQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'], //validator
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price', //({VALUE}) is the value that the user input
      },
    },
    summary: {
      type: String,
      trim: true, //remove all white spaces in the beginning and end of the string
      required: [true, 'A tour must have a description'], //validator
    },
    description: {
      type: String,
      trim: true, //remove all white spaces in the beginning and end of the string
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'], //validator
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, //hide this field from the output
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], //[longitude, latitude]
      address: String,
      description: String,
    },
    locations: [
      //embedded documents
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number], //[longitude, latitude]
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array,
    guides: [
      //referencing documents
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true }, //when data is outputted as JSON format (when sending data to the client) then virtual properties will be included
    toObject: { virtuals: true }, //when data is outputted as Object format (when sending data to the client) then virtual properties will be included
  }
);

// tourSchema.index({ price: 1 }); //1 for ascending, -1 for descending
tourSchema.index({ price: 1, ratingsAverage: -1 }); //compound index
tourSchema.index({ slug: 1 }); //single field index for slug field (for searching) (for text search) (for autocomplete)
tourSchema.index({ startLocation: '2dsphere' }); //for geospatial queries

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review', //name of the model
  foreignField: 'tour', //name of the field in the Review model
  localField: '_id', //name of the field in the Tour model
});

//Document middleware: runs before .save() and .create() but not .insertMany()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.post('save', (doc, next) => {
//   // console.log(doc);
//   next();
// });

//Query middleware
// tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  // console.log(docs);
  next();
});

// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); //unshift() adds an element to the beginning of an array
//   console.log(this.pipeline());
//   next();
// });
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
