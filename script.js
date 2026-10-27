const API = "https://foodlink-backend-ekmj.onrender.com/api";


/* =========================================================
   AUTH / API HELPERS
========================================================= */

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function headers() {
  const h = {
    "Content-Type": "application/json"
  };

  const token = getToken();

  if (token) {
    h.Authorization = `Bearer ${token}`;
  }

  return h;
}

async function api(path, options = {}) {

  const res = await fetch(API + path, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({
    message: "Invalid server response"
  }));

  if (!res.ok) {
    throw new Error(
      data.message ||
      data.error ||
      "Request failed"
    );
  }

  return data;
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

  const toast =
    document.getElementById("toast");

  const msg =
    document.getElementById("toastMessage");

  if (!toast || !msg) {
    alert(message);
    return;
  }

  msg.textContent = message;

  toast.classList.add("show");

  clearTimeout(window.toastTimer);

  window.toastTimer =
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
}


/* =========================================================
   LOGOUT / NAVIGATION
========================================================= */

function logout() {

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("userEmail");

  window.location.href = "index.html";
}


function goToSearch() {
  window.location.href = "search-food.html";
}


/* =========================================================
   HELPERS
========================================================= */

function esc(value) {

  return String(value ?? "")
    .replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
}


function dateFormat(value) {

  if (!value) return "-";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "-";
  }

  return d.toLocaleString();
}


function roleName(role) {

  const roles = {

    provider: "FOOD PROVIDER",

    recipient: "NGO / RECIPIENT",

    volunteer: "VOLUNTEER",

    admin: "ADMIN"
  };

  return roles[role] || "USER";
}


/* =========================================================
   AUTH
========================================================= */

let signupMode = false;


function setupAuth() {

  const form =
    document.getElementById("authForm");

  if (!form) return;

  const toggle =
    document.getElementById("toggleAuth");


  toggle.onclick = () => {

    signupMode = !signupMode;


    const title =
      document.getElementById("authTitle");

    const subtitle =
      document.getElementById("authSubtitle");

    const button =
      document.getElementById("authBtn");


    if (title) {

      title.textContent =
        signupMode
          ? "Create your account"
          : "Welcome back";
    }


    if (subtitle) {

      subtitle.textContent =
        signupMode
          ? "Join the food redistribution network."
          : "Login to connect surplus food with people who need it.";
    }


    if (button) {

      button.textContent =
        signupMode
          ? "Create Account →"
          : "Login →";
    }


    toggle.textContent =
      signupMode
        ? "Already have an account? Login"
        : "Create an account";


    const nameWrap =
      document.getElementById("nameWrap");

    const roleWrap =
      document.getElementById("roleWrap");


    if (nameWrap) {

      nameWrap.classList.toggle(
        "hidden",
        !signupMode
      );
    }


    if (roleWrap) {

      roleWrap.classList.toggle(
        "hidden",
        !signupMode
      );
    }
  };


  form.onsubmit = async e => {

    e.preventDefault();


    try {

      const email =
        document
          .getElementById("email")
          .value
          .trim();


      const password =
        document
          .getElementById("password")
          .value;


      const body = {

        email,

        password
      };


      if (signupMode) {

        body.name =
          document
            .getElementById("name")
            .value
            .trim();


        body.role =
          document
            .getElementById("role")
            .value;
      }


      const result =
        await api(
          signupMode
            ? "/auth/signup"
            : "/auth/login",
          {
            method: "POST",
            body: JSON.stringify(body)
          }
        );


      if (!result.token) {

        throw new Error(
          "Authentication token was not received."
        );
      }


      localStorage.setItem(
        "token",
        result.token
      );


      localStorage.setItem(
        "user",
        JSON.stringify(result.user)
      );


      localStorage.setItem(
        "userEmail",
        result.user.email
      );


      window.location.replace(
        "dashboard.html"
      );


    } catch (error) {

      console.error(error);

      showToast(error.message);
    }
  };
}


/* =========================================================
   GET REAL USER
========================================================= */

