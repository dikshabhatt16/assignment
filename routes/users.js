const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const path = require("path");
const multer = require('multer')
const nodeGeocoder = require('node-geocoder');
// Load User model
const User = require('../models/User');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// configure multer
var upload = multer({storage: multer.diskStorage({
    destination: function (req, file, callback) 
    { callback(null, './uploads');},
    filename: function (req, file, callback) 
    { 
      callback(null, (file.originalname));
    }
  }),
  fileFilter: function(req, file, callback) {
    var ext = path.extname(file.originalname)
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
      return callback(/*res.end('Only images are allowed')*/ null, false)
    }
    callback(null, true)
  }
});

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => res.render('login'));

// Register Page
router.get('/register', forwardAuthenticated, (req, res) => res.render('register'));

// Register
router.post('/register', upload.single('file'),  async(req, res) => {
  const { name, email, password, password2, phone, mobile, zipCode } = req.body;
  let errors = [];
  let options = {
    provider: 'openstreetmap'
  };
   
  let geoCoder = nodeGeocoder(options);
  var lat = '';
  var long = '';
  var profile = req.file ? req.file.filename : '';

  await geoCoder.geocode(zipCode)
    .then((res)=> {
      if(res){
        lat = res[0].latitude;
        long = res[0].longitude;
      }
    })
    .catch((err)=> {
      lat = 0;
      long = 0;
      errors.push({ msg: 'Please enter a valid zipCode' });
      console.log(err);
    });
  
    var location = {
      type: "Point",
      coordinates: [lat, long]
    }

  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      name,
      email,
      password,
      password2,
      phone,
      mobile,
      zipCode,
      profile
    });
  } else {
    User.findOne({ email: email }).then(user => {
      if (user) {
        errors.push({ msg: 'Email already exists' });
        res.render('index', {
          errors,
          name,
          email,
          password,
          password2,
          phone,
          mobile,
          profile,
          zipCode
        });
      } else {
        const newUser = new User({
          name,
          email,
          password,
          phone,
          mobile,
          zipCode,
          profile,
          location
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => {
                req.flash(
                  'success_msg',
                  'You are now registered and can log in'
                );
                res.redirect('/users/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Edit Profile
router.get('/edit/:id', ensureAuthenticated, (req, res) => {
  User.findById(req.params.id, function (err, user) {
    if (!user) {
      req.flash('error', 'No account found');
      return res.redirect('/dashboard');
    }
    else{
      res.render('profile', {user: user});
    }
  });
});

// Post Edit Profile
router.post('/edit/:id', ensureAuthenticated, (req, res) => {
  let errors = [];

  User.findById(req.params.id, function (err, user) {
    if (err) {
        req.flash('error', 'No account found');
        return res.redirect('/dashboard');
    }

    if (req.body.password != req.body.password2) {
      errors.push({ msg: 'Passwords do not match' });
    }
  
    if (req.body.password.length < 6) {
      errors.push({ msg: 'Password must be at least 6 characters' });
    }

    var email = req.body.email;
    var name = req.body.name;
    var mobile = req.body.mobile;
    var password = req.body.password;
    var phone = req.body.phone;
    var zipCode = req.body.zipCode;

    // no need for else since you are returning early ^
    user.email = email;
    user.name = name;
    user.mobile = mobile;
    user.password = password;
    user.phone = phone;
    user.zipCode = zipCode;

    if(password){
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) throw err;
          user.password = hash;
          user.update(user, function (err) {
            res.redirect('/dashboard');
          });    
        });
      });
    }
    else{
      user.update(user, function (err) {
        res.redirect('/dashboard');
      }); 
    }
  });
});


// Logout
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/users/login');
});

module.exports = router;
