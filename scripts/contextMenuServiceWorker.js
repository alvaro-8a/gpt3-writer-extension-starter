const getKey = () => {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(["openai-key"], (result) => {
			if (result["openai-key"]) {
				const decodeKey = atob(result["openai-key"]);
				resolve(decodeKey);
			}
		});
	});
};

const sendMessage = (content) => {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const activeTab = tabs[0].id;

		chrome.tabs.sendMessage(
			activeTab,
			{ message: "inject", content },
			(response) => {
				if (response.status === "failed") {
					console.log("Injection failed");
				}
			}
		);
	});
};

const generate = async (prompt) => {
	const key = await getKey();
	const url = "https://api.openai.com/v1/completions";

	// Call completions endpoint
	const completionResponse = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${key}`,
		},
		body: JSON.stringify({
			model: "text-davinci-003",
			prompt: prompt,
			max_tokens: 1000,
			temperature: 0.8,
		}),
	});

	// Select the top choice and send back
	const completion = await completionResponse.json();
	return completion.choices.pop();
};

const generateCompletionAction = async (info) => {
	try {
		// Send message with loading indicator
		sendMessage("Generating...");

		// Input ex.: Funky happy vibrant song with Bruno Mars style
		const { selectionText } = info;
		const basePromptPrefix = `
			Write me a detailed twitter thread for a music idea with the description below. Tell me how to develop this idea, key signature, chord progression, music structure and instruments to use.
			
			Idea:
		`;

		const baseCompletion = await generate(
			`${basePromptPrefix}${selectionText}\n`
		);

		// Let's see what we get!
		console.log(baseCompletion.text);

		// Send the output
		sendMessage(baseCompletion.text);
	} catch (error) {
		console.log(error);

		sendMessage(error.toString());
	}
};

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "context-run",
		title: "Generate music idea thread",
		contexts: ["selection"],
	});
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);
