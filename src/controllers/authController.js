const bcrypt = require('bcrypt');
const { User } = require('../models');

const setFlash = (req, type, message) => {
  req.session.flash = { type, message };
};

const register = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || password.length < 8) {
      setFlash(req, 'warning', 'Use a valid name, email, and password (min 8 chars).');
      return res.redirect('/register');
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      setFlash(req, 'warning', 'An account with that email already exists.');
      return res.redirect('/register');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    setFlash(req, 'success', 'Account created. You are now signed in.');
    return res.redirect('/generator');
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ where: { email } });
    if (!user) {
      setFlash(req, 'warning', 'Invalid email or password.');
      return res.redirect('/login');
    }

    const valid = await user.validatePassword(password);
    if (!valid) {
      setFlash(req, 'warning', 'Invalid email or password.');
      return res.redirect('/login');
    }

    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    setFlash(req, 'success', `Welcome back, ${user.name}.`);
    return res.redirect('/generator');
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      req.session.destroy((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    res.clearCookie('seo.sid');
    return res.redirect('/');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
};
