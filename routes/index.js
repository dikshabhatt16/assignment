const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// Welcome Page
router.get('/', forwardAuthenticated, (req, res) => res.redirect('/users/register'));

// Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) =>
  User.find( {
    email: { $ne: req.user.email},
    location: {
     $near: {
      $maxDistance: 1000,
      $geometry: {
       type: "Point",
       coordinates: [req.user.location.coordinates[0], req.user.location.coordinates[1]]
      }
     }
    }
   }).limit(5).find((error, result) => {
    if (error) console.log(error);
    res.render('dashboard', {
      user: req.user,
      nearUsers: result
    })
   })
);

module.exports = router;
