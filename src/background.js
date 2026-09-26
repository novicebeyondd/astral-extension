const astralApi = globalThis.browser ?? globalThis.chrome;

const isDiscord = (url = "") => url.startsWith("https://discord.com/") || url.startsWith("https://discordapp.com/");

const sendToActiveTab = async (message) => {
  const [tab] = await astralApi.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isDiscord(tab.url)) return;
  try {
    await astralApi.tabs.sendMessage(tab.id, message);
  } catch {
    return;
  }
};

astralApi.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-astral") await sendToActiveTab({ type: "ASTRAL_TOGGLE" });
  if (command === "toggle-astral-power") await sendToActiveTab({ type: "ASTRAL_POWER" });
});