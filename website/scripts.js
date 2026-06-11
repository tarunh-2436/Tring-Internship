/********************************************************************
                        CONFIGURATION
********************************************************************/

const API_URL =
    "https://0tsyt0g77j.execute-api.us-east-1.amazonaws.com/prod/feedback";

const COGNITO_DOMAIN =
    "https://tarun-feedback-api-001.auth.us-east-1.amazoncognito.com";

const CLIENT_ID =
    "6lo2tosllipdsnteas7i9j85ao";

const REDIRECT_URI =
    "https://d14npegu4204tc.cloudfront.net/";


/********************************************************************
                        APPLICATION STATE
********************************************************************/

const AppState = {

    currentPage: "home",

    currentUser: null,

    currentRole: "guest",

    feedbacks: [],

    selectedFeedback: null,

    modalMode: "view"

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

    if (!token) {

        return null;

    }

    try {

        return parseJwt(
            token
        );

    }

    catch (error) {

        console.error(error);

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

    if (!user) {

        return "guest";

    }

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

    if (!code) {

        return;

    }

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

        if (!response.ok) {

            throw new Error(
                "Failed to exchange authorization code."
            );

        }

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

        console.error(error);

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

    if (!statusElement) {

        return;

    }

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

    if (!adminButton) {

        return;

    }

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

    if (!content) {

        return;

    }

    const template =

        document.getElementById(

            templateId

        );

    if (!template) {

        console.error(

            `Template not found: ${templateId}`

        );

        return;

    }

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


function showAdminDashboard() {

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

async function loadMyFeedback() {

    const feedbacks =

        await fetchMyFeedback();

    AppState.feedbacks =
        feedbacks;

    renderFeedbackCards(

        feedbacks,

        {

            showOwner:
                false,

            canEdit:
                true,

            canDelete:
                true,

            canDownload:
                false

        }

    );

}


async function loadAdminFeedback() {

    const feedbacks =

        await fetchAdminFeedback();

    AppState.feedbacks =
        feedbacks;

    renderFeedbackCards(

        feedbacks,

        {

            showOwner:
                true,

            canEdit:
                false,

            canDelete:
                false,

            canDownload:
                true

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

    if (!container) {

        return;

    }

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


/********************************************************************
                    VIEW
********************************************************************/

async function viewFeedback(

    feedbackId

) {

    AppState.selectedFeedback =

        findFeedback(

            feedbackId

        );

    if (

        !AppState.selectedFeedback

    ) {

        alert(

            "Feedback not found."

        );

        return;

    }

    await loadSingleFeedback(

        "view"

    );

}


/********************************************************************
                    EDIT
********************************************************************/

async function editFeedback(

    feedbackId

) {

    AppState.selectedFeedback =

        findFeedback(

            feedbackId

        );

    if (

        !AppState.selectedFeedback

    ) {

        alert(

            "Feedback not found."

        );

        return;

    }

    await loadSingleFeedback(

        "edit"

    );

}


/********************************************************************
                    DELETE
********************************************************************/

async function deleteFeedback(

    feedbackId

) {

    const feedback =

        findFeedback(

            feedbackId

        );

    if (

        !feedback

    ) {

        alert(

            "Feedback not found."

        );

        return;

    }

    const confirmed =

        confirm(

            "Are you sure you want to delete this feedback?"

        );

    if (

        !confirmed

    ) {

        return;

    }

    const accessToken =

        getAccessToken();

    if (

        !accessToken

    ) {

        alert(

            "Please login."

        );

        return;

    }

    try {

        const response =

            await fetch(

                `${API_URL}/${feedback.ownerId}/${feedback.feedbackId}`,

                {

                    method:

                        "DELETE",

                    headers: {

                        Authorization:

                            `Bearer ${accessToken}`

                    }

                }

            );

        if (

            !response.ok

        ) {

            throw new Error(

                await response.text()

            );

        }

        AppState.selectedFeedback =

            null;

        alert(

            "Feedback deleted successfully."

        );

        await loadMyFeedback();

    }

    catch (

        error

    ) {

        console.error(

            error

        );

        alert(

            "Unable to delete feedback."

        );

    }

}


/********************************************************************
                    DOWNLOAD
********************************************************************/

async function downloadFeedback(
    feedbackId
) {

    const feedback =
        findFeedback(
            feedbackId
        );

    if (!feedback) {

        alert(
            "Feedback not found."
        );

        return;

    }

    const accessToken =
        getAccessToken();

    try {

        const response =

            await fetch(

                `${API_URL}/${feedback.ownerId}/${feedback.feedbackId}/download`,

                {

                    headers: {

                        Authorization:
                            `Bearer ${accessToken}`

                    }

                }

            );

        if (!response.ok) {

            throw new Error(
                await response.text()
            );

        }

        const blob =
            await response.blob();

        const url =
            window.URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            url;

        link.download =
            `feedback-${feedback.feedbackId}.txt`;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        window.URL.revokeObjectURL(
            url
        );

    }

    catch (error) {

        console.error(error);

        alert(
            "Unable to download feedback."
        );

    }

}

/********************************************************************
                    MODAL HANDLER
********************************************************************/

function openFeedbackModal(
    feedback,
    mode
) {

    AppState.modalMode =
        mode;

    populateFeedbackModal(
        feedback
    );

    setModalMode(
        mode
    );

    document.getElementById(
        "feedbackModal"
    ).style.display =
        "flex";

}


function closeFeedbackModal() {

    document.getElementById(
        "feedbackModal"
    ).style.display =
        "none";

}


function populateFeedbackModal(
    feedback
) {

    document.getElementById(
        "feedbackTitle"
    ).value =
        feedback.title || "";

    document.getElementById(
        "feedbackContent"
    ).value =
        feedback.content || "";

    document.getElementById(
        "feedbackCreated"
    ).value =
        feedback.createdAt || "";

    document.getElementById(
        "feedbackUpdated"
    ).value =
        feedback.lastUpdated || "";

    const attachments =
        document.getElementById(
            "feedbackAttachments"
        );

    if (
        feedback.attachments &&
        feedback.attachments.length > 0
    ) {

        attachments.innerHTML =
            feedback.attachments
                .map(
                    file =>
                        `<div>📎 ${file}</div>`
                )
                .join("");

    }

    else {

        attachments.innerHTML =
            "No attachments";

    }

}


function setModalMode(
    mode
) {

    AppState.modalMode =
        mode;

    const title =
        document.getElementById(
            "feedbackTitle"
        );

    const content =
        document.getElementById(
            "feedbackContent"
        );

    const subtitle =
        document.getElementById(
            "modalSubtitle"
        );

    const closeButton =
        document.getElementById(
            "closeBtn"
        );

    const editButton =
        document.getElementById(
            "editBtn"
        );

    const deleteButton =
        document.getElementById(
            "deleteBtn"
        );

    const downloadButton =
        document.getElementById(
            "downloadBtn"
        );

    const saveButton =
        document.getElementById(
            "saveBtn"
        );

    if (
        mode === "edit"
    ) {

        title.readOnly =
            false;

        content.readOnly =
            false;

        subtitle.textContent =
            "Editing Feedback";

        closeButton.textContent =
            "Cancel";

        editButton.style.display =
            "none";

        deleteButton.style.display =
            "none";

        downloadButton.style.display =
            "none";

        saveButton.style.display =
            "inline-block";

    }

    else {

        title.readOnly =
            true;

        content.readOnly =
            true;

        subtitle.textContent =
            "Viewing Feedback";

        closeButton.textContent =
            "Close";

        editButton.style.display =
            "inline-block";

        deleteButton.style.display =
            "inline-block";

        downloadButton.style.display =
            "inline-block";

        saveButton.style.display =
            "none";

    }

}


function switchToEditMode() {

    if (
        !AppState.selectedFeedback
    ) {

        return;

    }

    openFeedbackModal(

        AppState.selectedFeedback,

        "edit"

    );

}


function deleteSelectedFeedback() {

    if (
        !AppState.selectedFeedback
    ) {

        return;

    }

    closeFeedbackModal();

    deleteFeedback(

        AppState.selectedFeedback.feedbackId

    );

}


function downloadSelectedFeedback() {

    if (
        !AppState.selectedFeedback
    ) {

        return;

    }

    downloadFeedback(

        AppState.selectedFeedback.feedbackId

    );

}


window.addEventListener(

    "click",

    function (
        event
    ) {

        const modal =
            document.getElementById(
                "feedbackModal"
            );

        if (
            event.target === modal
        ) {

            closeFeedbackModal();

        }

    }

);

/********************************************************************
                    SAVE FEEDBACK
********************************************************************/

async function saveFeedback() {

    const accessToken =

        getAccessToken();

    if (

        !accessToken

    ) {

        alert(

            "Please login."

        );

        return;

    }

    const feedback =

        AppState.selectedFeedback;

    if (

        !feedback

    ) {

        alert(

            "No feedback selected."

        );

        return;

    }

    const title =

        document.getElementById(

            "feedbackTitle"

        ).value;

    const content =

        document.getElementById(

            "feedbackContent"

        ).value;

    try {

        const response =

            await fetch(

                `${API_URL}/${feedback.ownerId}/${feedback.feedbackId}`,

                {

                    method:

                        "PUT",

                    headers: {

                        Authorization:

                            `Bearer ${accessToken}`,

                        "Content-Type":

                            "application/json"

                    },

                    body:

                        JSON.stringify({

                            title,

                            content

                        })

                }

            );

        if (

            !response.ok

        ) {

            throw new Error(

                await response.text()

            );

        }

        const updated =

            await response.json();

        AppState.selectedFeedback =

            updated;

        await loadMyFeedback();

        closeFeedbackModal();

    }

    catch (

        error

    ) {

        console.error(

            error

        );

        alert(

            "Unable to update feedback."

        );

    }

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

    if (!feedbackElement) {

        return;

    }

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

        console.error(error);

        if (messageElement) {

            messageElement.innerHTML =

                "Unable to connect to server.";

        }

    }

}


/********************************************************************
                    FETCH APIs
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

                    headers: {

                        Authorization:

                            `Bearer ${accessToken}`

                    }

                }

            );

        if (!response.ok) {

            throw new Error(

                "Unable to fetch feedback"

            );

        }

        return await response.json();

    }

    catch (error) {

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

                    headers: {

                        Authorization:

                            `Bearer ${accessToken}`

                    }

                }

            );

        if (!response.ok) {

            throw new Error(

                "Unable to fetch feedback"

            );

        }

        return await response.json();

    }

    catch (error) {

        console.error(error);

        return [];

    }

}


/********************************************************************
                LOAD SINGLE FEEDBACK
********************************************************************/

async function loadSingleFeedback(

    mode

) {

    const accessToken =

        getAccessToken();

    if (!accessToken) {

        alert(
            "Please login."
        );

        return;

    }

    const feedback =

        AppState.selectedFeedback;

    if (!feedback) {

        alert(
            "Feedback not found."
        );

        return;

    }

    try {

        const response =

            await fetch(

                `${API_URL}/${feedback.ownerId}/${feedback.feedbackId}`,

                {

                    headers: {

                        Authorization:

                            `Bearer ${accessToken}`

                    }

                }

            );

        if (!response.ok) {

            throw new Error(

                await response.text()

            );

        }

        const item =

            await response.json();

        AppState.selectedFeedback =

            item;

        openFeedbackModal(

            item,

            mode

        );

    }

    catch (error) {

        console.error(error);

        alert(

            "Unable to retrieve feedback."

        );

    }

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