/********************************************************************
                        CONFIGURATION
********************************************************************/

const API_URL =
    "https://eolass3b4k.execute-api.us-east-1.amazonaws.com/prod/feedback";

const COGNITO_DOMAIN =
    "https://tarun-feedback-api-001.auth.us-east-1.amazoncognito.com";

const CLIENT_ID =
    "7euj00ss96mont8obdp64egv3l";

const REDIRECT_URI =
    "https://d2q7n43zipfzc0.cloudfront.net/";


/********************************************************************
                        APPLICATION STATE
********************************************************************/

const AppState = {

    currentPage:
        "home",

    currentUser:
        null,

    currentRole:
        "guest",

    feedbacks:
        [],

    selectedFeedback:
        null

};


/********************************************************************
                        AUTHENTICATION
********************************************************************/

function login() {

    const loginUrl =

        `${COGNITO_DOMAIN}/login`

        + `?client_id=${CLIENT_ID}`

        + `&response_type=code`

        + `&scope=openid+email+profile`

        + `&redirect_uri=${encodeURIComponent(
            REDIRECT_URI
        )}`;

    window.location.href =
        loginUrl;
}


function signup() {

    const signupUrl =

        `${COGNITO_DOMAIN}/signup`

        + `?client_id=${CLIENT_ID}`

        + `&response_type=code`

        + `&scope=openid+email+profile`

        + `&redirect_uri=${encodeURIComponent(
            REDIRECT_URI
        )}`;

    window.location.href =
        signupUrl;
}


function logout() {

    localStorage.removeItem(
        "id_token"
    );

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "refresh_token"
    );

    const logoutUrl =

        `${COGNITO_DOMAIN}/logout`

        + `?client_id=${CLIENT_ID}`

        + `&logout_uri=${encodeURIComponent(
            REDIRECT_URI
        )}`;

    window.location.href =
        logoutUrl;
}


/********************************************************************
                        JWT HELPERS
********************************************************************/

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

        return parseJwt(
            token
        );

    }

    catch {

        return null;

    }

}


function getAccessToken() {

    return localStorage.getItem(
        "access_token"
    );

}


function getRefreshToken() {

    return localStorage.getItem(
        "refresh_token"
    );

}


function getUserRole() {

    const user =
        getCurrentUser();

    if (!user)
        return "guest";

    const groups =

        user[
            "cognito:groups"
        ] || [];

    if (
        groups.includes(
            "admins"
        )
    ) {

        return "admin";

    }

    return "user";

}


/********************************************************************
                HANDLE COGNITO CALLBACK
********************************************************************/

