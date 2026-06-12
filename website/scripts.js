/********************************************************************
                        CONFIGURATION
********************************************************************/

const API_URL =
    window.APP_CONFIG.API_URL;

const COGNITO_DOMAIN =
    window.APP_CONFIG.COGNITO_DOMAIN;

const CLIENT_ID =
    window.APP_CONFIG.CLIENT_ID;

const REDIRECT_URI =
    window.APP_CONFIG.REDIRECT_URI;


/********************************************************************
                        APPLICATION STATE
********************************************************************/

const AppState = {

    currentPage: "home",

    currentUser: null,

    currentRole: "guest",

    feedbacks: [],

    selectedFeedback: null,

    modalMode: "view",

    newAttachments: [],

    deletedAttachments: []

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

    const fileInput =

        document.getElementById(

            "feedback-files"

        );

    if (!fileInput) {

        return;

    }

    fileInput.addEventListener(

        "change",

        renderSelectedAttachments

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

function renderSelectedAttachments() {

    const container =

        document.getElementById(

            "selected-attachments"

        );

    const input =

        document.getElementById(

            "feedback-files"

        );

    if (

        !container ||

        !input

    ) {

        return;

    }

    const files =

        Array.from(

            input.files

        );

    if (

        files.length === 0

    ) {

        container.innerHTML =

            "No attachments selected";

        return;

    }

    container.innerHTML =

        files

            .map(

                file =>

                `<div class="attachment-chip">

                    📎 ${file.name}

                </div>`

            )

            .join("");

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

    if (!accessToken) {

        alert(
            "Please login."
        );

        return;

    }

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

        const result =

            await response.json();

        /*
        =========================
            DOWNLOAD TXT FILE
        =========================
        */

        downloadTextFile(

            result.filename,

            result.content

        );

        /*
        =========================
        DOWNLOAD ATTACHMENTS
        =========================
        */

        await downloadAttachments(

            result.attachments

        );

    }

    catch (error) {

        console.error(

            error

        );

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

    AppState.newAttachments = [];

    AppState.deletedAttachments = [];

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

    const container =

        document.getElementById(

            "feedbackAttachments"

        );

    container.innerHTML = "";

    const existing =

        feedback.attachments || [];

    existing.forEach(

        attachment => {

            if (

                AppState.deletedAttachments.some(

                    file =>

                        file.filename ===

                        attachment.filename

                )

            ) {

                return;

            }

            let html =

                `<div class="modal-attachment">

                    📎 ${attachment.filename}
                
                </div>`;

            if (

                AppState.modalMode ===

                "edit"

            ) {

                html +=

                `

                <button

                    onclick="removeExistingAttachment(

                        '${attachment.filename}'

                    )">

                    ✕
                </button>

                `;

            }

            html +=

                `</div>`;

            container.innerHTML +=

                html;

        }

    );

    AppState.newAttachments.forEach(

        file => {

            container.innerHTML +=

            `

            <div class="modal-attachment">

                🆕

                ${file.name}

                <button

                    onclick="removeNewAttachment(

                        '${file.name}'

                    )">

                    ✕

                </button>

            </div>

            `;

        }

    );

    if (

        container.innerHTML ===

        ""

    ) {

        container.innerHTML =

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

        document.getElementById(

            "modalUploadSection"

        ).style.display =

            "flex";

        initializeModalAttachments();            

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

        document.getElementById(

            "modalUploadSection"

        ).style.display =

            "none";

        AppState.newAttachments = [];

        AppState.deletedAttachments = [];            

    }

}


function switchToEditMode() {

    AppState.newAttachments = [];

    AppState.deletedAttachments = [];

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

function initializeModalAttachments() {

    const input =

        document.getElementById(

            "modalAttachmentInput"

        );

    if (!input) {

        return;

    }

    input.onchange = function () {

        const files =

            Array.from(

                input.files

            );

        AppState.newAttachments.push(

            ...files

        );

        populateFeedbackModal(

            AppState.selectedFeedback

        );

    };

}

function removeExistingAttachment(

    filename

) {

    const attachment =

        AppState.selectedFeedback

            .attachments

            .find(

                file =>

                    file.filename ===

                    filename

            );

    if (

        attachment

    ) {

        AppState.deletedAttachments.push(

            attachment

        );

    }

    populateFeedbackModal(

        AppState.selectedFeedback

    );

}

function removeNewAttachment(

    filename

) {

    AppState.newAttachments =

        AppState.newAttachments.filter(

            file =>

                file.name !==

                filename

        );

    populateFeedbackModal(

        AppState.selectedFeedback

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
            "No feedback selected."
        );

        return;

    }

    const title =
        document.getElementById(
            "feedbackTitle"
        ).value.trim();

    const content =
        document.getElementById(
            "feedbackContent"
        ).value.trim();

    const newAttachments =
        AppState.newAttachments.map(

            file => ({

                filename:
                    file.name,

                contentType:
                    file.type

            })

        );

    const deletedAttachments =
        AppState.deletedAttachments;

    try {

        /*
        =====================
                INIT
        =====================
        */

        const initResponse =

            await fetch(

                `${API_URL}/${feedback.ownerId}/${feedback.feedbackId}/init`,

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

                            content,

                            newAttachments,

                            deletedAttachments

                        })

                }

            );

        if (!initResponse.ok) {

            throw new Error(

                await initResponse.text()

            );

        }

        const initResult =

            await initResponse.json();

        /*
        =====================
            UPLOAD FILES
        =====================
        */

        await uploadFiles(

            initResult.uploads,

            AppState.newAttachments

        );

        /*
        =====================
                COMPLETE
        =====================
        */

        const completeResponse =

            await fetch(

                `${API_URL}/${feedback.ownerId}/${feedback.feedbackId}/complete`,

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

                            content,

                            newAttachments,

                            deletedAttachments

                        })

                }

            );

        if (!completeResponse.ok) {

            throw new Error(

                await completeResponse.text()

            );

        }

        AppState.newAttachments = [];

        AppState.deletedAttachments = [];

        closeFeedbackModal();

        await loadMyFeedback();

        AppState.selectedFeedback = null;

        alert(
            "Feedback updated successfully."
        );

    }

    catch (error) {

        console.error(error);

        alert(
            "Unable to update feedback."
        );

    }

}

