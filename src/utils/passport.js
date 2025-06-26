import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import User from "../models/user.js";
import bcrypt from "bcryptjs";

passport.use(
  new LocalStrategy(
    { usernameField: "cnic", passwordField: "password" },
    async (cnic, password, done) => {
      try {
        const user = await User.findOne({ cnic });
        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid credentials" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize and Deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;