async function syncUser() {

  if (!getToken()) {

    window.location.replace(
      "index.html"
    );

    return null;
  }


  try {

    const result =
      await api("/auth/me");


    localStorage.setItem(
      "user",
      JSON.stringify(result.user)
    );


    localStorage.setItem(
      "userEmail",
      result.user.email
    );


    return result.user;


  } catch (error) {

    console.error(error);

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userEmail");


    window.location.replace(
      "index.html"
    );


    return null;
  }
}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

  const user =
    await syncUser();

  if (!user) return;


  const role =
    user.role;


  const email =
    document.getElementById("userEmail");


  const badge =
    document.getElementById("userRoleBadge");


  const welcome =
    document.getElementById("welcomeTitle");


  if (email) {
    email.textContent =
      user.email;
  }


  if (badge) {
    badge.textContent =
      roleName(role);
  }


  if (welcome) {

    welcome.textContent =
      `Welcome, ${
        user.name ||
        user.email.split("@")[0]
      }`;
  }


  const provider =
    document.getElementById(
      "providerPanel"
    );


  const recipient =
    document.getElementById(
      "searchPanel"
    );


  const volunteer =
    document.getElementById(
      "volunteerPanel"
    );


  const admin =
    document.getElementById(
      "adminPanel"
    );


  if (provider) {

    provider.classList.toggle(
      "hidden",
      !["provider", "admin"]
        .includes(role)
    );
  }


  if (recipient) {

    recipient.classList.toggle(
      "hidden",
      !["recipient", "admin"]
        .includes(role)
    );
  }


  if (volunteer) {

    volunteer.classList.toggle(
      "hidden",
      !["volunteer", "admin"]
        .includes(role)
    );
  }


  if (admin) {

    admin.classList.toggle(
      "hidden",
      role !== "admin"
    );
  }


  const donationForm =
    document.getElementById(
      "donationForm"
    );


  if (
    donationForm &&
    ["provider", "admin"]
      .includes(role)
  ) {

    donationForm.onsubmit =
      submitDonation;
  }


  await refreshStats();

  await loadActivity();


  if (
    ["provider", "admin"]
      .includes(role)
  ) {

    await loadProviderRequests();
  }


  if (role === "volunteer") {

    await loadTasks();
  }


  if (role === "admin") {

    await loadAdmin();
  }
}


/* =========================================================
   STATS
========================================================= */

async function refreshStats() {

  const grid =
    document.getElementById(
      "statsGrid"
    );


  if (!grid) return;


  try {

    const s =
      await api("/stats");


    grid.innerHTML = `

      <div class="stat-card">
        <span>🍱 Donations</span>
        <b>${s.donations || 0}</b>
      </div>

      <div class="stat-card">
        <span>🤝 Requests</span>
        <b>${s.requests || 0}</b>
      </div>

      <div class="stat-card">
        <span>🚚 Deliveries</span>
        <b>${s.deliveries || 0}</b>
      </div>

      <div class="stat-card">
        <span>👥 Users</span>
        <b>${s.users || 0}</b>
      </div>

    `;


  } catch (error) {

    console.error(
      "Stats error:",
      error
    );
  }
}


/* =========================================================
   PROVIDER - DONATE FOOD
========================================================= */

async function submitDonation(e) {

  e.preventDefault();


  try {

    const data = {

      foodName:
        document
          .getElementById("foodName")
          .value
          .trim(),

      category:
        document
          .getElementById("category")
          .value,

      quantity:
        Number(
          document
            .getElementById("quantity")
            .value
        ),

      unit:
        document
          .getElementById("unit")
          .value,

      city:
        document
          .getElementById("city")
          .value
          .trim(),

      location:
        document
          .getElementById("location")
          .value
          .trim(),

      expiry:
        document
          .getElementById("expiry")
          .value,

      description:
        document
          .getElementById("description")
          .value
          .trim()
    };


    const result =
      await api("/donations", {

        method: "POST",

        body: JSON.stringify(data)

      });


    console.log(
      "Donation created:",
      result
    );


    showToast(
      "✅ Donation published successfully!"
    );


    e.target.reset();


    const city =
      document.getElementById(
        "city"
      );


    if (city) {
      city.value = "Jaipur";
    }


    await refreshStats();

    await loadActivity();


    const foodList =
      document.getElementById(
        "foodList"
      );


    if (foodList) {
      await loadFoods();
    }


  } catch (error) {

    console.error(
      "Donation error:",
      error
    );

    showToast(
      error.message
    );
  }
}


/* =========================================================
   SEARCH FOOD
========================================================= */

let foodData = [];