async function uploadFiles(

    uploads,

    files

) {

    for (const upload of uploads) {

        const file =

            files.find(

                f =>

                    f.name ===

                    upload.filename

            );

        if (!file) {

            throw new Error(

                `Missing file ${upload.filename}`

            );

        }

        const response =

            await fetch(

                upload.uploadUrl,

                {

                    method:

                        "PUT",

                    headers: {

                        "Content-Type":

                            upload.contentType

                    },

                    body:

                        file

                }

            );

        if (!response.ok) {

            throw new Error(

                `Failed to upload ${upload.filename}`

            );

        }

    }

}

function downloadTextFile(

    filename,

    content

) {

    const blob =

        new Blob(

            [

                content

            ],

            {

                type:

                    "text/plain"

            }

        );

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

        filename;

    document.body.appendChild(

        link

    );

    link.click();

    link.remove();

    window.URL.revokeObjectURL(

        url

    );

}

async function downloadAttachments(
    attachments
) {

    for (const attachment of attachments) {

        const response = await fetch(
            attachment.downloadUrl
        );

        if (!response.ok) {

            console.error(
                "Failed to download",
                attachment.filename
            );

            continue;
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

        link.href = url;

        link.download =
            attachment.filename;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        window.URL.revokeObjectURL(
            url
        );

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    200
                )
        );

    }

}

/********************************************************************
                    BACKEND API
********************************************************************/

async function submitFeedback() {

    const titleElement =
        document.getElementById(
            "feedback-title"
        );

    const contentElement =
        document.getElementById(
            "feedback"
        );

    const fileInput =
        document.getElementById(
            "feedback-files"
        );

    const anonymousElement =
        document.getElementById(
            "anonymous"
        );

    const messageElement =
        document.getElementById(
            "message"
        );

    const title =
        titleElement.value.trim();

    const content =
        contentElement.value.trim();

    if (!title || !content) {

        messageElement.innerHTML =
            "Please enter a title and feedback.";

        return;

    }

    const files =
        Array.from(
            fileInput.files
        );

    const attachments =
        files.map(

            file => ({

                filename:
                    file.name,

                contentType:
                    file.type

            })

        );

    const anonymous =
        anonymousElement.checked;

    const initEndpoint =
        anonymous
        ?
        `${API_URL}/anonymous/init`
        :
        `${API_URL}/init`;

    const completeEndpoint =
        anonymous
        ?
        `${API_URL}/anonymous/complete`
        :
        `${API_URL}/complete`;

    const headers = {

        "Content-Type":
            "application/json"

    };

    if (!anonymous) {

        const accessToken =
            getAccessToken();

        if (!accessToken) {

            messageElement.innerHTML =
                "Please login or submit anonymously.";

            return;

        }

        headers.Authorization =
            `Bearer ${accessToken}`;

    }

    try {

        /*
        ============================
                INIT
        ============================
        */

        const initResponse =

            await fetch(

                initEndpoint,

                {

                    method:
                        "POST",

                    headers,

                    body:

                        JSON.stringify({

                            attachments

                        })

                }

            );

        if (!initResponse.ok) {

            throw new Error(

                await initResponse.text()

            );

        }

        const initResult =

            await initResponse.json();

        /*
        ============================
            UPLOAD TO S3
        ============================
        */

        await uploadFiles(

            initResult.uploads,

            files

        );

        /*
        ============================
                COMPLETE
        ============================
        */

        const completeBody = {

            feedbackId:
                initResult.feedbackId,

            title,

            content,

            attachments

        };

        if (anonymous) {

            completeBody.ownerId =
                initResult.ownerId;

        }

        const completeResponse =

            await fetch(

                completeEndpoint,

                {

                    method:
                        "POST",

                    headers,

                    body:

                        JSON.stringify(

                            completeBody

                        )

                }

            );

        if (!completeResponse.ok) {

            throw new Error(

                await completeResponse.text()

            );

        }

        messageElement.innerHTML =

            "Feedback submitted successfully.";

        titleElement.value = "";

        contentElement.value = "";

        fileInput.value = "";

        document.getElementById(

            "selected-attachments"

        ).innerHTML =

            "No attachments selected";

        AppState.newAttachments = [];

        AppState.deletedAttachments = [];

    }

    catch (error) {

        console.error(error);

        messageElement.innerHTML =

            "Unable to submit feedback.";

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

window.addEventListener(

    "load",

    async () => {

        await initializeApplication();

    }

);