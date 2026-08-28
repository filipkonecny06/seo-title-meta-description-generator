const bcrypt = require("bcrypt");
const { loginSchema, registerSchema } = require("../validation/schemas");

const INVALID_PASSWORD_HASH =
  "$2b$12$jbQxnq8l5trJLrlr4HGWbuf/tZx1nxIiVSxG6vNZj9bIm0LT/0pV6";

const regenerateSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });

const saveSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });

const destroySession = (req) =>
  new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });

class AuthController {
  constructor({ User, sessionCookieName }) {
    this.User = User;
    this.sessionCookieName = sessionCookieName;
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
  }

  setFlash(req, type, message) {
    req.session.flash = { type, message };
  }

  async establishSession(req, user, message) {
    await regenerateSession(req);
    req.session.userId = user.id;
    req.session.user = { id: user.id, name: user.name, email: user.email };
    this.setFlash(req, "success", message);
    await saveSession(req);
  }

  async register(req, res, next) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      this.setFlash(
        req,
        "warning",
        "Use a valid name, email, and password (at least 10 characters, at most 72 UTF-8 bytes).",
      );
      return res.redirect("/register");
    }

    try {
      const { name, email, password } = parsed.data;
      const exists = await this.User.findOne({ where: { email } });
      if (exists) {
        this.setFlash(
          req,
          "warning",
          "An account with that email already exists.",
        );
        return res.redirect("/register");
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await this.User.create({ name, email, passwordHash });
      await this.establishSession(
        req,
        user,
        "Account created. You are now signed in.",
      );
      return res.redirect("/generator");
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        this.setFlash(
          req,
          "warning",
          "An account with that email already exists.",
        );
        return res.redirect("/register");
      }
      return next(error);
    }
  }

  async login(req, res, next) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      this.setFlash(req, "warning", "Invalid email or password.");
      return res.redirect("/login");
    }

    try {
      const user = await this.User.scope("withPassword").findOne({
        where: { email: parsed.data.email },
      });
      const valid = user
        ? await user.validatePassword(parsed.data.password)
        : await bcrypt.compare(parsed.data.password, INVALID_PASSWORD_HASH);
      if (!valid) {
        this.setFlash(req, "warning", "Invalid email or password.");
        return res.redirect("/login");
      }

      await this.establishSession(req, user, `Welcome back, ${user.name}.`);
      return res.redirect("/generator");
    } catch (error) {
      return next(error);
    }
  }

  async logout(req, res, next) {
    try {
      await destroySession(req);
      res.clearCookie(this.sessionCookieName, {
        httpOnly: true,
        sameSite: "lax",
      });
      return res.redirect("/");
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = { AuthController, regenerateSession };