async function loadFoods() {

  const list =
    document.getElementById(
      "foodList"
    );


  if (!list) return;


  try {

    const result =
      await api(
        "/donations"
      );


    foodData =
      result.donations || [];


    console.log(
      "Available donations loaded:",
      foodData.length,
      foodData
    );


    searchFood();


  } catch (error) {

    console.error(
      "Food loading error:",
      error
    );


    list.innerHTML = `

      <div class="empty-state">

        <h3>
          Unable to load available food
        </h3>

        <p>
          ${esc(error.message)}
        </p>

      </div>

    `;
  }
}


function searchFood() {

  const list =
    document.getElementById(
      "foodList"
    );


  if (!list) return;


  const search =
    (
      document
        .getElementById(
          "foodSearch"
        )
        ?.value || ""
    )
      .toLowerCase()
      .trim();


  const category =
    document
      .getElementById(
        "categoryFilter"
      )
      ?.value || "";


  const city =
    (
      document
        .getElementById(
          "cityFilter"
        )
        ?.value || ""
    )
      .toLowerCase()
      .trim();


  const location =
    (
      document
        .getElementById(
          "locationFilter"
        )
        ?.value || ""
    )
      .toLowerCase()
      .trim();


  const filtered =
    foodData.filter(food => {

      const text = `

        ${food.foodName || ""}

        ${food.category || ""}

        ${food.city || ""}

        ${food.location || ""}

        ${food.description || ""}

      `.toLowerCase();


      return (

        (!search ||
          text.includes(search))

        &&

        (!category ||
          food.category === category)

        &&

        (!city ||
          String(
            food.city || ""
          )
            .toLowerCase()
            .includes(city))

        &&

        (!location ||
          String(
            food.location || ""
          )
            .toLowerCase()
            .includes(location))
      );

    });


  renderFoods(filtered);
}


/* =========================================================
   RENDER FOOD
========================================================= */

function renderFoods(foods) {

  const list =
    document.getElementById(
      "foodList"
    );


  if (!list) return;


  if (!foods.length) {

    list.innerHTML = `

      <div class="empty-state">

        <h3>
          No available food found
        </h3>

        <p>
          Try another search or wait for a provider to publish food.
        </p>

      </div>

    `;

    return;
  }


  list.innerHTML = foods.map(
    food => {

      const icons = {

        "Cooked Food": "🍛",

        "Bakery": "🥖",

        "Fruits & Vegetables": "🍎",

        "Packaged Food": "📦",

        "Dairy": "🥛",

        "Meals": "🍛",

        "Rice": "🍚",

        "Fruits": "🍎",

        "Other": "🍱"
      };


      return `

        <article class="food-result">

          <div class="food-result-icon">

            ${
              icons[
                food.category
              ] || "🍱"
            }

          </div>


          <div class="food-result-info">

            <span class="food-tag">

              ${esc(
                food.category ||
                "Food"
              )}

            </span>


            <h2>

              ${esc(
                food.foodName
              )}

            </h2>


            <p>

              📍

              ${esc(
                food.location ||
                "Location not provided"
              )}

              ,

              ${esc(
                food.city ||
                ""
              )}

            </p>


            <div class="food-meta">

              <span>

                📦

                ${esc(
                  food.quantity
                )}

                ${esc(
                  food.unit
                )}

              </span>


              <span>

                ⏰ Expires

                ${dateFormat(
                  food.expiry
                )}

              </span>

            </div>


            <p>

              ${esc(
                food.description ||
                "Surplus food available for redistribution."
              )}

            </p>

          </div>


          <button

            class="request-btn"

            onclick="requestFood('${food._id}')"

          >

            🤝 Request Food

          </button>


        </article>

      `;

    }
  ).join("");
}


/* =========================================================
   RECIPIENT - REQUEST FOOD
========================================================= */

