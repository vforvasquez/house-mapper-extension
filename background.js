chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "exportAddresses") {
		chrome.storage.local.get(["addresses"], (result) => {
			sendResponse({ addresses: result.addresses || {} })
		})
		return true // Keep message channel open for async storage
	} else if (request.action === "deleteAddress") {
		chrome.storage.local.get(["addresses"], (result) => {
			try {
				const { zpid } = request
				const addresses = result.addresses || {}
				delete addresses[zpid]
				chrome.storage.local.set({ addresses }, () => {
					console.log(`Data saved addresses:`, addresses)
					sendResponse({ success: true })
				})
			} catch (err) {
				sendResponse({
					success: false,
					error: `Error: ${err}`
				})
			}
		})
		return true // Keep message channel open for async storage
	}
})
