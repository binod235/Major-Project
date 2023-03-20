const mongoose = require('mongoose');

// Connect to MongoDB database
mongoose.connect('mongodb://localhost:27017/products', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // optional timeout for connection
    // use autoIndex instead of useCreateIndex/createIndexes
    autoIndex: true,
  
});

// Create product schema
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  rating: Number,
  website: String,
  image: String,
  link: String,
  searched: {
    type: String,
    required: true
  }
});

// Create product model
const Product = mongoose.model('Product', productSchema);

// Export the model
module.exports = Product;