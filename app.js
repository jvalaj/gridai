// State
let state = {
  cards: [],
  offsetX: 0,
  offsetY: 0,
  nextId: 1,
}

// DOM elements
const board = document.getElementById("board")
const cardsContainer = document.getElementById("cards-container")
const connectorsContainer = document.getElementById("connectors")
const globalInput = document.getElementById("global-input")
const sendBtn = document.getElementById("send-btn")
const resetBtn = document.getElementById("reset-btn")

// Initialize
init()

function init() {
  load()
  render()

  sendBtn.addEventListener("click", handleGlobalSend)
  globalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleGlobalSend()
  })

  resetBtn.addEventListener("click", handleReset)

  setupBoardPanning()
}

function handleGlobalSend() {
  const text = globalInput.value.trim()
  if (!text) return

  globalInput.value = ""

  // Create user card in viewport center
  const viewportCenterX = window.innerWidth / 2 - state.offsetX - 140
  const viewportCenterY = window.innerHeight / 2 - state.offsetY - 100

  const userId = addCard("user", text, null, viewportCenterX, viewportCenterY)

  // Create AI reply
  setTimeout(() => {
    const aiReply = fakeAIReply(text)
    addCard(aiReply.type, aiReply.payload, userId, viewportCenterX + 320, viewportCenterY)
  }, 100)
}

function handleReset() {
  if (confirm("Reset the board? This will clear all cards.")) {
    state.cards = []
    state.offsetX = 0
    state.offsetY = 0
    save()
    render()
  }
}

function addCard(type, payload, parentId, x, y) {
  const id = state.nextId++
  const card = { id, type, payload, parentId, x, y }
  state.cards.push(card)
  save()
  render()
  return id
}

function fakeAIReply(prompt) {
  const hash = prompt.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const choice = hash % 3

  if (choice === 0) {
    // Text reply
    return {
      type: "ai-text",
      payload: `You asked: "${prompt}". Here's a brief idea: This is a simulated AI response that provides helpful information about your query.`,
    }
  } else if (choice === 1) {
    // Image reply with text
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">
      <rect width="200" height="120" fill="#e8f4f8"/>
      <circle cx="100" cy="60" r="30" fill="#0070f3" opacity="0.3"/>
      <text x="100" y="65" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#333">AI Generated Image</text>
    </svg>`
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgData)}`
    return {
      type: "ai-image",
      text: "I've generated a visual representation to help illustrate the concept. This visual combines key elements to provide a clearer understanding of your inquiry.",
      payload: dataUrl,
    }
  } else {
    // Chart reply with text
    const values = prompt
      .split("")
      .slice(0, 6)
      .map((c, i) => (c.charCodeAt(0) % 50) + 20)
    return {
      type: "ai-chart",
      text: "Here's a data visualization showing relevant metrics. The chart breaks down the information to help you see patterns and trends at a glance.",
      payload: values,
    }
  }
}

function render() {
  // Clear
  cardsContainer.innerHTML = ""
  connectorsContainer.innerHTML = ""

  // Apply board offset
  cardsContainer.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px)`
  connectorsContainer.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px)`

  // Render cards
  state.cards.forEach((card) => {
    const cardEl = createCardElement(card)
    cardsContainer.appendChild(cardEl)
  })

  // Render connectors
  updateLines()
}

function createCardElement(card) {
  const div = document.createElement("div")
  div.className = "card"
  div.style.left = card.x + "px"
  div.style.top = card.y + "px"
  div.dataset.id = card.id

  // Header
  const header = document.createElement("div")
  header.className = "card-header"

  const typeLabel = document.createElement("span")
  typeLabel.className = `card-type ${card.type.startsWith("ai") ? "ai" : "user"}`
  typeLabel.textContent =
    card.type === "user"
      ? "User"
      : card.type === "ai-text"
        ? "AI: text"
        : card.type === "ai-image"
          ? "AI: image"
          : "AI: chart"

  const followUpBtn = document.createElement("button")
  followUpBtn.className = "follow-up-btn"
  followUpBtn.textContent = "…"
  followUpBtn.setAttribute("aria-label", "Ask follow-up")
  followUpBtn.onclick = (e) => {
    e.stopPropagation()
    toggleFollowUp(card.id)
  }

  header.appendChild(typeLabel)
  header.appendChild(followUpBtn)

  // Body
  const body = document.createElement("div")
  body.className = "card-body"

  if (card.type === "user" || card.type === "ai-text") {
    body.textContent = card.payload
  } else if (card.type === "ai-image") {
    if (card.text) {
      const textDiv = document.createElement("p")
      textDiv.style.marginBottom = "12px"
      textDiv.textContent = card.text
      body.appendChild(textDiv)
    }
    const img = document.createElement("img")
    img.src = card.payload
    img.alt = "AI generated image"
    body.appendChild(img)
  } else if (card.type === "ai-chart") {
    if (card.text) {
      const textDiv = document.createElement("p")
      textDiv.style.marginBottom = "12px"
      textDiv.textContent = card.text
      body.appendChild(textDiv)
    }
    const canvas = document.createElement("canvas")
    canvas.width = 240
    canvas.height = 120
    body.appendChild(canvas)
    setTimeout(() => drawChart(canvas, card.payload), 0)
  }

  // Follow-up input
  const followUpDiv = document.createElement("div")
  followUpDiv.className = "follow-up-input"
  followUpDiv.id = `follow-up-${card.id}`

  const followUpInput = document.createElement("input")
  followUpInput.type = "text"
  followUpInput.placeholder = "Follow-up question…"
  followUpInput.setAttribute("aria-label", "Follow-up question")
  followUpInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      handleFollowUp(card.id, followUpInput.value)
    } else if (e.key === "Escape") {
      toggleFollowUp(card.id)
    }
  }

  const followUpSendBtn = document.createElement("button")
  followUpSendBtn.textContent = "Send"
  followUpSendBtn.onclick = () => handleFollowUp(card.id, followUpInput.value)

  followUpDiv.appendChild(followUpInput)
  followUpDiv.appendChild(followUpSendBtn)

  div.appendChild(header)
  div.appendChild(body)
  div.appendChild(followUpDiv)

  // Make draggable
  makeDraggable(div, header, card)

  return div
}

