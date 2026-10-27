const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5050;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "foodlink_demo_secret_change_this";

/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
  "https://food-waste-redistribution-platform-self.vercel.app",
  "https://foodlink.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header
      // such as Postman/server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      // Allow known frontend origins.
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // During deployment/demo, allow other Vercel preview URLs too.
      if (
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      // Allow localhost during development.
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }

      console.log("CORS request from:", origin);

      // Do not block the request completely.
      // This keeps the deployed demo usable even if
      // the exact Vercel URL changes.
      return callback(null, true);
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ],

    credentials: false
  })
);

/*
  Explicitly handle browser preflight requests.
*/
app.options("*", cors());

app.use(express.json());


/* =========================================================
   USER
========================================================= */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: [
        "provider",
        "recipient",
        "volunteer",
        "admin"
      ],
      default: "recipient"
    },

    organizationName: {
      type: String,
      default: ""
    },

    city: {
      type: String,
      default: ""
    },

    location: {
      type: String,
      default: ""
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "users"
  }
);


/* =========================================================
   DONATION
========================================================= */

const donationSchema = new mongoose.Schema(
  {
    foodName: {
      type: String,
      required: true
    },

    category: {
      type: String,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    unit: {
      type: String,
      default: "meals"
    },

    city: {
      type: String,
      required: true
    },

    location: {
      type: String,
      required: true
    },

    expiry: {
      type: Date,
      required: true
    },

    description: {
      type: String,
      default: ""
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    providerEmail: {
      type: String,
      default: ""
    },

    providerName: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: [
        "Posted",
        "Matched",
        "Accepted",
        "Pickup",
        "Delivered",
        "Expired"
      ],
      default: "Posted"
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "donations"
  }
);


/* =========================================================
   FOOD REQUEST
========================================================= */

const requestSchema = new mongoose.Schema(
  {
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donation",
      required: true
    },

    foodName: {
      type: String,
      default: ""
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    requestedByEmail: {
      type: String,
      default: ""
    },

    recipientName: {
      type: String,
      default: ""
    },

    recipientCity: {
      type: String,
      default: ""
    },

    /*
      NGO / recipient delivery destination.
      This MUST NOT be replaced by the provider location.
    */
    deliveryLocation: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Accepted",
        "Rejected",
        "Delivered"
      ],
      default: "Pending"
    },

    matchScore: {
      type: Number,
      default: 95
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "requests"
  }
);


/* =========================================================
   VOLUNTEER TASK
========================================================= */

const taskSchema = new mongoose.Schema(
  {
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donation"
    },

    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodRequest"
    },

    foodName: {
      type: String,
      default: ""
    },

    quantity: {
      type: Number,
      default: 0
    },

    unit: {
      type: String,
      default: ""
    },

    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    volunteerEmail: {
      type: String,
      default: ""
    },

    /*
      Provider's pickup location.
    */
    pickupLocation: {
      type: String,
      default: ""
    },

    /*
      NGO / recipient's delivery location.
    */
    deliveryLocation: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: [
        "Assigned",
        "Accepted",
        "Picked Up",
        "Delivered"
      ],
      default: "Assigned"
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "volunteer_tasks"
  }
);


const User = mongoose.model(
  "User",
  userSchema
);

const Donation = mongoose.model(
  "Donation",
  donationSchema
);

const FoodRequest = mongoose.model(
  "FoodRequest",
  requestSchema
);

const VolunteerTask = mongoose.model(
  "VolunteerTask",
  taskSchema
);


/* =========================================================
   AUTH HELPERS
========================================================= */

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationName:
      user.organizationName || "",
    city:
      user.city || "",
    location:
      user.location || ""
  };
}


function createToken(user) {
  return jwt.sign(
    {
      id: String(user._id),
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}


function auth(req, res, next) {
  try {
    const header =
      req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Login required"
      });
    }

    const token =
      header.substring(7);

    req.user =
      jwt.verify(
        token,
        JWT_SECRET
      );

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired login session"
    });
  }
}


function roles(...allowed) {
  return (req, res, next) => {
    if (
      !allowed.includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission for this action"
      });
    }

    next();
  };
}


