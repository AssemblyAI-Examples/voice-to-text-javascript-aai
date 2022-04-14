const button = document.querySelector("button")
button.addEventListener("click", startRecording)
const newDiv = document.createElement("div")

// Initiate MicRecorder
const recorder = new MicRecorder({
  bitRate: 128,
})

// Set AssemblyAI header
const assembly = axios.create({
  baseURL: "https://api.assemblyai.com/v2",
  headers: {
    authorization: "YOUR-API-KEY",
    "content-type": "application/json",
  },
})

function startRecording() {
  recorder
    .start()
    .then(() => {
      document.querySelector("#transcript").innerHTML = ""
      button.textContent = "Stop recording"
      button.classList.toggle("btn-danger")
      button.removeEventListener("click", startRecording)
      button.addEventListener("click", stopRecording)
      document.querySelector("#display").innerHTML = ""
    })
    .catch((e) => {
      console.error(e)
    })
}

function stopRecording() {
  // Start audio recording and save file as music.mp3
  recorder
    .stop()
    .getMp3()
    .then(([buffer, blob]) => {
      const audioFile = new File(buffer, "music.mp3", {
        type: blob.type,
        lastModified: Date.now(),
      })
      const player = new Audio(URL.createObjectURL(audioFile))
      player.controls = true

      sendAudioFile(audioFile) // Call sendAudioFile function to send file to AssemblyAI for transcription

      document.querySelector("#display").appendChild(player)
      button.textContent = "Start recording"
      button.classList.toggle("btn-danger")
      button.removeEventListener("click", stopRecording)
      button.addEventListener("click", startRecording)
    })
    .catch((e) => {
      console.error(e)
    })
}

const sendAudioFile = async (file) => {
  // Upload file to AssemblyAI and retreive upload URL
  await assembly
    .post("/upload", file)
    .then((res) => {
      document.querySelector("#transcript").innerHTML = "Processing..."
      return res
    })
    // Send upload URL to AssemblyAI to get transcript ID
    .then((res) => {
      return assembly.post("/transcript", {
        audio_url: res.data.upload_url,
      })
    })
    // Check transcript completion with interval
    .then((res) => {
      checkTranscriptCompletion(res.data.id)
    })
    .catch(() => console.log("Request failed!"))
}

// Function to check transcript completion with interval
const checkTranscriptCompletion = (id) => {
  const interval = setInterval(() => {
    assembly.get(`/transcript/${id}`).then((res) => {
      if (res.data.status === "completed") {
        document.querySelector("#transcript").innerHTML = res.data.text
        clearInterval(interval)
      }
      if (res.data.status === "error") {
        document.querySelector("#transcript").innerHTML =
          "There was an error :("
        clearInterval(interval)
      }
    })
  }, 3000) // Check every 3 seconds
  return () => clearInterval(interval)
}