function drawChart(canvas, values) {
  const ctx = canvas.getContext("2d")
  const width = canvas.width
  const height = canvas.height
  const barWidth = width / values.length
  const maxValue = Math.max(...values)

  ctx.clearRect(0, 0, width, height)

  values.forEach((value, i) => {
    const barHeight = (value / maxValue) * (height - 20)
    const x = i * barWidth + 5
    const y = height - barHeight - 10

    ctx.fillStyle = "#0070f3"
    ctx.fillRect(x, y, barWidth - 10, barHeight)
  })
}

function toggleFollowUp(cardId) {
  const followUpDiv = document.getElementById(`follow-up-${cardId}`)
  if (followUpDiv) {
    followUpDiv.classList.toggle("active")
    if (followUpDiv.classList.contains("active")) {
      followUpDiv.querySelector("input").focus()
    }
  }
}

function handleFollowUp(parentId, text) {
  if (!text.trim()) return

  const parent = state.cards.find((c) => c.id === parentId)
  if (!parent) return

  toggleFollowUp(parentId)

  // Place child near parent with offset
  const childX = parent.x + 220
  const childY = parent.y + 30

  const userId = addCard("user", text.trim(), parentId, childX, childY)

  setTimeout(() => {
    const aiReply = fakeAIReply(text)
    addCard(aiReply.type, aiReply.payload, userId, childX + 320, childY)
  }, 100)
}

function makeDraggable(cardEl, handleEl, card) {
  let isDragging = false
  let startX, startY

  const onStart = (e) => {
    isDragging = true
    cardEl.classList.add("dragging")

    const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX
    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY

    startX = clientX - card.x
    startY = clientY - card.y

    e.preventDefault()
  }

  const onMove = (e) => {
    if (!isDragging) return

    const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX
    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY

    card.x = clientX - startX
    card.y = clientY - startY

    cardEl.style.left = card.x + "px"
    cardEl.style.top = card.y + "px"

    updateLines()
  }

  const onEnd = () => {
    if (isDragging) {
      isDragging = false
      cardEl.classList.remove("dragging")
      save()
    }
  }

  handleEl.addEventListener("mousedown", onStart)
  handleEl.addEventListener("touchstart", onStart)
  document.addEventListener("mousemove", onMove)
  document.addEventListener("touchmove", onMove)
  document.addEventListener("mouseup", onEnd)
  document.addEventListener("touchend", onEnd)
}

function setupBoardPanning() {
  let isPanning = false
  let startX, startY
  let startOffsetX, startOffsetY

  board.addEventListener("mousedown", (e) => {
    if (e.target === board || e.target === cardsContainer || e.target === connectorsContainer) {
      isPanning = true
      board.classList.add("panning")
      startX = e.clientX
      startY = e.clientY
      startOffsetX = state.offsetX
      startOffsetY = state.offsetY
    }
  })

  document.addEventListener("mousemove", (e) => {
    if (!isPanning) return

    state.offsetX = startOffsetX + (e.clientX - startX)
    state.offsetY = startOffsetY + (e.clientY - startY)

    cardsContainer.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px)`
    connectorsContainer.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px)`

    updateLines()
  })

  document.addEventListener("mouseup", () => {
    if (isPanning) {
      isPanning = false
      board.classList.remove("panning")
      save()
    }
  })
}

function updateLines() {
  connectorsContainer.innerHTML = ""

  state.cards.forEach((card) => {
    if (card.parentId !== null) {
      const parent = state.cards.find((c) => c.id === card.parentId)
      if (parent) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
        line.classList.add("connector-line")
        line.setAttribute("x1", parent.x + 140)
        line.setAttribute("y1", parent.y + 50)
        line.setAttribute("x2", card.x + 140)
        line.setAttribute("y2", card.y + 50)
        connectorsContainer.appendChild(line)
      }
    }
  })
}

function save() {
  localStorage.setItem("chatboard-state", JSON.stringify(state))
}

function load() {
  const saved = localStorage.getItem("chatboard-state")
  if (saved) {
    const loaded = JSON.parse(saved)
    state = { ...state, ...loaded }
  }
}