async function requestFood(foodId) {

  const user =
    getUser();


  if (
    !user ||
    !["recipient", "admin"]
      .includes(user.role)
  ) {

    showToast(
      "Only an NGO / Recipient can request food."
    );

    return;
  }


  if (!foodId) {

    showToast(
      "Food donation ID is missing."
    );

    return;
  }


  const selectedFood =
    foodData.find(
      food =>
        String(food._id) ===
        String(foodId)
    );


  if (!selectedFood) {

    showToast(
      "This food listing is no longer available. Please refresh the page."
    );

    return;
  }


  /*
    DELIVERY LOCATION IS NOW REQUIRED.

    We intentionally do not silently use the
    recipient's saved location because the user
    should provide the exact delivery destination
    for this particular request.
  */

  const deliveryLocation =
    window.prompt(
      "Enter the NGO / recipient DELIVERY LOCATION:",
      ""
    );


  if (
    deliveryLocation === null
  ) {

    return;
  }


  const cleanDeliveryLocation =
    deliveryLocation.trim();


  if (!cleanDeliveryLocation) {

    showToast(
      "❌ Delivery location is required."
    );

    return;
  }


  /*
    Optional city.

    We use the recipient's saved city when
    available. The actual delivery location
    entered above remains the important field.
  */

  const recipientCity =
    (
      user.city ||
      ""
    ).trim();


  try {

    /*
      Send foodId because that is the primary
      field expected by the current backend.
    */

    const response =
      await api(
        "/requests",
        {
          method: "POST",

          body: JSON.stringify({

            foodId:
              foodId,

            deliveryLocation:
              cleanDeliveryLocation,

            recipientCity:
              recipientCity

          })
        }
      );


    console.log(
      "Request created successfully:",
      response
    );


    showToast(
      "✅ Food request confirmed successfully!"
    );


    /*
      Do NOT reload the food list.

      The backend changes the donation status
      from Posted -> Matched after the request.

      Reloading immediately could make the card
      disappear and look like the request failed.

      Instead, update the button locally.
    */

    const buttons =
      document.querySelectorAll(
        ".request-btn"
      );


    buttons.forEach(button => {

      const onclick =
        button.getAttribute(
          "onclick"
        );


      if (
        onclick &&
        onclick.includes(
          String(foodId)
        )
      ) {

        button.disabled = true;

        button.textContent =
          "✓ Requested";

        button.style.opacity =
          "0.7";

        button.style.cursor =
          "not-allowed";
      }

    });


    /*
      Refresh global request count.
    */

    await refreshStats();


  } catch (error) {

    console.error(
      "REQUEST FOOD ERROR:",
      error
    );


    showToast(
      error.message ||
      "Could not create food request."
    );
  }
}


/* =========================================================
   PROVIDER - REQUEST MANAGEMENT
========================================================= */

async function loadProviderRequests() {

  const user =
    getUser();


  if (
    !user ||
    !["provider", "admin"]
      .includes(user.role)
  ) {

    return;
  }


  let panel =
    document.getElementById(
      "providerRequestsPanel"
    );


  if (!panel) {

    const activity =
      document.getElementById(
        "activityList"
      );


    if (!activity) return;


    const parentPanel =
      activity.closest(
        ".panel"
      );


    if (!parentPanel) return;


    panel =
      document.createElement(
        "section"
      );


    panel.className =
      "panel full-panel";


    panel.id =
      "providerRequestsPanel";


    panel.innerHTML = `

      <div class="panel-heading">

        <div>

          <span class="section-label">

            REQUEST MANAGEMENT

          </span>

          <h2>
            Food Requests
          </h2>

        </div>


        <span class="panel-icon">
          🤝
        </span>

      </div>


      <div
        id="providerRequestList"
        class="table-wrap"
      ></div>

    `;


    parentPanel.parentNode.insertBefore(
      panel,
      parentPanel
    );
  }


  const box =
    document.getElementById(
      "providerRequestList"
    );


  if (!box) return;


  try {

    const result =
      await api("/requests");


    const requests =
      result.requests || [];


    if (!requests.length) {

      box.innerHTML = `

        <div class="empty-state">

          No food requests yet.

        </div>

      `;

      return;
    }


    box.innerHTML = `

      <table class="activity-table">

        <tr>

          <th>Food</th>

          <th>Requested By</th>

          <th>Delivery Location</th>

          <th>Status</th>

          <th>Action</th>

        </tr>


        ${requests.map(
          r => `

          <tr>

            <td>

              <b>

                ${esc(
                  r.foodName ||
                  "-"
                )}

              </b>

            </td>


            <td>

              ${esc(
                r.recipientName ||
                r.requestedByEmail ||
                "-"
              )}

            </td>


            <td>

              ${esc(
                r.deliveryLocation ||
                r.recipientCity ||
                "-"
              )}

            </td>


            <td>

              <span class="status-badge">

                ${esc(
                  r.status ||
                  "Pending"
                )}

              </span>

            </td>


            <td>

              ${
                r.status === "Pending"

                  ? `

                    <button

                      class="task-btn"

                      onclick="updateRequestStatus(
                        '${r._id}',
                        'Accepted'
                      )"

                    >

                      Accept

                    </button>


                    <button

                      class="logout-btn"

                      onclick="updateRequestStatus(
                        '${r._id}',
                        'Rejected'
                      )"

                    >

                      Reject

                    </button>

                  `

                  : r.status === "Accepted"

                  ? "Volunteer task created"

                  : "—"

              }

            </td>

          </tr>

        `
        ).join("")}

      </table>

    `;


  } catch (error) {

    console.error(error);


    box.innerHTML = `

      <div class="empty-state">

        ${esc(
          error.message
        )}

      </div>

    `;
  }
}


