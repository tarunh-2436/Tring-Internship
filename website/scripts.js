const API_URL =
    "https://eolass3b4k.execute-api.us-east-1.amazonaws.com/prod/feedback";

const COGNITO_DOMAIN =
    "https://tarun-feedback-api-001.auth.us-east-1.amazoncognito.com";

const CLIENT_ID =
    "7euj00ss96mont8obdp64egv3l";

const REDIRECT_URI =
    "https://d2q7n43zipfzc0.cloudfront.net/";

/* ==========================================
                AUTHENTICATION
========================================== */

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
        localStorage.getItem(
            "id_token"
        );

    if (!token)
        return null;

    try {

        return parseJwt(token);

    }

    catch {

        return null;
    }
}

function getUserRole() {

    const user =
        getCurrentUser();

    if (!user)
        return "guest";

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
        new URLSearchParams(
            window.location.search
        );

    const code =
        params.get("code");

    if (!code)
        return;

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

                    body:
                        new URLSearchParams({

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

    }

    catch (err) {

        console.error(err);

    }

}

/* ==========================================
                USER STATUS
========================================== */

function updateUserStatus() {

    const element =
        document.getElementById(
            "user-status"
        );

    if (!element)
        return;

    const user =
        getCurrentUser();

    if (!user) {

        element.innerHTML =
            "Browsing as Guest";

    }

    else {

        element.innerHTML =
            `Logged in as ${user.email} (${getUserRole()})`;

    }

    toggleRoleBasedUI();
}

function toggleRoleBasedUI() {

    const adminButton =
        document.getElementById(
            "admin-export"
        );

    if (!adminButton)
        return;

    adminButton.style.display =
        getUserRole() === "admin"
            ? "block"
            : "none";
}

/* ==========================================
                NAVIGATION
========================================== */

function renderTemplate(id) {

    const content =
        document.getElementById(
            "content"
        );

    const template =
        document.getElementById(
            id
        );

    content.innerHTML =
        "";

    content.appendChild(
        template.content.cloneNode(true)
    );
}

function showHome() {

    renderTemplate(
        "home-template"
    );
}

function showSubmit() {

    renderTemplate(
        "submit-template"
    );
}

function showMyFeedback() {

    renderTemplate(
        "my-feedback-template"
    );

    fetchFeedback();
}

function showAdminDashboard() {

    if (
        getUserRole() !==
        "admin"
    ) {

        alert(
            "Admin access required."
        );

        return;
    }

    renderTemplate(
        "admin-template"
    );

    fetchFeedback();
}

function initializeNavigation() {

    document
        .getElementById(
            "nav-dashboard"
        )
        .onclick =
        showHome;

    document
        .getElementById(
            "nav-submit"
        )
        .onclick =
        showSubmit;

    document
        .getElementById(
            "nav-my-feedback"
        )
        .onclick =
        showMyFeedback;

    document
        .getElementById(
            "admin-export"
        )
        .onclick =
        showAdminDashboard;
}

/* ==========================================
                SUBMIT
========================================== */

async function submitFeedback() {

    const feedback =
        document
            .getElementById(
                "feedback"
            )
            .value
            .trim();

    const anonymous =
        document
            .getElementById(
                "anonymous"
            )
            .checked;

    if (!feedback) {

        document
            .getElementById(
                "message"
            )
            .innerHTML =
            "Please enter feedback.";

        return;
    }

    const endpoint =
        anonymous
            ? `${API_URL}/anonymous`
            : API_URL;

    const headers = {

        "Content-Type":
            "application/json"

    };

    if (!anonymous) {

        const token =
            localStorage.getItem(
                "access_token"
            );

        if (!token) {

            document
                .getElementById(
                    "message"
                )
                .innerHTML =
                "Please login or submit anonymously.";

            return;
        }

        headers.Authorization =
            `Bearer ${token}`;

    }

    try {

        const response =
            await fetch(

                endpoint,

                {

                    method:
                        "POST",

                    headers,

                    body:
                        JSON.stringify({

                            feedback:
                                feedback

                        })

                }

            );

        const result =
            await response.json();

        document
            .getElementById(
                "message"
            )
            .innerHTML =
            result.message;

        document
            .getElementById(
                "feedback"
            )
            .value =
            "";

    }

    catch (err) {

        console.error(err);

        document
            .getElementById(
                "message"
            )
            .innerHTML =
            "Unable to connect.";

    }

}

/* ==========================================
                FETCH
========================================== */

async function fetchFeedback() {

    const token =
        localStorage.getItem(
            "access_token"
        );

    if (!token) {

        alert(
            "Please login."
        );

        return;
    }

    try {

        const response =
            await fetch(

                API_URL,

                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    }

                }

            );

        if (!response.ok) {

            alert(
                "Unable to load feedback."
            );

            return;

        }

        const feedbacks =
            await response.json();

        renderFeedbackPreview(
            feedbacks
        );

    }

    catch (err) {

        console.error(err);

    }

}

/* ==========================================
                RENDER
========================================== */

function renderFeedbackPreview(
    feedbacks
) {

    const preview =
        document.getElementById(
            "feedback-preview"
        );

    if (!preview)
        return;

    preview.innerHTML =
        "";

    if (
        feedbacks.length === 0
    ) {

        preview.innerHTML =
            "<p>No feedback found.</p>";

        return;
    }

    feedbacks.forEach(

        item => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "feedback-card";

            card.innerHTML =

                `
                <h3>
                    ${item.title || "Untitled"}
                </h3>

                <p>

                    ${item.content || ""}

                </p>

                <small>

                    ${item.lastUpdated || ""}

                </small>

                <div class="feedback-actions">

                    <button>

                        View

                    </button>

                    <button>

                        Edit

                    </button>

                    <button>

                        Delete

                    </button>

                </div>
                `;

            preview.appendChild(
                card
            );

        }

    );

}

/* ==========================================
                INITIALIZE
========================================== */

window.onload =
async function () {

    await handleAuthCallback();

    updateUserStatus();

    initializeNavigation();

    showHome();

};