async function handleAuthCallback() {

    const params =

        new URLSearchParams(

            window.location.search

        );

    const code =
        params.get(
            "code"
        );

    if (!code)
        return;

    try {

        const response =

            await fetch(

                `${COGNITO_DOMAIN}/oauth2/token`,

                {

                    method:
                        "POST",

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

    catch (error) {

        console.error(

            error

        );

    }

}


/********************************************************************
                        USER STATUS
********************************************************************/

function updateUserStatus() {

    const statusElement =

        document.getElementById(

            "user-status"

        );

    if (!statusElement)
        return;

    const user =
        getCurrentUser();

    if (!user) {

        AppState.currentUser =
            null;

        AppState.currentRole =
            "guest";

        statusElement.innerHTML =

            "Browsing as Guest";

    }

    else {

        AppState.currentUser =
            user;

        AppState.currentRole =
            getUserRole();

        statusElement.innerHTML =

            `Logged in as

            ${user.email}

            (${AppState.currentRole})`;

    }

    toggleRoleBasedUI();

}


/********************************************************************
                    ROLE BASED UI
********************************************************************/

function toggleRoleBasedUI() {

    const adminButton =

        document.getElementById(

            "admin-export"

        );

    if (!adminButton)
        return;

    adminButton.style.display =

        AppState.currentRole ===
        "admin"

        ?

        "block"

        :

        "none";

}


/********************************************************************
                    NAVIGATION
********************************************************************/

function renderTemplate(

    templateId

) {

    const content =

        document.getElementById(

            "content"

        );

    if (!content)
        return;

    const template =

        document.getElementById(

            templateId

        );

    content.innerHTML =

        "";

    content.appendChild(

        template.content.cloneNode(

            true

        )

    );

}


function navigate(

    page

) {

    AppState.currentPage =
        page;

    switch (page) {

        case "home":

            showHome();

            break;

        case "submit":

            showSubmit();

            break;

        case "my-feedback":

            showMyFeedback();

            break;

        case "admin":

            showAdminDashboard();

            break;

        default:

            showHome();

    }

}


function initializeNavigation() {

    document

        .getElementById(

            "nav-home"

        )

        .onclick =

        () =>

        navigate(

            "home"

        );

    document

        .getElementById(

            "nav-submit"

        )

        .onclick =

        () =>

        navigate(

            "submit"

        );

    document

        .getElementById(

            "nav-my-feedback"

        )

        .onclick =

        () =>

        navigate(

            "my-feedback"

        );

    const adminButton =

        document.getElementById(

            "admin-export"

        );

    if (adminButton) {

        adminButton.onclick =

            () =>

            navigate(

                "admin"

            );

    }

}


/********************************************************************
                    PAGE RENDERING
********************************************************************/

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

    loadMyFeedback();

}

function showAdminDashboard(){

    if (
        AppState.currentRole !==
        "admin"
    ) {

        alert(
            "Admin access required."
        );

        navigate(
            "home"
        );

        return;
    }

    renderTemplate(

        "admin-template"

    );

    loadAdminFeedback();

}

/********************************************************************
                    LOAD DATA
********************************************************************/

async function loadMyFeedback(){

    const feedbacks =

        await fetchMyFeedback();

    AppState.feedbacks =
        feedbacks;

    renderFeedbackCards(

        feedbacks,

        {

            showOwner:false,

            canEdit:true,

            canDelete:true,

            canDownload:false

        }

    );

}


async function loadAdminFeedback(){

    const feedbacks =

        await fetchAdminFeedback();

    AppState.feedbacks =
        feedbacks;

    renderFeedbackCards(

        feedbacks,

        {

            showOwner:true,

            canEdit:false,

            canDelete:false,

            canDownload:true

        }

    );

}


/********************************************************************
                FEEDBACK CARD RENDERER
********************************************************************/

function renderFeedbackCards(

    feedbacks,

    options

) {

    const container =

        document.getElementById(

            "feedback-preview"

        );

    if (!container)
        return;

    container.innerHTML =
        "";

    if (

        !feedbacks ||

        feedbacks.length === 0

    ) {

        container.innerHTML =

        `

        <div class="feedback-card">

            <h3>

                No Feedback Found

            </h3>

            <p>

                Nothing to display.

            </p>

        </div>

        `;

        return;

    }

    feedbacks.forEach(

        item => {

            const preview =

                item.content

                ?

                item.content.substring(
                    0,
                    120
                )

                :

                "";

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

                <strong>Status:</strong>

                ${item.status || "ACTIVE"}

            </p>

            ${

                options.showOwner

                ?

                `

                <p>

                    <strong>Owner:</strong>

                    ${item.ownerId}

                </p>

                `

                :

                ""

            }

            <p>

                <strong>Updated:</strong>

                ${item.lastUpdated || ""}

            </p>

            <hr>

            <p>

                ${preview}

            </p>

            <div class="feedback-actions">

                <button

                    onclick="viewFeedback('${item.feedbackId}')">

                    View

                </button>

                ${

                    options.canEdit

                    ?

                    `

                    <button

                        onclick="editFeedback('${item.feedbackId}')">

                        Edit

                    </button>

                    `

                    :

                    ""

                }

                ${

                    options.canDelete

                    ?

                    `

                    <button

                        onclick="deleteFeedback('${item.feedbackId}')">

                        Delete

                    </button>

                    `

                    :

                    ""

                }

                ${

                    options.canDownload

                    ?

                    `

                    <button

                        onclick="downloadFeedback('${item.feedbackId}')">

                        Download

                    </button>

                    `

                    :

                    ""

                }

            </div>

            `;

            container.appendChild(
                card
            );

        }

    );

}


/********************************************************************
                SELECT FEEDBACK
********************************************************************/

function findFeedback(

    feedbackId

) {

    return AppState.feedbacks.find(

        feedback =>

        feedback.feedbackId ===
        feedbackId

    );

}


function viewFeedback(

    feedbackId

) {

    AppState.selectedFeedback =

        findFeedback(
            feedbackId
        );

    alert(

        "View functionality will be connected to GET /feedback/{id}"

    );

}


function editFeedback(

    feedbackId

) {

    AppState.selectedFeedback =

        findFeedback(
            feedbackId
        );

    alert(

        "Edit functionality will be connected to PUT /feedback/{id}"

    );

}


function deleteFeedback(

    feedbackId

) {

    AppState.selectedFeedback =

        findFeedback(
            feedbackId
        );

    if (

        confirm(

            "Delete this feedback?"

        )

    ) {

        alert(

            "DELETE endpoint will be called for:\n\n"

            +

            feedbackId

        );

    }

}


function downloadFeedback(

    feedbackId

) {

    AppState.selectedFeedback =

        findFeedback(
            feedbackId
        );

    alert(

        "Download endpoint will be connected for:\n\n"

        +

        feedbackId

    );

}

/********************************************************************
                    BACKEND API
********************************************************************/

async function submitFeedback() {

    const feedbackElement =

        document.getElementById(
            "feedback"
        );

    const anonymousElement =

        document.getElementById(
            "anonymous"
        );

    const messageElement =

        document.getElementById(
            "message"
        );

    if (!feedbackElement)
        return;

    const feedback =

        feedbackElement.value.trim();

    if (!feedback) {

        if (messageElement) {

            messageElement.innerHTML =

                "Please enter feedback.";

        }

        return;

    }

    const anonymous =

        anonymousElement

        ?

        anonymousElement.checked

        :

        false;

    const endpoint =

        anonymous

        ?

        `${API_URL}/anonymous`

        :

        API_URL;

    const headers = {

        "Content-Type":

            "application/json"

    };

    if (!anonymous) {

        const accessToken =

            getAccessToken();

        if (!accessToken) {

            if (messageElement) {

                messageElement.innerHTML =

                    "Please login or submit anonymously.";

            }

            return;

        }

        headers.Authorization =

            `Bearer ${accessToken}`;

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

        if (messageElement) {

            messageElement.innerHTML =

                result.message;

        }

        feedbackElement.value =

            "";

    }

    catch (error) {

        console.error(

            error

        );

        if (messageElement) {

            messageElement.innerHTML =

                "Unable to connect to server.";

        }

    }

}


/********************************************************************
                    FETCH FEEDBACK
********************************************************************/

async function fetchMyFeedback() {

    const accessToken =
        getAccessToken();

    if (!accessToken) {

        alert(
            "Please login."
        );

        return [];
    }

    try {

        const response =

            await fetch(

                API_URL,

                {

                    headers:{

                        Authorization:
                        `Bearer ${accessToken}`

                    }

                }

            );

        if(!response.ok){

            throw new Error(
                "Unable to fetch feedback"
            );

        }

        return await response.json();

    }

    catch(error){

        console.error(error);

        return [];

    }

}

async function fetchAdminFeedback() {

    const accessToken =
        getAccessToken();

    if (!accessToken) {

        alert(
            "Please login."
        );

        return [];
    }

    try {

        const response =

            await fetch(

                `${API_URL}/admin`,

                {

                    headers:{

                        Authorization:
                        `Bearer ${accessToken}`

                    }

                }

            );

        if(!response.ok){

            throw new Error(
                "Unable to fetch feedback"
            );

        }

        return await response.json();

    }

    catch(error){

        console.error(error);

        return [];

    }

}

/********************************************************************
                    FUTURE CRUD
********************************************************************/

async function updateFeedback(

    feedbackId,

    payload

) {

    console.log(

        "Future PUT:",

        feedbackId,

        payload

    );

}


async function removeFeedback(

    feedbackId

) {

    console.log(

        "Future DELETE:",

        feedbackId

    );

}


async function downloadFeedbackFile(

    feedbackId

) {

    console.log(

        "Future DOWNLOAD:",

        feedbackId

    );

}


/********************************************************************
                    APPLICATION STARTUP
********************************************************************/

async function initializeApplication() {

    await handleAuthCallback();

    updateUserStatus();

    initializeNavigation();

    navigate(

        "home"

    );

}


/********************************************************************
                    WINDOW LOAD
********************************************************************/

window.onload =

async function () {

    await initializeApplication();

};