/* =========================================================
   HEALTH / TEST
========================================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "FoodLink backend is running."
  });
});


app.get(
  "/health",
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "FoodLink backend is healthy",
      database:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected"
    });
  }
);


app.get(
  "/api/test",
  (req, res) => {
    res.json({
      success: true,
      message:
        "FoodLink backend is working."
    });
  }
);


app.get(
  "/api/health",
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "FoodLink API is healthy",
      database:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected"
    });
  }
);


/* =========================================================
   SIGNUP
========================================================= */

app.post(
  "/api/auth/signup",
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
        organizationName,
        city,
        location
      } = req.body;

      if (
        !name ||
        !email ||
        !password ||
        !role
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email, password and role are required"
        });
      }

      const validRoles = [
        "provider",
        "recipient",
        "volunteer",
        "admin"
      ];

      if (
        !validRoles.includes(role)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid account role"
        });
      }

      if (
        password.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters"
        });
      }

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      const exists =
        await User.findOne({
          email:
            cleanEmail
        });

      if (exists) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email already exists"
        });
      }

      const hashed =
        await bcrypt.hash(
          password,
          10
        );

      const user =
        await User.create({
          name:
            name.trim(),

          email:
            cleanEmail,

          password:
            hashed,

          role,

          organizationName:
            organizationName || "",

          city:
            city || "",

          location:
            location || ""
        });

      res.status(201).json({
        success: true,

        token:
          createToken(user),

        user:
          publicUser(user)
      });

    } catch (error) {
      console.error(
        "Signup error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   LOGIN
========================================================= */

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const email =
        (
          req.body.email || ""
        )
          .trim()
          .toLowerCase();

      const password =
        req.body.password || "";

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Email and password are required"
        });
      }

      const user =
        await User.findOne({
          email
        });

      if (
        !user ||
        !(await bcrypt.compare(
          password,
          user.password
        ))
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password"
        });
      }

      res.json({
        success: true,

        token:
          createToken(user),

        user:
          publicUser(user)
      });

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   CURRENT USER
========================================================= */

