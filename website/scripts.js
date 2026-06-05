const API_URL =
  "https://yiyp4ogr3b.execute-api.us-east-1.amazonaws.com/prod/feedback";

const COGNITO_DOMAIN =
  "https://tarun-feedback-api-001.auth.us-east-1.amazoncognito.com";

const CLIENT_ID = 
"4avm29f5ejkr77i8ng51sjjeti";

const REDIRECT_URI = 
"https://d2ax45v2f4i3k6.cloudfront.net/";

function login() {

  const loginUrl =
    `${COGNITO_DOMAIN}/login` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&scope=openid+email+profile` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  window.location.href = loginUrl;
}

function signup() {

  const signupUrl =
    `${COGNITO_DOMAIN}/signup` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&scope=openid+email+profile` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  window.location.href = signupUrl;
}

function logout() {

  localStorage.removeItem("id_token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");

  const logoutUrl =
    `${COGNITO_DOMAIN}/logout` +
    `?client_id=${CLIENT_ID}` +
    `&logout_uri=${encodeURIComponent(REDIRECT_URI)}`;

  window.location.href = logoutUrl;
}

function parseJwt(token) {

  return JSON.parse(
    atob(
      token.split(".")[1]
    )
  );
}

function getCurrentUser() {

  const token =
    localStorage.getItem("id_token");

  if (!token) {
    return null;
  }

  try {
    return parseJwt(token);
  }
  catch (err) {
    console.error(err);
    return null;
  }
}

function getUserRole() {

  const user =
    getCurrentUser();

  if (!user) {
    return "guest";
  }

  const groups =
    user["cognito:groups"] || [];

  if (
    groups.includes("admins")
  ) {
    return "admin";
  }

  return "user";
}

async function handleAuthCallback() {

  const params =
    new URLSearchParams(window.location.search);

  const code =
    params.get("code");

  if (!code) {
    updateUserStatus();
    return;
  }

  try {

    const response =
      await fetch(
        `${COGNITO_DOMAIN}/oauth2/token`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          body: new URLSearchParams({
            grant_type:
              "authorization_code",

            client_id:
              CLIENT_ID,

            code:
              code,

            redirect_uri:
              REDIRECT_URI
          })
        }
      );

    const tokens =
      await response.json();

    console.log(
      "Cognito Tokens:",
      tokens
    );

    localStorage.setItem(
      "id_token",
      tokens.id_token
    );

    localStorage.setItem(
      "access_token",
      tokens.access_token
    );

    localStorage.setItem(
      "refresh_token",
      tokens.refresh_token
    );

    window.history.replaceState(
      {},
      document.title,
      "/"
    );

    updateUserStatus();

  } catch (error) {

    console.error(
      "Authentication Error:",
      error
    );
  }
}

function updateUserStatus() {

  const statusElement =
    document.getElementById(
      "user-status"
    );

  if (!statusElement) {
    return;
  }

  const user =
    getCurrentUser();

  if (!user) {

    statusElement.innerHTML =
      "Browsing as Guest";

    toggleRoleBasedUI();

    return;
  }

  const role =
    getUserRole();

  statusElement.innerHTML =
    `Logged in as
     ${user.email}
     (${role})`;

  toggleRoleBasedUI();
}

function toggleRoleBasedUI() {

  const role =
    getUserRole();

  const adminButton =
    document.getElementById(
      "admin-export"
    );

  if (!adminButton) {
    return;
  }

  adminButton.style.display =
    role === "admin"
      ? "inline-block"
      : "none";
}

async function submitFeedback() {

  const feedback =
    document.getElementById(
      "feedback"
    ).value.trim();

  const anonymous =
    document.getElementById(
      "anonymous"
    ).checked;

  if (!feedback) {

    document.getElementById(
      "message"
    ).innerHTML =
      "Please enter feedback.";

    return;
  }

  try {

    const user =
      getCurrentUser();

    const response =
      await fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          name:
            anonymous
              ? "Anonymous"
              : (
                  user
                    ? user.email
                    : "Anonymous"
                ),

          feedback:
            feedback
        })
      });

    const result =
      await response.json();

    document.getElementById(
      "message"
    ).innerHTML =
      result.message;

    document.getElementById(
      "feedback"
    ).value = "";

  } catch (error) {

    console.error(error);

    document.getElementById(
      "message"
    ).innerHTML =
      "Unable to connect to server.";
  }
}

async function fetchFeedback() {

  try {

    const accessToken =
      localStorage.getItem(
        "access_token"
      );

    if (!accessToken) {

      alert(
        "Please login to view feedback."
      );

      return;
    }

    const response =
      await fetch(API_URL, {

        headers: {
          Authorization:
            `Bearer ${accessToken}`
        }
      });

    if (response.status === 401) {

      alert(
        "Your session has expired or you are not logged in."
      );

      return;
    }

    if (response.status === 403) {

      alert(
        "You do not have permission to access this resource."
      );

      return;
    }

    if (!response.ok) {

      alert(
        `Server returned ${response.status}`
      );

      return;
    }

    const feedbacks =
      await response.json();

    renderFeedbackPreview(
      feedbacks
    );

    const blob =
      new Blob(
        [
          JSON.stringify(
            feedbacks,
            null,
            4
          )
        ],
        {
          type:
            "application/json"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      "feedbacks.json";

    link.click();

    URL.revokeObjectURL(
      url
    );

  } catch (error) {

    console.error(error);

    alert(
      "Unable to connect to server."
    );

    document.getElementById(
      "message"
    ).innerHTML =
      "Unable to connect to server.";
  }
}

function renderFeedbackPreview(
  feedbacks
) {

  const preview =
    document.getElementById(
      "feedback-preview"
    );

  if (!preview) {
    return;
  }

  if (
    !feedbacks ||
    feedbacks.length === 0
  ) {

    preview.innerHTML =
      "No feedback found.";

    return;
  }

  let html = "";

  feedbacks.forEach(
    (item) => {

      html += `
        <div class="feedback-card">

          <p>
            <strong>Feedback:</strong>
            ${item.feedback || ""}
          </p>

          <p>
            <strong>Submitted By:</strong>
            Anonymous
          </p>

        </div>
      `;
    }
  );

  preview.innerHTML = html;
}

window.onload = async () => {

  await handleAuthCallback();

  updateUserStatus();

};