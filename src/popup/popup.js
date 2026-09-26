const astralApi = globalThis.browser ?? globalThis.chrome;

const isDiscord = (url = "") => url.startsWith("https://discord.com/") || url.startsWith("https://discordapp.com/");

const sendToActiveTab = async (message) => {
  const [tab] = await astralApi.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isDiscord(tab.url)) return false;
  try {
    await astralApi.tabs.sendMessage(tab.id, message);
    return true;
  } catch {
    return false;
  }
};

const status = document.getElementById("status");
const dot = document.querySelector(".popup__status-dot");
const openButton = document.getElementById("open");
const powerButton = document.getElementById("power");

const updateStatus = async () => {
  const [tab] = await astralApi.tabs.query({ active: true, currentWindow: true });
  if (isDiscord(tab?.url)) {
    status.textContent = "Discord Web detected";
    return;
  }
  status.textContent = "Open Discord Web to continue";
  dot.style.background = "#707078";
  dot.style.boxShadow = "none";
};

openButton.addEventListener("click", async () => {
  const delivered = await sendToActiveTab({ type: "ASTRAL_OPEN" });
  if (!delivered) {
    await astralApi.tabs.create({ url: "https://discord.com/channels/@me" });
  }
  window.close();
});

powerButton.addEventListener("click", async () => {
  const delivered = await sendToActiveTab({ type: "ASTRAL_POWER" });
  if (delivered) {
    powerButton.textContent = "PROCESSING TOGGLED";
    setTimeout(() => window.close(), 380);
  } else {
    status.textContent = "Open Discord Web to use Astral";
  }
});

updateStatus();