import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import { register } from "./controllers/auth.js";
import { createPost } from "./controllers/posts.js";
import { verifyToken } from "./middleware/auth.js";
import {v2 as cloudinary} from 'cloudinary';
import bcrypt from "bcrypt";
import User from "./models/User.js";
import Post from "./models/Post.js";
import { users, posts } from "./data/index.js";

/* CONFIGURATIONS */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
// app.use(cors());
app.use(cors({
  origin:["https://socio-app-frontend-3kkoyzl4o-abhiram12072003.vercel.app"],
  method:["POST","GET","PATCH","DELETE"],
  credentials:true
}));
app.use("/assets", express.static(path.join(__dirname, "public/assets")));
          
cloudinary.config({ 
  cloud_name: 'dvkjjvn6t', 
  api_key: '282828571114877', 
  api_secret: 'P3cz_eO7YKaErjwf18TSspG30rg'
   
});

async function handleUserImageUpload(file) {
  const res = await cloudinary.uploader.upload(file, {
    resource_type: "auto",
    folder:'userPictures'
  });
  return res;
}

async function handlePostImageUpload(file) {
  const res = await cloudinary.uploader.upload(file, {
    resource_type: "auto",
    folder:'postPictures'
  });
  return res;
}

const storage = new multer.memoryStorage();
const upload = multer({
  storage,
});

/* FILE STORAGE */
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "public/assets");
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   },
// });
// const upload = multer({ storage });

/* ROUTES WITH FILES */
/* ROUTES WITH FILES */
app.get('/',(req,res)=>{
  res.json("HI");
})
app.post("/auth/register", upload.single("picture"), async(req,res)=>{
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      picturePath,
      friends,
      location,
      occupation,
      picture
    } = req.body;
    console.log(req.file);
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    const cldRes = await handleUserImageUpload(dataURI);
    console.log("cld",cldRes['url']);
    console.log("picture",picturePath);
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: passwordHash,
      picturePath:cldRes['url'],
      friends,
      location,
      occupation,
      viewedProfile: Math.floor(Math.random() * 10000),
      impressions: Math.floor(Math.random() * 10000),
    });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/posts", verifyToken, upload.single("picture"), async (req, res) => {
  try {
    const { userId, description, picturePath } = req.body;
    const user = await User.findById(userId);
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    const cldRes = await handlePostImageUpload(dataURI);
    const newPost = new Post({
      userId,
      firstName: user.firstName,
      lastName: user.lastName,
      location: user.location,
      description,
      userPicturePath: user.picturePath,
      picturePath:cldRes['url'],
      likes: {},
      comments: [],
    });
    await newPost.save();

    const post = await Post.find();
    res.status(201).json(post);
  } catch (err) {
    res.status(409).json({ message: err.message });
  }
});

/* ROUTES */
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);

/* MONGOOSE SETUP */
const PORT = 3001; 
mongoose
  .connect("mongodb+srv://abhiram:abhiram@cluster0.zgy92ci.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/SocioApp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => console.log(`Server Port: ${PORT}`));

    /* ADD DATA ONE TIME */
    // User.insertMany(users);
    // Post.insertMany(posts);
  })
  .catch((error) => console.log(`${error} did not connect`));