app.get(
  "/api/auth/me",
  auth,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User account no longer exists"
        });
      }

      res.json({
        success: true,
        user:
          publicUser(user)
      });

    } catch (error) {
      console.error(
        "Auth me error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   GET DONATIONS
========================================================= */

app.get(
  "/api/donations",
  auth,
  async (req, res) => {
    try {
      const filter = {};

      if (req.query.status) {
        filter.status =
          req.query.status;
      } else {
        filter.status = {
          $in: [
            "Posted",
            "Matched"
          ]
        };
      }

      filter.expiry = {
        $gt:
          new Date()
      };

      const donations =
        await Donation.find(
          filter
        )
          .sort({
            createdAt:
              -1
          });

      res.json({
        success: true,
        count:
          donations.length,
        donations
      });

    } catch (error) {
      console.error(
        "Get donations error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   CREATE DONATION
========================================================= */

app.post(
  "/api/donations",
  auth,
  roles(
    "provider",
    "admin"
  ),
  async (req, res) => {
    try {
      const {
        foodName,
        category,
        quantity,
        unit,
        city,
        location,
        expiry,
        description
      } = req.body;

      if (
        !foodName ||
        !category ||
        !quantity ||
        !city ||
        !location ||
        !expiry
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please complete all required donation fields"
        });
      }

      const expiryDate =
        new Date(expiry);

      if (
        Number.isNaN(
          expiryDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid expiry date"
        });
      }

      if (
        expiryDate <= new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Expiry must be in the future"
        });
      }

      const provider =
        await User.findById(
          req.user.id
        );

      const donation =
        await Donation.create({
          foodName:
            foodName.trim(),

          category,

          quantity:
            Number(quantity),

          unit:
            unit || "meals",

          city:
            city.trim(),

          location:
            location.trim(),

          expiry:
            expiryDate,

          description:
            description || "",

          providerId:
            req.user.id,

          providerEmail:
            req.user.email,

          providerName:
            provider
              ? provider.name
              : ""
        });

      res.status(201).json({
        success: true,

        message:
          "Donation published successfully",

        donation
      });

    } catch (error) {
      console.error(
        "Donation error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   MY DONATIONS
========================================================= */

app.get(
  "/api/donations/mine",
  auth,
  roles(
    "provider",
    "admin"
  ),
  async (req, res) => {
    try {
      const donations =
        await Donation.find({
          providerId:
            req.user.id
        })
          .sort({
            createdAt:
              -1
          });

      res.json({
        success: true,
        donations
      });

    } catch (error) {
      console.error(
        "My donations error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   CREATE FOOD REQUEST
========================================================= */

app.post(
  "/api/requests",
  auth,
  roles(
    "recipient",
    "admin"
  ),
  async (req, res) => {
    try {
      const foodId =
        req.body.foodId ||
        req.body.donationId;

      if (!foodId) {
        return res.status(400).json({
          success: false,
          message:
            "Food donation ID is required"
        });
      }

      const deliveryLocation =
        String(
          req.body.deliveryLocation || ""
        ).trim();

      if (!deliveryLocation) {
        return res.status(400).json({
          success: false,
          message:
            "Delivery location is required. Please enter the NGO / recipient location."
        });
      }

      const donation =
        await Donation.findById(
          foodId
        );

      if (!donation) {
        return res.status(404).json({
          success: false,
          message:
            "Food listing not found"
        });
      }

      if (
        donation.expiry <=
        new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This food donation has expired"
        });
      }

      if (
        ![
          "Posted",
          "Matched"
        ].includes(
          donation.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This food is no longer available"
        });
      }

      const existing =
        await FoodRequest.findOne({
          foodId:
            donation._id,

          requestedBy:
            req.user.id,

          status: {
            $in: [
              "Pending",
              "Accepted"
            ]
          }
        });

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "You have already requested this food"
        });
      }

      const recipient =
        await User.findById(
          req.user.id
        );

      const recipientCity =
        String(
          req.body.recipientCity ||
          (recipient
            ? recipient.city
            : "") ||
          ""
        ).trim();

      const request =
        await FoodRequest.create({
          foodId:
            donation._id,

          foodName:
            donation.foodName,

          requestedBy:
            req.user.id,

          requestedByEmail:
            req.user.email,

          recipientName:
            recipient
              ? recipient.name
              : "",

          recipientCity,

          deliveryLocation,

          matchScore:
            95,

          status:
            "Pending"
        });

      donation.status =
        "Matched";

      await donation.save();

      console.log(
        "FOOD REQUEST CREATED:",
        {
          requestId:
            String(request._id),

          foodId:
            String(donation._id),

          pickupLocation:
            `${donation.location}, ${donation.city}`,

          deliveryLocation,

          recipientCity
        }
      );

      res.status(201).json({
        success: true,

        message:
          "Food request confirmed successfully",

        request
      });

    } catch (error) {
      console.error(
        "Request error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   GET REQUESTS
========================================================= */

app.get(
  "/api/requests",
  auth,
  async (req, res) => {
    try {
      let requests;

      if (
        req.user.role ===
        "provider"
      ) {
        const donations =
          await Donation.find({
            providerId:
              req.user.id
          })
            .select("_id");

        const ids =
          donations.map(
            d => d._id
          );

        requests =
          await FoodRequest.find({
            foodId: {
              $in:
                ids
            }
          })
            .sort({
              createdAt:
                -1
            });

      } else if (
        req.user.role ===
        "admin"
      ) {
        requests =
          await FoodRequest.find()
            .sort({
              createdAt:
                -1
            });

      } else {
        requests =
          await FoodRequest.find({
            requestedBy:
              req.user.id
          })
            .sort({
              createdAt:
                -1
            });
      }

      res.json({
        success: true,
        requests
      });

    } catch (error) {
      console.error(
        "Get requests error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   ACCEPT / REJECT REQUEST
========================================================= */

app.patch(
  "/api/requests/:id/status",
  auth,
  roles(
    "provider",
    "admin"
  ),
  async (req, res) => {
    try {
      const request =
        await FoodRequest.findById(
          req.params.id
        );

      if (!request) {
        return res.status(404).json({
          success: false,
          message:
            "Request not found"
        });
      }

      const donation =
        await Donation.findById(
          request.foodId
        );

      if (!donation) {
        return res.status(404).json({
          success: false,
          message:
            "Donation not found"
        });
      }

      if (
        req.user.role ===
          "provider" &&
        String(
          donation.providerId
        ) !==
          String(
            req.user.id
          )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only manage requests for your own donations"
        });
      }

      const status =
        req.body.status;

      if (
        ![
          "Pending",
          "Accepted",
          "Rejected"
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid request status"
        });
      }

      request.status =
        status;

      await request.save();


      /* =====================================================
         ACCEPT REQUEST
      ===================================================== */

      if (
        status ===
        "Accepted"
      ) {
        donation.status =
          "Accepted";

        await donation.save();


        /*
          IMPORTANT:
          We do NOT require a volunteer to exist.

          The task can be created as unassigned,
          and a volunteer can claim it later.
        */

        const existingTask =
          await VolunteerTask.findOne({
            requestId:
              request._id
          });

        if (!existingTask) {

          const pickupLocation =
            `${donation.location}, ${donation.city}`;

          const deliveryLocation =
            request.deliveryLocation;


          const volunteers =
            await User.find({
              role:
                "volunteer"
            })
              .sort({
                createdAt:
                  1
              });


          let selectedVolunteer =
            null;


          /*
            Prefer a volunteer with no active task.
          */

          for (
            const volunteer
            of volunteers
          ) {
            const activeTasks =
              await VolunteerTask.countDocuments({
                volunteerId:
                  volunteer._id,

                status: {
                  $in: [
                    "Assigned",
                    "Accepted",
                    "Picked Up"
                  ]
                }
              });

            if (
              activeTasks ===
              0
            ) {
              selectedVolunteer =
                volunteer;

              break;
            }
          }


          const newTask =
            await VolunteerTask.create({
              foodId:
                donation._id,

              requestId:
                request._id,

              foodName:
                donation.foodName,

              quantity:
                donation.quantity,

              unit:
                donation.unit,

              volunteerId:
                selectedVolunteer
                  ? selectedVolunteer._id
                  : null,

              volunteerEmail:
                selectedVolunteer
                  ? selectedVolunteer.email
                  : "",

              pickupLocation,

              deliveryLocation,

              status:
                "Assigned"
            });


          console.log(
            "VOLUNTEER TASK CREATED:",
            {
              taskId:
                String(
                  newTask._id
                ),

              food:
                newTask.foodName,

              pickup:
                newTask.pickupLocation,

              delivery:
                newTask.deliveryLocation,

              volunteer:
                newTask.volunteerEmail ||
                "Unassigned"
            }
          );
        }
      }


      /* =====================================================
         REJECT REQUEST
      ===================================================== */

      if (
        status ===
        "Rejected"
      ) {
        donation.status =
          "Posted";

        await donation.save();
      }


      res.json({
        success: true,

        message:
          status === "Accepted"
            ? "Request accepted and delivery task created"
            : "Request updated successfully",

        request
      });

    } catch (error) {
      console.error(
        "Request status error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   GET VOLUNTEER TASKS
========================================================= */

app.get(
  "/api/tasks",
  auth,
  roles(
    "volunteer",
    "admin"
  ),
  async (req, res) => {
    try {

      /*
        ADMIN sees all tasks.
      */

      if (
        req.user.role ===
        "admin"
      ) {
        const tasks =
          await VolunteerTask.find()
            .sort({
              createdAt:
                -1
            });

        return res.json({
          success: true,
          tasks
        });
      }


      /*
        Volunteer sees tasks already
        assigned to them.
      */

      let tasks =
        await VolunteerTask.find({
          volunteerId:
            req.user.id
        })
          .sort({
            createdAt:
              -1
          });


      /*
        If there is no assigned task,
        claim the oldest available task.
      */

      if (
        !tasks.length
      ) {
        const unassignedTask =
          await VolunteerTask.findOne({
            $or: [
              {
                volunteerId:
                  null
              },
              {
                volunteerId: {
                  $exists:
                    false
                }
              }
            ]
          })
            .sort({
              createdAt:
                1
            });

        if (
          unassignedTask
        ) {
          unassignedTask.volunteerId =
            req.user.id;

          unassignedTask.volunteerEmail =
            req.user.email;

          await unassignedTask.save();

          tasks = [
            unassignedTask
          ];

          console.log(
            `Task ${unassignedTask._id} automatically assigned to ${req.user.email}`
          );
        }
      }


      res.json({
        success: true,
        tasks
      });

    } catch (error) {
      console.error(
        "Get tasks error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   MANUAL CLAIM TASK
========================================================= */

app.post(
  "/api/tasks/claim",
  auth,
  roles(
    "volunteer"
  ),
  async (req, res) => {
    try {

      const existing =
        await VolunteerTask.findOne({
          volunteerId:
            req.user.id,

          status: {
            $in: [
              "Assigned",
              "Accepted",
              "Picked Up"
            ]
          }
        });

      if (
        existing
      ) {
        return res.json({
          success: true,

          message:
            "You already have an active task",

          task:
            existing
        });
      }


      const task =
        await VolunteerTask.findOne({
          $or: [
            {
              volunteerId:
                null
            },
            {
              volunteerId: {
                $exists:
                  false
              }
            }
          ]
        })
          .sort({
            createdAt:
              1
          });


      if (!task) {
        return res.status(404).json({
          success: false,
          message:
            "No unassigned task is available"
        });
      }


      task.volunteerId =
        req.user.id;

      task.volunteerEmail =
        req.user.email;

      await task.save();


      res.json({
        success: true,

        message:
          "Task assigned successfully",

        task
      });

    } catch (error) {
      console.error(
        "Claim task error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   UPDATE VOLUNTEER TASK
========================================================= */

async function updateTaskStatus(
  req,
  res
) {
  try {

    const task =
      await VolunteerTask.findById(
        req.params.id
      );


    if (!task) {
      return res.status(404).json({
        success: false,
        message:
          "Task not found"
      });
    }


    /*
      Volunteer can only update
      their own task.
    */

    if (
      req.user.role !==
        "admin" &&
      task.volunteerId &&
      String(
        task.volunteerId
      ) !==
        String(
          req.user.id
        )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This task is not assigned to you"
      });
    }


    /*
      Automatically assign an
      unassigned task.
    */

    if (
      req.user.role ===
        "volunteer" &&
      !task.volunteerId
    ) {
      task.volunteerId =
        req.user.id;

      task.volunteerEmail =
        req.user.email;
    }


    const status =
      req.body.status;


    const allowedStatuses = [
      "Assigned",
      "Accepted",
      "Picked Up",
      "Delivered"
    ];


    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid task status"
      });
    }


    /*
      Volunteers must follow
      the normal workflow.
    */

    const currentStatus =
      task.status;


    const validNextStatuses = {
      Assigned: [
        "Accepted"
      ],

      Accepted: [
        "Picked Up"
      ],

      "Picked Up": [
        "Delivered"
      ],

      Delivered: []
    };


    if (
      req.user.role !==
      "admin"
    ) {
      const allowed =
        validNextStatuses[
          currentStatus
        ] || [];

      if (
        !allowed.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid status change: ${currentStatus} → ${status}`
        });
      }
    }


    task.status =
      status;

    await task.save();


    /*
      ACCEPTED
    */

    if (
      status ===
      "Accepted"
    ) {
      if (
        task.foodId
      ) {
        await Donation.findByIdAndUpdate(
          task.foodId,
          {
            status:
              "Accepted"
          }
        );
      }
    }


    /*
      PICKED UP
    */

    if (
      status ===
      "Picked Up"
    ) {
      if (
        task.foodId
      ) {
        await Donation.findByIdAndUpdate(
          task.foodId,
          {
            status:
              "Pickup"
          }
        );
      }
    }


    /*
      DELIVERED
    */

    if (
      status ===
      "Delivered"
    ) {

      if (
        task.foodId
      ) {
        await Donation.findByIdAndUpdate(
          task.foodId,
          {
            status:
              "Delivered"
          }
        );
      }


      if (
        task.requestId
      ) {
        await FoodRequest.findByIdAndUpdate(
          task.requestId,
          {
            status:
              "Delivered"
          }
        );
      }
    }


    console.log(
      "TASK UPDATED:",
      {
        taskId:
          String(
            task._id
          ),

        status:
          task.status,

        pickup:
          task.pickupLocation,

        delivery:
          task.deliveryLocation,

        volunteer:
          task.volunteerEmail
      }
    );


    res.json({
      success: true,

      message:
        `Delivery updated to ${status}`,

      task
    });

  } catch (error) {
    console.error(
      "Task update error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message
    });
  }
}


app.patch(
  "/api/tasks/:id",
  auth,
  roles(
    "volunteer",
    "admin"
  ),
  updateTaskStatus
);


app.patch(
  "/api/tasks/:id/status",
  auth,
  roles(
    "volunteer",
    "admin"
  ),
  updateTaskStatus
);


/* =========================================================
   ACTIVITY
========================================================= */

async function getActivity(
  req,
  res
) {
  try {

    const donations =
      await Donation.find({
        providerId:
          req.user.id
      })
        .sort({
          createdAt:
            -1
        });


    const requests =
      await FoodRequest.find({
        requestedBy:
          req.user.id
      })
        .sort({
          createdAt:
            -1
        });


    const tasks =
      req.user.role ===
      "volunteer"
        ? await VolunteerTask.find({
            volunteerId:
              req.user.id
          })
            .sort({
              createdAt:
                -1
            })
        : [];


    res.json({
      success: true,
      donations,
      requests,
      tasks
    });

  } catch (error) {
    console.error(
      "Activity error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message
    });
  }
}


app.get(
  "/api/my-activity",
  auth,
  getActivity
);


app.get(
  "/api/activity",
  auth,
  getActivity
);


/* =========================================================
   GLOBAL STATS
========================================================= */

app.get(
  "/api/stats",
  auth,
  async (req, res) => {
    try {

      const [
        donations,
        requests,
        deliveries,
        users
      ] = await Promise.all([
        Donation.countDocuments(),

        FoodRequest.countDocuments(),

        VolunteerTask.countDocuments({
          status:
            "Delivered"
        }),

        User.countDocuments()
      ]);


      res.json({
        donations,
        requests,
        deliveries,
        users
      });

    } catch (error) {
      console.error(
        "Stats error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   ADMIN SUMMARY
========================================================= */

app.get(
  "/api/admin/summary",
  auth,
  roles(
    "admin"
  ),
  async (req, res) => {
    try {

      const [
        users,
        providers,
        recipients,
        volunteers,
        donations,
        requests,
        tasks,
        delivered
      ] = await Promise.all([
        User.countDocuments(),

        User.countDocuments({
          role:
            "provider"
        }),

        User.countDocuments({
          role:
            "recipient"
        }),

        User.countDocuments({
          role:
            "volunteer"
        }),

        Donation.countDocuments(),

        FoodRequest.countDocuments(),

        VolunteerTask.countDocuments(),

        VolunteerTask.countDocuments({
          status:
            "Delivered"
        })
      ]);


      res.json({
        Users:
          users,

        Providers:
          providers,

        Recipients:
          recipients,

        Volunteers:
          volunteers,

        Donations:
          donations,

        Requests:
          requests,

        Tasks:
          tasks,

        Delivered:
          delivered
      });

    } catch (error) {
      console.error(
        "Admin summary error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message
      });
    }
  }
);


/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Internal server error"
    });
  }
);


/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API route not found"
    });
  }
);


/* =========================================================
   START SERVER
========================================================= */

async function start() {
  try {

    if (
      !process.env.MONGO_URI
    ) {
      throw new Error(
        "MONGO_URI is missing from backend/.env"
      );
    }


    await mongoose.connect(
      process.env.MONGO_URI
    );


    console.log(
      "MongoDB connected successfully"
    );


    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `FoodLink backend running on port ${PORT}`
        );
      }
    );

  } catch (error) {

    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
}


start();
