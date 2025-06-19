function speakSteps(steps) {
  const text = steps.join(" ").replace(/[:\-•,]/g, "");
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  speechSynthesis.cancel();
  showToast("Speech stopped", "info");
}

function showToast(message, type = "info") {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: type,
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });
}

function findMatch(input, data) {
  const userText = input.toLowerCase();
  const words = userText.split(/\W+/).filter(Boolean);
  let bestMatch = null;
  let bestScore = 0;

  for (const condition in data) {
    const entry = data[condition];
    let score = 0;

    for (const keyword of entry.keywords.map(k => k.toLowerCase())) {
      if (userText.includes(keyword)) {
        score += 3; 
      } else {
        for (const word of words) {
          if (keyword.includes(word) || word === keyword || word.includes(keyword)) {
            score += 1; 
          }
        }
      }
    }

    const finalScore = score / entry.keywords.length;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMatch = { condition, steps: entry.steps };
    }
  }

  return bestScore >= 1.5 ? bestMatch : null;
}


async function handleQuery() {
  const input = document.getElementById("input").value.trim();
  const outputDiv = document.getElementById("output");
  const loader = document.getElementById("loader");

  if (!input) {
    showToast("Please describe the emergency first.", "warning");
    return;
  }

  loader.classList.remove("hidden");
  outputDiv.innerHTML = "";

  try {
    const response = await fetch("firstaid-data.json");
    const data = await response.json();
    const match = findMatch(input, data);

    if (match) {
      outputDiv.innerHTML = `
        <h3>QuickAid Tip: ${match.condition}</h3>
        <ul>${match.steps.map(s => `<li>${s}</li>`).join("")}</ul>`;
      speakSteps(match.steps);
      showToast(`Showing advice for: ${match.condition}`, "success");
    } else {
      outputDiv.innerHTML = `<p>No direct match found. Try rephrasing or checking spelling.</p>`;
      showToast("No match found in database.", "info");
    }
  } catch (err) {
    console.error(err);
    showToast("Error loading data.", "error");
  } finally {
    loader.classList.add("hidden");
  }
}

function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Speech recognition not supported.", "error");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";

  recognition.onresult = function (e) {
    const transcript = e.results[0][0].transcript;
    document.getElementById("input").value = transcript;
    handleQuery();
  };

  recognition.onerror = function () {
    showToast("Microphone issue or permission denied", "warning");
  };

  recognition.start();
}

function printResponse() {
  const content = document.getElementById("output").innerHTML;
  const win = window.open("", "", "width=800,height=600");
  win.document.write(`
    <html>
      <head><title>QuickAid – Response</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        ${content}
      </body>
    </html>
  `);
  win.document.close();
  win.print();
}
