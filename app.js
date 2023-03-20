const express = require('express');
const app = express();
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const passport = require('passport');
const { chromium } = require('playwright');
const Product = require('./dbs');
const path =require('path')
const session = require('express-session');
app.set('view engine', 'ejs');
app.use(express.static('public'));




// Passport Config
require('./config/passport')(passport);

// DB Config
const db = require('./config/keys').mongoURI;

// Connect to MongoDB
// mongoose
//   .connect(
//     db,
//     { useNewUrlParser: true ,useUnifiedTopology: true}
//   )
//   .then(() => console.log('MongoDB Connected'))
//   .catch(err => console.log(err));

// EJS
app.use(expressLayouts);


// Express body parser
app.use(express.urlencoded({ extended: true }));

// Express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Routes
app.use('/', require('./routes/index.js'));
app.get('/dashboard',()=>{
  res.render('index')
})
app.use('/users', require('./routes/users.js'));










app.get('/search', async (req, res) => {
  let searchQuery = req.query.searched;
  req.session.variable=searchQuery
  console.log(req.session.variable)
  const websites = [
    {link:'.title--wFj93 a', name: 'daraz', url: `https://www.daraz.com.np/catalog/?q=${searchQuery}`,allselector:'.inner--SODwy',selectname:'.title--wFj93 a',price:".currency--GVKjl",image:".image--WOyuZ " },
    { link:'.product-item-link',name: 'sastodeal', url: `https://www.sastodeal.com/catalogsearch/result/?q=${searchQuery}`,allselector:'.product-item-info',selectname:'.product-item-link',price:".price" ,image:".product-image-wrapper img"},
    { link:'.nameAndDropdown a',name: 'hamrobazaar', url: `https://hamrobazaar.com/search/product?q=${searchQuery}`,allselector:'.inner--SODwy',selectname:'.product-title',price:".regularPrice",image:".linear-img" },

    
    // { name: 'bhatbhatenionline', url: `` },
  ];

  const products = [];

  for (const website of websites) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(website.url, { waitUntil: 'networkidle' });
   
    await page.screenshot({ path: `screenshot.png`, fullPage: true });
   
    const content = await page.content();
    const $ = cheerio.load(content);

    $(website.allselector).each((i, el) => {
      if (i >= 5) return false;

      const name = $(el).find(website.selectname).text().trim();
      const price = parseInt($(el).find(website.price).text().replace(',', '').replace('Rs.','').replace('रू','').replace('रू.', '').trim());
      const rating = 4
      const link= $(el).find(website.link).attr('href')
      const usersearch=req.session.variable
// var count = (rating.match(/10/g) || []).length;
// console.log(count);

      const image = $(el).find(website.image).attr('src');
      
      products.push({ 
        name, 
        price, 
        rating, 
        website: website.name, 
        image,
        link: link,
        searched: req.session.variable
      });
    });

    await browser.close();
  }

  // Sort products by price and rating
  products.sort((a, b) => a.price - b.price || b.rating - a.rating);

  // Filter out products with same name, keeping the cheapest one
  const uniqueProducts = products.reduce((acc, curr) => {
    const existingProduct = acc.find((p) => p.name === curr.name);
    if (!existingProduct) return [...acc, curr];
    if (existingProduct.price > curr.price) {
      return acc.map((p) => (p.name === curr.name ? curr : p));
    }
    return acc;
  }, []);

  // Add products to database
  await Product.insertMany(uniqueProducts);
res.redirect('/')
  console.log('products are uploaded to the database')
});

app.get('/api/v1/cheapest-product',async (req, res,) => {
  // Find the cheapest product with highest rating
//   const cheapestProduct = await Product.find({}, {}, { sort: { price: 1, rating: -1 } }).limit(10);
//   res.json(cheapestProduct);
let searchQuery= req.session.variable
console.log(`this one is comming from /api/v1/cheapest-product  ${searchQuery}`)
if (searchQuery) {
    const cheapestProduct = await Product.find({ searched: { $regex: new RegExp(searchQuery, 'i') } }).sort({ price: 1, rating: -1 }).limit(14);

    res.json(cheapestProduct);
console.log(cheapestProduct)
}else{
    res.send('you have to enter something in searchbox')
}
});
// app.get('/',(req,res)=>{
//     res.render('index.ejs')
// })

app.listen(3000, () => console.log('Server started'));