/* =========================================================
   UPDATE REQUEST
========================================================= */

async function updateRequestStatus(
  id,
  status
) {

  try {

    await api(
      `/requests/${id}/status`,
      {
        method: "PATCH",

        body: JSON.stringify({
          status
        })
      }
    );


    showToast(

      status === "Accepted"

        ? "✅ Request accepted. Delivery task created."

        : "Request rejected."

    );


    await loadProviderRequests();

    await refreshStats();

    await loadActivity();


  } catch (error) {

    console.error(error);

    showToast(
      error.message
    );
  }
}


/* =========================================================
   ACTIVITY
========================================================= */

async function loadActivity() {

  const box =
    document.getElementById(
      "activityList"
    );


  if (!box) return;


  try {

    let data;


    try {

      data =
        await api("/activity");

    } catch {

      data =
        await api("/my-activity");
    }


    const rows = [];


    (data.donations || [])
      .forEach(d => {

        rows.push({

          food:
            d.foodName,

          type:
            "Donation",

          status:
            d.status,

          date:
            d.createdAt

        });

      });


    (data.requests || [])
      .forEach(r => {

        rows.push({

          food:
            r.foodName,

          type:
            "Request",

          status:
            r.status,

          date:
            r.createdAt

        });

      });


    (data.tasks || [])
      .forEach(t => {

        rows.push({

          food:
            t.foodName,

          type:
            "Delivery",

          status:
            t.status,

          date:
            t.createdAt

        });

      });


    rows.sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );


    if (!rows.length) {

      box.innerHTML = `

        <div class="empty-state">

          No activity yet.

        </div>

      `;

      return;
    }


    box.innerHTML = `

      <table class="activity-table">

        <tr>

          <th>Food</th>

          <th>Type</th>

          <th>Status</th>

          <th>Date</th>

        </tr>


        ${rows
          .slice(0, 15)
          .map(
            r => `

            <tr>

              <td>
                ${esc(r.food)}
              </td>

              <td>
                ${esc(r.type)}
              </td>

              <td>

                <span class="status-badge">

                  ${esc(
                    r.status
                  )}

                </span>

              </td>

              <td>

                ${dateFormat(
                  r.date
                )}

              </td>

            </tr>

          `
          )
          .join("")}

      </table>

    `;


  } catch (error) {

    console.error(
      "Activity error:",
      error
    );


    box.innerHTML = `

      <div class="empty-state">

        No activity available.

      </div>

    `;
  }
}


/* =========================================================
   VOLUNTEER TASKS
========================================================= */

