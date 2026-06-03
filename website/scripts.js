const API_URL =
  "https://sa2mb6latf.execute-api.us-east-1.amazonaws.com/prod/feedback";

async function submitFeedback() {
  const name = document.getElementById("name").value.trim();
  const feedback = document.getElementById("feedback").value.trim();

  console.log("Submitting feedback:", { name, feedback });

  if (!name || !feedback) {
    document.getElementById("message").innerHTML = "Please fill all fields";

    return;
  }
  try {
    const response = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        name: name,
        feedback: feedback,
      }),
    });

    const result = await response.json();
    console.log("Feedback submission result:", result);

    if (response.ok) {
      document.getElementById("message").innerHTML = result.message;

      document.getElementById("name").value = "";
      document.getElementById("feedback").value = "";
    } else {
      document.getElementById("message").innerHTML = result.message;
    }
  } catch (error) {
    console.error("Error submitting feedback:", error);

    document.getElementById("message").innerHTML =
      "Unable to connect to server.";
  }
}

async function fetchFeedback() {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
    const result = await response.json();

    document.getElementById("message").textContent =
        result.message;

    return;
    }

    const feedbacks = await response.json();

    const feedbackJson = JSON.stringify(feedbacks, null, 4);

    const blob = new Blob([feedbackJson], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "feedbacks.json";

    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    document.getElementById("message").innerHTML =
      "Unable to connect to server.";
  }
}