async function loadTasks() {

  const box =
    document.getElementById(
      "taskList"
    );


  if (!box) return;


  try {

    const result =
      await api("/tasks");


    const tasks =
      result.tasks || [];


    if (!tasks.length) {

      box.innerHTML = `

        <div class="empty-state">

          No delivery tasks assigned yet.

        </div>

      `;

      return;
    }


    box.innerHTML =
      tasks.map(
        t => {

          let buttonText =
            "Delivered";


          if (
            t.status ===
            "Assigned"
          ) {

            buttonText =
              "Accept";
          }


          if (
            t.status ===
            "Accepted"
          ) {

            buttonText =
              "Mark Picked Up";
          }


          if (
            t.status ===
            "Picked Up"
          ) {

            buttonText =
              "Mark Delivered";
          }


          const pickup =
            t.pickupLocation ||
            "Pickup location not available";


          const delivery =
            t.deliveryLocation ||
            "Delivery location not available";


          return `

            <div class="mini-item">

              <span>

                <b>

                  🚚

                  ${esc(
                    t.foodName ||
                    "Food Delivery"
                  )}

                </b>


                <br>


                <small>

                  📦

                  ${esc(
                    t.quantity
                  )}

                  ${esc(
                    t.unit
                  )}

                </small>


                <br>


                <small>

                  📍

                  <strong>
                    Pickup:
                  </strong>

                  ${esc(
                    pickup
                  )}

                </small>


                <br>


                <small>

                  🎯

                  <strong>
                    Delivery:
                  </strong>

                  ${esc(
                    delivery
                  )}

                </small>


                <br>


                <small>

                  📌

                  <strong>
                    Status:
                  </strong>

                  ${esc(
                    t.status
                  )}

                </small>

              </span>


              ${
                t.status !==
                "Delivered"

                  ? `

                    <button

                      class="task-btn"

                      onclick="updateTask(
                        '${t._id}',
                        '${t.status}'
                      )"

                    >

                      ${buttonText}

                    </button>

                  `

                  : `

                    <span class="status-badge">

                      Delivered

                    </span>

                  `
              }

            </div>

          `;

        }
      ).join("");


  } catch (error) {

    console.error(
      "Task error:",
      error
    );


    box.innerHTML = `

      <div class="empty-state">

        ${esc(
          error.message
        )}

      </div>

    `;
  }
}


/* =========================================================
   UPDATE VOLUNTEER TASK
========================================================= */

async function updateTask(
  id,
  currentStatus
) {

  const next = {

    Assigned:
      "Accepted",

    Accepted:
      "Picked Up",

    "Picked Up":
      "Delivered"

  }[currentStatus];


  if (!next) {

    showToast(
      "This task has already been completed."
    );

    return;
  }


  try {

    /*
      Use the explicit status endpoint.
      The backend supports this endpoint.
    */

    const result =
      await api(
        `/tasks/${id}/status`,
        {
          method: "PATCH",

          body: JSON.stringify({
            status: next
          })
        }
      );


    console.log(
      "Task updated:",
      result
    );


    showToast(
      `✅ Delivery updated to ${next}.`
    );


    /*
      Reload directly from MongoDB.
      This ensures the volunteer sees the
      actual saved status.
    */

    await loadTasks();

    await refreshStats();

    await loadActivity();


  } catch (error) {

    console.error(
      "TASK UPDATE ERROR:",
      error
    );

    showToast(
      error.message ||
      "Could not update delivery task."
    );
  }
}


/* =========================================================
   ADMIN
========================================================= */

async function loadAdmin() {

  const box =
    document.getElementById(
      "adminSummary"
    );


  if (!box) return;


  try {

    const data =
      await api(
        "/admin/summary"
      );


    box.innerHTML =
      Object.entries(data)
        .map(
          ([key, value]) => `

            <div class="mini-item">

              <span>

                ${esc(key)}

              </span>

              <b>

                ${esc(value)}

              </b>

            </div>

          `
        )
        .join("");


  } catch (error) {

    box.innerHTML = `

      <div class="empty-state">

        ${esc(
          error.message
        )}

      </div>

    `;
  }
}


/* =========================================================
   SEARCH PAGE INITIALIZATION
========================================================= */

function setupSearchFilters() {

  const search =
    document.getElementById(
      "foodSearch"
    );


  const category =
    document.getElementById(
      "categoryFilter"
    );


  const city =
    document.getElementById(
      "cityFilter"
    );


  const location =
    document.getElementById(
      "locationFilter"
    );


  if (search) {

    search.addEventListener(
      "input",
      searchFood
    );
  }


  if (category) {

    category.addEventListener(
      "change",
      searchFood
    );
  }


  if (city) {

    city.addEventListener(
      "input",
      searchFood
    );
  }


  if (location) {

    location.addEventListener(
      "input",
      searchFood
    );
  }
}


/* =========================================================
   START PAGE
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupAuth();


    /*
      Dashboard
    */

    if (
      document.getElementById(
        "userEmail"
      )
    ) {

      await loadDashboard();

      return;
    }


    /*
      Search page
    */

    if (
      document.getElementById(
        "searchUser"
      )
    ) {

      const user =
        await syncUser();


      if (!user) return;


      document.getElementById(
        "searchUser"
      ).textContent =
        `${roleName(
          user.role
        )} • ${user.email}`;


      setupSearchFilters();


      await loadFoods();
    }

  }
);